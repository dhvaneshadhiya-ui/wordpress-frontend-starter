import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://wp.dev.igeeksblog.com'
const WP_API_URL = 'https://dev.igeeksblog.com/wp-json/wp/v2'
const API_TIMEOUT = 10000 // 10 seconds
const ENABLE_INDEXING = process.env.VITE_ENABLE_INDEXING === 'true'

// Category slugs that trigger NewsArticle schema for Google News eligibility
const NEWS_CATEGORY_SLUGS = ['news', 'breaking-news', 'breaking', 'updates', 'announcements', 'latest']

// Import author social links from shared JSON (single source of truth)
import authorSocialLinks from './src/data/author-social-links.json' assert { type: 'json' }

// Get sameAs array for an author by slug
function getAuthorSameAs(authorSlug) {
  return authorSocialLinks[authorSlug]?.sameAs || []
}

// Get Twitter handle for an author by slug
function getAuthorTwitter(authorSlug) {
  return authorSocialLinks[authorSlug]?.twitter || null
}

// Check if post belongs to a news category
function isNewsArticle(post) {
  try {
    const categories = post._embedded?.['wp:term']?.[0] || []
    return categories.some(cat => 
      NEWS_CATEGORY_SLUGS.includes(cat.slug?.toLowerCase())
    )
  } catch {
    return false
  }
}

// Static routes that don't need API data
const STATIC_ROUTES = ['/', '/preview', '/llm.html']

// Fetch with timeout
async function fetchWithTimeout(url, timeout = API_TIMEOUT) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`)
    }
    throw error
  }
}

// Fetch all items with pagination
async function fetchAllPaginated(endpoint, perPage = 100) {
  const items = []
  let page = 1
  let hasMore = true
  
  while (hasMore) {
    try {
      const url = `${WP_API_URL}/${endpoint}?per_page=${perPage}&page=${page}`
      const data = await fetchWithTimeout(url)
      items.push(...data)
      hasMore = data.length === perPage
      page++
    } catch (error) {
      console.warn(`[SSG] Failed to fetch ${endpoint} page ${page}: ${error.message}`)
      hasMore = false
    }
  }
  
  return items
}

// Fetch all dynamic routes from WordPress
async function fetchAllRoutes() {
  console.log('[SSG] Fetching routes from WordPress API...')
  
  const routes = [...STATIC_ROUTES]
  const routeData = new Map()
  
  try {
    // Fetch posts, categories, tags, authors in parallel
    const [posts, categories, tags, authors] = await Promise.all([
      fetchAllPaginated('posts?_embed=true'),
      fetchAllPaginated('categories'),
      fetchAllPaginated('tags'),
      fetchAllPaginated('users'),
    ])
    
    console.log(`[SSG] Found ${posts.length} posts, ${categories.length} categories, ${tags.length} tags, ${authors.length} authors`)
    
    // Add post routes
    for (const post of posts) {
      const route = `/${post.slug}`
      routes.push(route)
      routeData.set(route, { type: 'post', data: post })
    }
    
    // Add category routes
    for (const category of categories) {
      if (category.count > 0) {
        const route = `/category/${category.slug}`
        routes.push(route)
        routeData.set(route, { type: 'category', data: category })
      }
    }
    
    // Add tag routes
    for (const tag of tags) {
      if (tag.count > 0) {
        const route = `/tag/${tag.slug}`
        routes.push(route)
        routeData.set(route, { type: 'tag', data: tag })
      }
    }
    
    // Add author routes
    for (const author of authors) {
      const route = `/author/${author.slug}`
      routes.push(route)
      routeData.set(route, { type: 'author', data: author })
    }
    
  } catch (error) {
    console.warn(`[SSG] API unreachable, using static routes only: ${error.message}`)
  }
  
  return { routes, routeData }
}

// Strip HTML tags
function stripHtml(html) {
  return html?.replace(/<[^>]*>/g, '').trim() || ''
}

// Escape HTML for safe attribute values
function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Get featured image URL from embedded post data
function getFeaturedImage(post) {
  try {
    const media = post._embedded?.['wp:featuredmedia']?.[0]
    return media?.source_url || media?.media_details?.sizes?.large?.source_url || ''
  } catch {
    return ''
  }
}

// Get author name from embedded post data
function getAuthorName(post) {
  try {
    return post._embedded?.author?.[0]?.name || 'iGeeksBlog'
  } catch {
    return 'iGeeksBlog'
  }
}

// Get categories from embedded post data
function getCategories(post) {
  try {
    return post._embedded?.['wp:term']?.[0]?.map(c => c.name) || []
  } catch {
    return []
  }
}

// Format date for schema
function formatDate(dateString) {
  return new Date(dateString).toISOString()
}

// Generate SEO head tags for a route
function generateSEOHead(route, routeInfo) {
  const robotsContent = ENABLE_INDEXING ? 'index, follow' : 'noindex, nofollow'
  
  // Default/homepage SEO
  if (route === '/' || !routeInfo) {
    return `
    <meta name="robots" content="${robotsContent}" />
    <link rel="canonical" href="${SITE_URL}/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${SITE_URL}/" />
    <meta property="og:site_name" content="iGeeksBlog" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "iGeeksBlog",
      "url": SITE_URL,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${SITE_URL}/?s={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    })}
    </script>`.trim()
  }
  
  const { type, data } = routeInfo
  
  if (type === 'post') {
    const title = escapeHtml(stripHtml(data.title?.rendered || data.slug))
    const description = escapeHtml(stripHtml(data.excerpt?.rendered || '').slice(0, 160))
    const featuredImage = getFeaturedImage(data)
    const author = getAuthorName(data)
    const categories = getCategories(data)
    const canonicalUrl = `${SITE_URL}/${data.slug}`
    const publishDate = formatDate(data.date)
    const modifiedDate = formatDate(data.modified)
    
    // Generate dynamic OG image URL
    const ogImageParams = new URLSearchParams()
    ogImageParams.set('title', stripHtml(data.title?.rendered || ''))
    if (featuredImage) ogImageParams.set('image', featuredImage)
    if (author) ogImageParams.set('author', author)
    if (categories[0]) ogImageParams.set('category', categories[0])
    const ogImageUrl = `${SITE_URL}/og?${ogImageParams.toString()}`
    
    const isNews = isNewsArticle(data)
    const authorSlug = data._embedded?.author?.[0]?.slug
    const authorSameAs = authorSlug ? getAuthorSameAs(authorSlug) : []
    
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": isNews ? "NewsArticle" : "BlogPosting",
      "headline": stripHtml(data.title?.rendered || ''),
      "description": stripHtml(data.excerpt?.rendered || ''),
      "image": featuredImage ? {
        "@type": "ImageObject",
        "url": featuredImage,
        "width": 1200,
        "height": 675
      } : undefined,
      "author": {
        "@type": "Person",
        "name": author,
        "url": `${SITE_URL}/author/${authorSlug || 'igeeksblog'}`,
        ...(authorSameAs.length > 0 && { "sameAs": authorSameAs })
      },
      "publisher": {
        "@type": "Organization",
        "name": "iGeeksBlog",
        "logo": {
          "@type": "ImageObject",
          "url": `${SITE_URL}/og-default.png`
        }
      },
      "datePublished": publishDate,
      "dateModified": modifiedDate,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
      },
      "keywords": categories.join(', '),
      // NewsArticle-specific: dateline for news content
      ...(isNews && {
        "dateline": "San Francisco, CA"
      }),
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": ["h1", ".post-content p:first-of-type"]
      }
    }
    
    return `
    <title>${title} - iGeeksBlog</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${robotsContent}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="iGeeksBlog" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="article:published_time" content="${publishDate}" />
    <meta property="article:modified_time" content="${modifiedDate}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
    <script type="application/ld+json">
    ${JSON.stringify(articleSchema)}
    </script>`.trim()
  }
  
  if (type === 'category') {
    const title = escapeHtml(data.name)
    const description = escapeHtml(stripHtml(data.description || `Browse ${data.name} articles`).slice(0, 160))
    const canonicalUrl = `${SITE_URL}/category/${data.slug}`
    
    // CollectionPage schema for categories
    const collectionPageSchema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": data.name,
      "description": description,
      "url": canonicalUrl,
      "isPartOf": {
        "@type": "WebSite",
        "name": "iGeeksBlog",
        "url": SITE_URL
      }
    }
    
    return `
    <title>${title} Archives - iGeeksBlog</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${robotsContent}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title} Archives" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="iGeeksBlog" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title} Archives" />
    <meta name="twitter:description" content="${description}" />
    <script type="application/ld+json">
    ${JSON.stringify(collectionPageSchema)}
    </script>`.trim()
  }
  
  if (type === 'tag') {
    const title = escapeHtml(data.name)
    const description = escapeHtml(stripHtml(data.description || `Browse articles tagged ${data.name}`).slice(0, 160))
    const canonicalUrl = `${SITE_URL}/tag/${data.slug}`
    
    // CollectionPage schema for tags
    const collectionPageSchema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": data.name,
      "description": description,
      "url": canonicalUrl,
      "isPartOf": {
        "@type": "WebSite",
        "name": "iGeeksBlog",
        "url": SITE_URL
      }
    }
    
    return `
    <title>${title} - iGeeksBlog</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${robotsContent}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="iGeeksBlog" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <script type="application/ld+json">
    ${JSON.stringify(collectionPageSchema)}
    </script>`.trim()
  }
  
  if (type === 'author') {
    const title = escapeHtml(data.name)
    const description = escapeHtml(stripHtml(data.description || `Articles by ${data.name}`).slice(0, 160))
    const canonicalUrl = `${SITE_URL}/author/${data.slug}`
    const avatar = data.avatar_urls?.['96'] || ''
    
    // ProfilePage schema for author archives (enhanced from Person)
    const sameAs = getAuthorSameAs(data.slug)
    
    const profilePageSchema = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "mainEntity": {
        "@type": "Person",
        "@id": `${canonicalUrl}#person`,
        "name": data.name,
        "url": canonicalUrl,
        "image": avatar || undefined,
        "description": data.description || undefined,
        ...(sameAs.length > 0 && { "sameAs": sameAs })
      },
      "name": `${data.name} - Author Profile`,
      "description": description,
      "url": canonicalUrl
    }
    
    return `
    <title>${title} - iGeeksBlog</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${robotsContent}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="iGeeksBlog" />
    ${avatar ? `<meta property="og:image" content="${avatar}" />` : ''}
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <script type="application/ld+json">
    ${JSON.stringify(profilePageSchema)}
    </script>`.trim()
  }
  
  return ''
}

// Ensure directory exists
function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Generate sitemap
function generateSitemap(routes, routeData) {
  const now = new Date().toISOString()
  
  const urlEntries = routes
    .filter(route => route !== '/preview')
    .map(route => {
      const info = routeData.get(route)
      let priority = '0.5'
      let lastmod = now
      
      if (route === '/') {
        priority = '1.0'
      } else if (route === '/llm.html') {
        priority = '0.7'
      } else if (info?.type === 'post') {
        priority = '0.8'
        lastmod = info.data.modified ? formatDate(info.data.modified) : now
      } else if (info?.type === 'category') {
        priority = '0.6'
      }
      
      const loc = route === '/' ? SITE_URL : `${SITE_URL}${route}`
      
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
  </url>`
    })
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`
}

// Main prerender function
;(async () => {
  const buildStart = Date.now()
  console.log('[SSG] Starting pre-render build...')
  
  // Read template
  const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
  
  // Load server entry
  const serverAssetsDir = toAbsolute('dist/server/assets')
  const files = fs.readdirSync(serverAssetsDir)
  const entryFile = files.find(f => f.startsWith('entry-server') && f.endsWith('.js'))
  if (!entryFile) {
    throw new Error('Could not find entry-server.js in dist/server/assets')
  }
  const { render } = await import(`./dist/server/assets/${entryFile}`)
  
  // Fetch all routes
  const { routes, routeData } = await fetchAllRoutes()
  console.log(`[SSG] Pre-rendering ${routes.length} routes...`)
  
  let successCount = 0
  let errorCount = 0
  
  // Render all routes
  for (const routeUrl of routes) {
    try {
      // Get app shell HTML
      const appHtml = render(routeUrl)
      
      // Get SEO head for this route
      const seoHead = generateSEOHead(routeUrl, routeData.get(routeUrl))
      
      // Inject into template
      let html = template
        .replace('<!--seo-head-->', seoHead)
        .replace('<!--app-html-->', appHtml)
      
      // Remove default meta tags that we're overriding (for non-homepage routes)
      if (routeData.has(routeUrl)) {
        html = html
          .replace(/<title>iGeeksBlog - Apple News.*?<\/title>/, '')
          .replace(/<meta name="description" content="Your daily source.*?" \/>/, '')
          .replace(/<meta name="robots" content="noindex, nofollow" \/>/, '')
      }
      
      // Determine file path
      const filePath = routeUrl === '/' 
        ? 'dist/index.html' 
        : `dist${routeUrl}.html`
      
      ensureDir(toAbsolute(filePath))
      fs.writeFileSync(toAbsolute(filePath), html)
      successCount++
      
      // Log progress every 50 routes
      if (successCount % 50 === 0) {
        console.log(`[SSG] Progress: ${successCount}/${routes.length}`)
      }
    } catch (error) {
      console.error(`[SSG] ✗ ${routeUrl}: ${error.message}`)
      errorCount++
    }
  }
  
  // Generate sitemap
  const sitemap = generateSitemap(routes, routeData)
  fs.writeFileSync(toAbsolute('dist/sitemap.xml'), sitemap)
  console.log('[SSG] ✓ sitemap.xml')
  
  const duration = ((Date.now() - buildStart) / 1000).toFixed(1)
  console.log(`[SSG] Build complete: ${successCount} pages, ${errorCount} errors, ${duration}s`)
})()
