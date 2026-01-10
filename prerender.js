import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://wp.dev.igeeksblog.com'
const WP_API_URL = 'https://dev.igeeksblog.com/wp-json/wp/v2'
const API_TIMEOUT = process.env.API_TIMEOUT ? parseInt(process.env.API_TIMEOUT) : 60000 // 60 seconds default
const POSTS_PER_PAGE = process.env.POSTS_PER_PAGE ? parseInt(process.env.POSTS_PER_PAGE) : 20 // Reduced to prevent WordPress memory exhaustion
const REQUEST_DELAY = process.env.REQUEST_DELAY ? parseInt(process.env.REQUEST_DELAY) : 500 // Delay between API requests (ms)
const ENABLE_INDEXING = process.env.VITE_ENABLE_INDEXING === 'true'

// ============================================
// BUILD OPTIMIZATION FLAGS
// ============================================
// USE_LOCAL_POSTS: Read from src/data/posts.json instead of fetching from API (FAST!)
// Set via: USE_LOCAL_POSTS=true in Amplify environment variables
const USE_LOCAL_POSTS = process.env.USE_LOCAL_POSTS === 'true'

// PARTIAL_BUILD: Only regenerate changed routes, copy unchanged from cache
// Set via: PARTIAL_BUILD=true in Amplify environment variables
const PARTIAL_BUILD = process.env.PARTIAL_BUILD === 'true'

// Cache version - bump to invalidate old caches when format changes
const CACHE_VERSION = 2

// MAX_POSTS_TO_PRERENDER: Limit number of individual post pages to pre-render
// Older posts will be rendered client-side on first visit
// Default: 200 (reduces build time significantly for large sites)
const MAX_POSTS_TO_PRERENDER = process.env.MAX_POSTS_TO_PRERENDER 
  ? parseInt(process.env.MAX_POSTS_TO_PRERENDER) 
  : 200

// MIN_TAG_COUNT: Only pre-render tag archives with at least this many posts
// Default: 5 (reduces build time by skipping rarely-used tags)
const MIN_TAG_COUNT = process.env.MIN_TAG_COUNT 
  ? parseInt(process.env.MIN_TAG_COUNT) 
  : 5

console.log(`[SSG] Build optimization: USE_LOCAL_POSTS=${USE_LOCAL_POSTS}, PARTIAL_BUILD=${PARTIAL_BUILD}, MAX_POSTS=${MAX_POSTS_TO_PRERENDER}, MIN_TAG_COUNT=${MIN_TAG_COUNT}`)

// Category slugs that trigger NewsArticle schema for Google News eligibility
const NEWS_CATEGORY_SLUGS = ['news', 'breaking-news', 'breaking', 'updates', 'announcements', 'latest']

// ============================================
// HTML Structure Validation for SSG Output
// ============================================

/**
 * Validates the structure of generated HTML files
 * Catches issues like: content in <head>, unclosed tags, invalid JSON-LD
 */
function validateHtmlStructure(html, routeUrl) {
  const errors = []
  const warnings = []
  
  // 1. Check for body elements accidentally in <head>
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  if (headMatch) {
    const headContent = headMatch[1]
    // Check for common body elements that shouldn't be in head
    if (/<(div|section|article|main|footer|header|nav|p|h[1-6])\b[^>]*>/i.test(headContent)) {
      errors.push('Body elements (div/section/article/etc.) found inside <head> tag')
    }
    // Check for excessive text content (excluding script/style/meta content)
    const strippedHead = headContent
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim()
    if (strippedHead.length > 500) {
      errors.push(`Excessive text content in <head>: ${strippedHead.length} chars (max 500)`)
    }
  } else {
    errors.push('Could not find <head> section')
  }
  
  // 2. Check for mismatched script tags
  const scriptOpenCount = (html.match(/<script/g) || []).length
  const scriptCloseCount = (html.match(/<\/script>/g) || []).length
  if (scriptOpenCount !== scriptCloseCount) {
    errors.push(`Mismatched script tags: ${scriptOpenCount} open, ${scriptCloseCount} close`)
  }
  
  // 3. Check for required HTML structure
  if (!/<html/i.test(html)) errors.push('Missing <html> tag')
  if (!/<head/i.test(html)) errors.push('Missing <head> tag')
  if (!/<body/i.test(html)) errors.push('Missing <body> tag')
  if (!/<\/html>/i.test(html)) errors.push('Missing </html> closing tag')
  if (!/<div id="root"/.test(html)) errors.push('Missing #root container')
  
  // 4. Check for content in body (should have SSR content)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    const bodyContent = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .trim()
    if (bodyContent.length < 100) {
      warnings.push(`Body content appears empty or minimal (${bodyContent.length} chars)`)
    }
  }
  
  // 5. Validate JSON-LD schemas
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi
  let match
  let schemaIndex = 0
  while ((match = jsonLdRegex.exec(html)) !== null) {
    schemaIndex++
    const jsonContent = match[1].trim()
    try {
      const parsed = JSON.parse(jsonContent)
      // Check for required schema fields
      if (!parsed['@context']) {
        warnings.push(`JSON-LD schema ${schemaIndex} missing @context`)
      }
      if (!parsed['@type']) {
        warnings.push(`JSON-LD schema ${schemaIndex} missing @type`)
      }
    } catch (e) {
      errors.push(`Invalid JSON-LD in schema ${schemaIndex}: ${e.message.substring(0, 100)}`)
    }
  }
  
  return { errors, warnings, schemaCount: schemaIndex }
}

// Import author social links from shared JSON (single source of truth)
const authorSocialLinks = JSON.parse(
  fs.readFileSync(toAbsolute('src/data/author-social-links.json'), 'utf-8')
)

// ============================================
// Local Data Files - used for fast builds when USE_LOCAL_POSTS=true
// Also used as fallback when WordPress API fails
// ============================================
const localDemoPosts = JSON.parse(fs.readFileSync(toAbsolute('src/data/demo-posts.json'), 'utf-8'))
const localCategories = JSON.parse(fs.readFileSync(toAbsolute('src/data/categories.json'), 'utf-8'))
const localTags = JSON.parse(fs.readFileSync(toAbsolute('src/data/tags.json'), 'utf-8'))
const localAuthors = JSON.parse(fs.readFileSync(toAbsolute('src/data/authors.json'), 'utf-8'))
const localStaticPagesObj = JSON.parse(fs.readFileSync(toAbsolute('src/data/static-pages.json'), 'utf-8'))
// Convert object to array format for iteration (.find() and for...of loops)
const localStaticPages = Object.entries(localStaticPagesObj).map(([slug, page]) => ({
  ...page,
  slug: page.slug || slug
}))

// Try to load cached posts from GitHub Action (if available)
let localCachedPosts = []
const cachedPostsPath = toAbsolute('src/data/posts.json')
if (fs.existsSync(cachedPostsPath)) {
  try {
    localCachedPosts = JSON.parse(fs.readFileSync(cachedPostsPath, 'utf-8'))
    console.log(`[SSG] ✓ Loaded ${localCachedPosts.length} cached posts from posts.json`)
  } catch (e) {
    console.warn(`[SSG] ⚠ Could not parse posts.json: ${e.message}`)
  }
}

console.log(`[SSG] Loaded fallback data: ${localDemoPosts.length} demo posts, ${localCategories.length} categories, ${localTags.length} tags, ${localAuthors.length} authors`)

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

// Fetch with timeout - resilient to malformed WordPress responses
async function fetchWithTimeout(url, timeout = API_TIMEOUT) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    // Read as text first to handle malformed responses
    // WordPress may output PHP warnings/errors (like <br />) before JSON
    const text = await response.text()
    
    // Try direct JSON parse first
    try {
      return JSON.parse(text)
    } catch {
      // Try to extract JSON array or object from the response
      // This handles cases where PHP warnings are prepended to JSON
      const jsonArrayMatch = text.match(/\[[\s\S]*\]$/)
      const jsonObjectMatch = text.match(/\{[\s\S]*\}$/)
      
      if (jsonArrayMatch) {
        console.warn(`[SSG] ⚠ Extracted JSON array from malformed response for: ${url.substring(0, 80)}...`)
        return JSON.parse(jsonArrayMatch[0])
      } else if (jsonObjectMatch) {
        console.warn(`[SSG] ⚠ Extracted JSON object from malformed response for: ${url.substring(0, 80)}...`)
        return JSON.parse(jsonObjectMatch[0])
      }
      
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`)
    }
    throw error
  }
}

// Fetch all items with pagination, retry logic, and progressive per_page reduction
async function fetchAllPaginated(endpoint, perPage = POSTS_PER_PAGE, maxRetries = 3) {
  const items = []
  let page = 1
  let hasMore = true
  let currentPerPage = perPage
  
  while (hasMore) {
    let lastError = null
    let success = false
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const url = `${WP_API_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=${currentPerPage}&page=${page}`
        const data = await fetchWithTimeout(url)
        items.push(...data)
        hasMore = data.length === currentPerPage
        page++
        success = true
        
        // Add delay between requests to give WordPress time to free memory
        if (hasMore) {
          await new Promise(r => setTimeout(r, REQUEST_DELAY))
        }
        break
      } catch (error) {
        lastError = error
        
        // Progressive per_page reduction on failure (memory optimization)
        if (attempt <= maxRetries) {
          const previousPerPage = currentPerPage
          if (currentPerPage > 10) {
            currentPerPage = 10
          } else if (currentPerPage > 5) {
            currentPerPage = 5
          }
          console.warn(`[SSG] Retry ${attempt}/${maxRetries} for ${endpoint} page ${page} (reduced per_page: ${previousPerPage} → ${currentPerPage})...`)
          await new Promise(r => setTimeout(r, 2000)) // Wait 2s before retry
        }
      }
    }
    
    if (!success) {
      console.warn(`[SSG] Failed to fetch ${endpoint} page ${page} after ${maxRetries + 1} attempts: ${lastError?.message}`)
      hasMore = false
    }
  }
  
  return items
}

// Fetch a single item by ID with retry logic
async function fetchSingleItem(endpoint, id, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const url = `${WP_API_URL}/${endpoint}/${id}`
      return await fetchWithTimeout(url, 10000) // Shorter timeout for single items
    } catch (error) {
      if (attempt <= maxRetries) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }
  return null
}

// Fetch all dynamic routes from WordPress
async function fetchAllRoutes() {
  console.log('[SSG] Fetching routes from WordPress API...')
  console.log(`[SSG] Configuration: per_page=${POSTS_PER_PAGE}, timeout=${API_TIMEOUT}ms, delay=${REQUEST_DELAY}ms`)
  
  const routes = [...STATIC_ROUTES]
  const routeData = new Map()
  let usingFallback = false
  
  try {
    // ============================================
    // FAST BUILD MODE: Use cached posts from posts.json
    // This file is updated by GitHub Action (scripts/fetch-wp-content.js)
    // ============================================
    
    let posts = []
    
    if (USE_LOCAL_POSTS && localCachedPosts.length > 0) {
      // FAST PATH: Use pre-fetched posts from GitHub Action
      console.log(`[SSG] ⚡ FAST MODE: Using ${localCachedPosts.length} cached posts from posts.json`)
      posts = localCachedPosts
    } else {
      // STANDARD PATH: Fetch from WordPress API
      console.log('[SSG] Fetching posts from WordPress API (without _embed)...')
      posts = await fetchAllPaginated('posts')
      console.log(`[SSG] ✓ Fetched ${posts.length} posts from API`)
      
      // FALLBACK: If API returned no posts, try cached or demo data
      if (posts.length === 0) {
        if (localCachedPosts.length > 0) {
          console.warn('[SSG] ⚠️ No posts from API - using cached posts.json')
          posts = localCachedPosts
        } else {
          console.warn('[SSG] ⚠️ No posts from API - falling back to demo posts')
          posts = localDemoPosts
          usingFallback = true
        }
        console.log(`[SSG] ✓ Using ${posts.length} fallback posts`)
      } else {
        // Only fetch embedded data if we got posts from API (not already embedded)
        if (!posts[0]?._embedded) {
          console.log('[SSG] Fetching media and authors separately...')
          
          // Get unique media IDs and author IDs
          const mediaIds = [...new Set(posts.map(p => p.featured_media).filter(Boolean))]
          const authorIds = [...new Set(posts.map(p => p.author).filter(Boolean))]
          
          console.log(`[SSG] Need to fetch ${mediaIds.length} media items and ${authorIds.length} authors`)
          
          // Fetch all media in batches
          const mediaMap = new Map()
          const mediaBatchSize = 50
          for (let i = 0; i < mediaIds.length; i += mediaBatchSize) {
            const batchIds = mediaIds.slice(i, i + mediaBatchSize)
            try {
              const mediaUrl = `${WP_API_URL}/media?include=${batchIds.join(',')}&per_page=${mediaBatchSize}`
              const mediaItems = await fetchWithTimeout(mediaUrl, 30000)
              for (const item of mediaItems) {
                mediaMap.set(item.id, item)
              }
              console.log(`[SSG] ✓ Fetched media batch ${Math.floor(i / mediaBatchSize) + 1}: ${mediaItems.length} items`)
              await new Promise(r => setTimeout(r, REQUEST_DELAY))
            } catch (error) {
              console.warn(`[SSG] ⚠️ Failed to fetch media batch: ${error.message}`)
            }
          }
          
          // Fetch all authors
          const authorMap = new Map()
          if (authorIds.length > 0) {
            try {
              const authorsUrl = `${WP_API_URL}/users?include=${authorIds.join(',')}&per_page=100`
              const authorItems = await fetchWithTimeout(authorsUrl, 30000)
              for (const author of authorItems) {
                authorMap.set(author.id, author)
              }
              console.log(`[SSG] ✓ Fetched ${authorItems.length} authors`)
            } catch (error) {
              console.warn(`[SSG] ⚠️ Failed to fetch authors: ${error.message}`)
            }
          }
          
          // Fetch categories and tags
          console.log('[SSG] Fetching all categories and tags for post embedding...')
          let allCategories = []
          let allTags = []
          
          try {
            allCategories = await fetchAllPaginated('categories')
            console.log(`[SSG] ✓ Fetched ${allCategories.length} categories`)
          } catch (error) {
            console.warn(`[SSG] ⚠️ Failed to fetch categories: ${error.message}`)
          }
          
          try {
            allTags = await fetchAllPaginated('tags')
            console.log(`[SSG] ✓ Fetched ${allTags.length} tags`)
          } catch (error) {
            console.warn(`[SSG] ⚠️ Failed to fetch tags: ${error.message}`)
          }
          
          const categoryMap = new Map(allCategories.map(c => [c.id, c]))
          const tagMap = new Map(allTags.map(t => [t.id, t]))
          
          // Attach _embedded data to each post
          posts = posts.map(post => {
            const featuredMedia = mediaMap.get(post.featured_media)
            const author = authorMap.get(post.author)
            const postCategories = (post.categories || []).map(id => categoryMap.get(id)).filter(Boolean)
            const postTags = (post.tags || []).map(id => tagMap.get(id)).filter(Boolean)
            
            return {
              ...post,
              _embedded: {
                'wp:featuredmedia': featuredMedia ? [featuredMedia] : [],
                'author': author ? [author] : [],
                'wp:term': [postCategories, postTags]
              }
            }
          })
          
          console.log(`[SSG] ✓ Attached embedded data to ${posts.length} posts`)
        } else {
          console.log(`[SSG] ✓ Posts already have embedded data`)
        }
      }
    }
    
    // Categories already fetched above for embedding, reuse or fetch if fallback
    let categories = [...new Map(posts.flatMap(p => p._embedded?.['wp:term']?.[0] || []).map(c => [c.id, c])).values()]
    if (categories.length === 0) {
      console.log('[SSG] Fetching categories separately...')
      categories = await fetchAllPaginated('categories')
    }
    if (categories.length === 0) {
      console.warn('[SSG] ⚠️ No categories from API - using local fallback')
      categories = localCategories
      usingFallback = true
      console.log(`[SSG] ✓ Using ${categories.length} local categories`)
    } else {
      console.log(`[SSG] ✓ Have ${categories.length} categories`)
    }
    
    // Tags already fetched above for embedding, reuse or fetch if fallback
    let tags = [...new Map(posts.flatMap(p => p._embedded?.['wp:term']?.[1] || []).map(t => [t.id, t])).values()]
    if (tags.length === 0) {
      console.log('[SSG] Fetching tags separately...')
      tags = await fetchAllPaginated('tags')
    }
    if (tags.length === 0) {
      console.warn('[SSG] ⚠️ No tags from API - using local fallback')
      tags = localTags
      usingFallback = true
      console.log(`[SSG] ✓ Using ${tags.length} local tags`)
    } else {
      console.log(`[SSG] ✓ Have ${tags.length} tags`)
    }
    
    // Authors already fetched above for embedding, reuse or fetch if fallback
    let authors = [...new Map(posts.flatMap(p => p._embedded?.['author'] || []).map(a => [a.id, a])).values()]
    if (authors.length === 0) {
      console.log('[SSG] Fetching authors separately...')
      authors = await fetchAllPaginated('users')
    }
    if (authors.length === 0) {
      console.warn('[SSG] ⚠️ No authors from API - using local fallback')
      authors = localAuthors
      usingFallback = true
      console.log(`[SSG] ✓ Using ${authors.length} local authors`)
    } else {
      console.log(`[SSG] ✓ Have ${authors.length} authors`)
    }
    
    // Add homepage route with latest posts for SSR
    const homepagePosts = posts.slice(0, 20) // First 20 posts for homepage grid
    routeData.set('/', { type: 'homepage', data: { posts: homepagePosts } })
    console.log(`[SSG] Homepage will render ${homepagePosts.length} posts`)
    
    // ============================================
    // OPTIMIZED PRE-RENDERING: Limit scope for faster builds
    // ============================================
    
    // Add post routes (limited by MAX_POSTS_TO_PRERENDER)
    const postsToPrerender = posts.slice(0, MAX_POSTS_TO_PRERENDER)
    const skippedPosts = posts.length - postsToPrerender.length
    
    for (const post of postsToPrerender) {
      const route = `/${post.slug}`
      routes.push(route)
      routeData.set(route, { type: 'post', data: post })
    }
    
    if (skippedPosts > 0) {
      console.log(`[SSG] ⚡ Pre-rendering ${postsToPrerender.length} posts (skipping ${skippedPosts} older posts for faster build)`)
    } else {
      console.log(`[SSG] ✓ Pre-rendering all ${postsToPrerender.length} posts`)
    }
    
    // Add category routes with posts (all categories)
    for (const category of categories) {
      if (category.count > 0) {
        const route = `/category/${category.slug}`
        routes.push(route)
        const categoryPosts = posts.filter(p => p.categories?.includes(category.id)).slice(0, 12)
        routeData.set(route, { type: 'category', data: { ...category, posts: categoryPosts } })
      }
    }
    console.log(`[SSG] ✓ Added ${categories.filter(c => c.count > 0).length} category archives`)
    
    // Add tag routes with posts (filtered by MIN_TAG_COUNT)
    const tagsToPrerender = tags.filter(t => t.count >= MIN_TAG_COUNT)
    const skippedTags = tags.length - tagsToPrerender.length
    
    for (const tag of tagsToPrerender) {
      const route = `/tag/${tag.slug}`
      routes.push(route)
      const tagPosts = posts.filter(p => p.tags?.includes(tag.id)).slice(0, 12)
      routeData.set(route, { type: 'tag', data: { ...tag, posts: tagPosts } })
    }
    
    if (skippedTags > 0) {
      console.log(`[SSG] ⚡ Pre-rendering ${tagsToPrerender.length} tag archives (skipping ${skippedTags} low-count tags)`)
    } else {
      console.log(`[SSG] ✓ Added ${tagsToPrerender.length} tag archives`)
    }
    
    // Add author routes with posts (all authors)
    for (const author of authors) {
      const route = `/author/${author.slug}`
      routes.push(route)
      const authorPosts = posts.filter(p => p.author === author.id).slice(0, 12)
      routeData.set(route, { type: 'author', data: { ...author, posts: authorPosts } })
    }
    console.log(`[SSG] ✓ Added ${authors.length} author archives`)
    
    // Add static pages with retry logic and fallback
    const staticPageSlugs = ['about', 'contact-us', 'privacy-policy']
    for (const pageSlug of staticPageSlugs) {
      let pageData = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          pageData = await fetchWithTimeout(`${WP_API_URL}/pages?slug=${pageSlug}&_embed=true`)
          if (pageData && pageData[0]) break
        } catch (error) {
          console.warn(`[SSG] Attempt ${attempt}/3 for page ${pageSlug} failed: ${error.message}`)
          if (attempt < 3) await new Promise(r => setTimeout(r, 2000))
        }
      }
      
      if (pageData && pageData[0]) {
        const route = `/${pageSlug}`
        routes.push(route)
        routeData.set(route, { type: 'page', data: pageData[0] })
        console.log(`[SSG] ✓ Added static page: ${pageSlug}`)
      } else {
        // Try local fallback for static pages
        const localPage = localStaticPages.find(p => p.slug === pageSlug)
        if (localPage) {
          const route = `/${pageSlug}`
          routes.push(route)
          routeData.set(route, { type: 'page', data: localPage })
          usingFallback = true
          console.log(`[SSG] ✓ Using local fallback for page: ${pageSlug}`)
        } else {
          console.warn(`[SSG] ⚠ Static page ${pageSlug} not available (no API data or local fallback)`)
        }
      }
    }
    
  } catch (error) {
    console.error(`[SSG] ❌ CRITICAL: WordPress API unreachable!`)
    console.error(`[SSG] API URL: ${WP_API_URL}`)
    console.error(`[SSG] Error: ${error.message}`)
    console.error(`[SSG] Falling back to local demo data...`)
    
    usingFallback = true
    
    // Use all local fallback data
    const posts = localDemoPosts
    const categories = localCategories
    const tags = localTags
    const authors = localAuthors
    
    console.log(`[SSG] ✓ Using ${posts.length} demo posts, ${categories.length} categories, ${tags.length} tags, ${authors.length} authors`)
    
    // Add homepage with demo posts
    routeData.set('/', { type: 'homepage', data: { posts: posts.slice(0, 20) } })
    
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
        routeData.set(route, { type: 'category', data: { ...category, posts: [] } })
      }
    }
    
    // Add author routes
    for (const author of authors) {
      const route = `/author/${author.slug}`
      routes.push(route)
      routeData.set(route, { type: 'author', data: { ...author, posts: [] } })
    }
    
    // Add static pages from local data
    for (const page of localStaticPages) {
      const route = `/${page.slug}`
      routes.push(route)
      routeData.set(route, { type: 'page', data: page })
      console.log(`[SSG] ✓ Added local static page: ${page.slug}`)
    }
    
    // Optionally fail the build if API is required
    if (process.env.REQUIRE_API === 'true') {
      throw new Error('Build failed: WordPress API is required but unreachable')
    }
  }
  
  return { routes, routeData, usingFallback }
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

// Sanitize text for safe embedding in JSON-LD script tags
// This prevents </script> injection and other breaking characters
function sanitizeForJsonLd(text) {
  return (text || '')
    .replace(/</g, '\\u003C')    // Escape < to prevent </script> injection
    .replace(/>/g, '\\u003E')    // Escape >
    .replace(/&/g, '\\u0026')    // Escape &
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
  
  // Homepage SEO with enhanced schemas
  if (route === '/' || routeInfo?.type === 'homepage') {
    const homepageDescription = 'Your daily source for Apple news, how-to guides, tips, and app reviews covering iPhone, iPad, Mac, Apple Watch, and more.'
    
    // Build ItemList schema from homepage posts if available
    const posts = routeInfo?.data?.posts || []
    const itemListItems = posts.slice(0, 10).map((post, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${SITE_URL}/${post.slug}`,
      "name": sanitizeForJsonLd(stripHtml(post.title?.rendered || post.slug))
    }))
    
    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "iGeeksBlog",
        "url": SITE_URL,
        "description": homepageDescription,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${SITE_URL}/?s={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "iGeeksBlog",
        "url": SITE_URL,
        "logo": `${SITE_URL}/og-default.png`,
        "sameAs": [
          "https://twitter.com/iaborapple",
          "https://www.facebook.com/iGeeksBlog",
          "https://www.youtube.com/igeeksblog"
        ]
      }
    ]
    
    // Add ItemList if we have posts
    if (itemListItems.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Latest Articles",
        "itemListElement": itemListItems
      })
    }
    
    return `
    <title>iGeeksBlog - Apple News, How-To Guides, Tips & App Reviews</title>
    <meta name="description" content="${homepageDescription}" />
    <meta name="robots" content="${robotsContent}" />
    <link rel="canonical" href="${SITE_URL}/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="iGeeksBlog - Apple News, How-To Guides, Tips & App Reviews" />
    <meta property="og:description" content="${homepageDescription}" />
    <meta property="og:url" content="${SITE_URL}/" />
    <meta property="og:site_name" content="iGeeksBlog" />
    <meta property="og:image" content="${SITE_URL}/og-default.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="iGeeksBlog - Apple News, How-To Guides, Tips & App Reviews" />
    <meta name="twitter:description" content="${homepageDescription}" />
    <meta name="twitter:image" content="${SITE_URL}/og-default.png" />
    ${schemas.map(s => `<script type="application/ld+json">
${JSON.stringify(s)}
</script>`).join('\n')}`.trim()
  }
  
  // No routeInfo for non-homepage routes
  if (!routeInfo) {
    return ''
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
      "headline": sanitizeForJsonLd(stripHtml(data.title?.rendered || '')),
      "description": sanitizeForJsonLd(stripHtml(data.excerpt?.rendered || '')),
      "image": featuredImage ? {
        "@type": "ImageObject",
        "url": featuredImage,
        "width": 1200,
        "height": 675
      } : undefined,
      "author": {
        "@type": "Person",
        "name": sanitizeForJsonLd(author),
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
      "keywords": sanitizeForJsonLd(categories.join(', ')),
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
      "name": sanitizeForJsonLd(data.name),
      "description": sanitizeForJsonLd(stripHtml(data.description || `Browse ${data.name} articles`)),
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
      "name": sanitizeForJsonLd(data.name),
      "description": sanitizeForJsonLd(stripHtml(data.description || `Browse articles tagged ${data.name}`)),
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
        "name": sanitizeForJsonLd(data.name),
        "url": canonicalUrl,
        "image": avatar || undefined,
        "description": sanitizeForJsonLd(data.description) || undefined,
        ...(sameAs.length > 0 && { "sameAs": sameAs })
      },
      "name": sanitizeForJsonLd(`${data.name} - Author Profile`),
      "description": sanitizeForJsonLd(stripHtml(data.description || `Articles by ${data.name}`)),
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
  
  // Static pages (About, Contact, Privacy Policy)
  if (type === 'page') {
    const title = escapeHtml(stripHtml(data.title?.rendered || data.slug))
    const description = escapeHtml(stripHtml(data.excerpt?.rendered || data.content?.rendered || '').slice(0, 160))
    const canonicalUrl = `${SITE_URL}/${data.slug}`
    
    const webPageSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": sanitizeForJsonLd(stripHtml(data.title?.rendered || data.slug)),
      "description": sanitizeForJsonLd(stripHtml(data.excerpt?.rendered || data.content?.rendered || '')),
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
    ${JSON.stringify(webPageSchema)}
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

// ============================================
// PARTIAL BUILD SUPPORT
// ============================================

/**
 * Load build manifest for partial builds
 */
function loadBuildManifest() {
  const manifestPath = toAbsolute('src/data/build-manifest.json')
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      
      // Version check - invalidate old manifests
      if (manifest.version !== CACHE_VERSION) {
        console.log(`[SSG] Manifest version mismatch (${manifest.version} vs ${CACHE_VERSION}) - forcing full rebuild`)
        return null
      }
      
      return manifest
    } catch (e) {
      console.warn(`[SSG] ⚠ Could not parse build manifest: ${e.message}`)
    }
  }
  return null
}

/**
 * Check if a cached file exists and contains correct content
 * Validates by checking canonical URL matches the expected route
 */
function getCachedFile(routeUrl) {
  const cacheFile = routeUrl === '/' 
    ? toAbsolute('.build-cache/index.html')
    : routeUrl.endsWith('.html')
      ? toAbsolute(`.build-cache${routeUrl}`)
      : toAbsolute(`.build-cache${routeUrl}.html`)
  
  if (fs.existsSync(cacheFile)) {
    try {
      // Read and validate the cached file contains correct content
      const content = fs.readFileSync(cacheFile, 'utf-8')
      
      // For non-homepage routes, verify canonical URL matches
      if (routeUrl !== '/') {
        const canonicalMatch = content.match(/<link rel="canonical" href="([^"]+)"/)
        if (canonicalMatch) {
          const canonicalUrl = canonicalMatch[1]
          // Extract path from canonical URL
          try {
            const canonicalPath = new URL(canonicalUrl).pathname.replace(/\.html$/, '').replace(/\/$/, '')
            const expectedPath = routeUrl.replace(/\.html$/, '').replace(/\/$/, '')
            
            // Check if paths match (allowing for trailing slash differences)
            if (canonicalPath !== expectedPath && canonicalPath !== '/' + expectedPath) {
              console.warn(`[SSG] ⚠ Cache validation FAILED for ${routeUrl}: canonical mismatch (expected ${expectedPath}, got ${canonicalPath})`)
              return null // Force regeneration
            }
          } catch (urlError) {
            // If URL parsing fails, skip validation
          }
        }
      }
      
      return cacheFile
    } catch (readError) {
      console.warn(`[SSG] ⚠ Could not read cached file for ${routeUrl}: ${readError.message}`)
      return null
    }
  }
  return null
}

// Main prerender function
;(async () => {
  const buildStart = Date.now()
  console.log('[SSG] Starting pre-render build...')
  
  // Load build manifest for partial builds
  let manifest = null
  let changedRoutes = new Set()
  let isPartialBuild = false
  
  if (PARTIAL_BUILD) {
    manifest = loadBuildManifest()
    if (manifest && !manifest.fullRebuildRequired && manifest.changedRoutes?.length > 0) {
      changedRoutes = new Set(manifest.changedRoutes)
      isPartialBuild = true
      console.log(`[SSG] ⚡ PARTIAL BUILD MODE: ${changedRoutes.size} routes to regenerate`)
    } else if (manifest?.fullRebuildRequired) {
      console.log(`[SSG] Full rebuild required (${manifest.changedCount || 'many'} changes)`)
    } else {
      console.log(`[SSG] No valid manifest found - doing full build`)
    }
  }
  
  // Read template
  let template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
  
  // Log template structure for debugging
  console.log(`[SSG] Template size: ${template.length} bytes`)
  console.log(`[SSG] Template has <!--seo-head-->: ${template.includes('<!--seo-head-->')}`)
  console.log(`[SSG] Template has <!--app-html-->: ${template.includes('<!--app-html-->')}`)
  console.log(`[SSG] Template has <div id="root">: ${template.includes('<div id="root">')}`)
  
  // If the <!--app-html--> placeholder is missing but we have #root, that's fine (fallback will work)
  if (!template.includes('<!--seo-head-->')) {
    console.warn('[SSG] ⚠️ Missing <!--seo-head--> placeholder in dist/index.html')
  }
  if (!template.includes('<!--app-html-->') && !template.includes('<div id="root"></div>')) {
    console.warn('[SSG] ⚠️ Missing <!--app-html--> placeholder and no empty #root in dist/index.html')
  }
  
  // Load server entry
  const serverAssetsDir = toAbsolute('dist/server/assets')
  const files = fs.readdirSync(serverAssetsDir)
  const entryFile = files.find(f => f.startsWith('entry-server') && f.endsWith('.js'))
  if (!entryFile) {
    throw new Error('Could not find entry-server.js in dist/server/assets')
  }
  const { render } = await import(`./dist/server/assets/${entryFile}`)
  
  // Test WordPress API connectivity first
  console.log('[SSG] Testing WordPress API connectivity...')
  try {
    const testUrl = `${WP_API_URL}/posts?per_page=1`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(testUrl, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (response.ok) {
      console.log(`[SSG] ✓ WordPress API is accessible (status ${response.status})`)
    } else {
      console.error(`[SSG] ⚠️  WordPress API returned status ${response.status}`)
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[SSG] ❌ WordPress API test timed out after 5 seconds`)
    } else {
      console.error(`[SSG] ❌ WordPress API test failed: ${error.message}`)
    }
  }
  
  // Fetch all routes
  const { routes, routeData, usingFallback } = await fetchAllRoutes()
  console.log(`[SSG] Pre-rendering ${routes.length} routes...`)
  
  // Verify we have content to render
  const postCount = [...routeData.values()].filter(r => r.type === 'post').length
  if (postCount === 0) {
    console.error(`[SSG] ⚠️  WARNING: No posts found! Check WordPress API connectivity.`)
    console.error(`[SSG] Only static routes will be generated: ${routes.join(', ')}`)
  } else {
    console.log(`[SSG] ✓ Found ${postCount} posts to pre-render${usingFallback ? ' (using fallback data)' : ''}`)
  }
  
  let successCount = 0
  let errorCount = 0
  let validationErrorCount = 0
  let cacheHitCount = 0
  
  // Render all routes
  for (const routeUrl of routes) {
    try {
      // PARTIAL BUILD: Check if we can use cached version
      if (isPartialBuild && !changedRoutes.has(routeUrl)) {
        const cachedFile = getCachedFile(routeUrl)
        if (cachedFile) {
          // Determine destination path
          let filePath
          if (routeUrl === '/') {
            filePath = 'dist/index.html'
          } else if (routeUrl.endsWith('.html')) {
            filePath = `dist${routeUrl}`
          } else {
            filePath = `dist${routeUrl}.html`
          }
          
          ensureDir(toAbsolute(filePath))
          fs.copyFileSync(cachedFile, toAbsolute(filePath))
          cacheHitCount++
          continue
        }
      }
      
      // Get route data for SSR
      const routeInfo = routeData.get(routeUrl)
      
      // Get app shell HTML (pass route data for full content rendering)
      const appHtml = render(routeUrl, routeInfo)
      
      // Get SEO head for this route
      const seoHead = generateSEOHead(routeUrl, routeInfo)
      
      // Inject into template
      let html = template
        .replace('<!--seo-head-->', seoHead)
      
      // Inject app HTML into #root - try comment first, then fallback to empty #root
      if (html.includes('<!--app-html-->')) {
        html = html.replace('<!--app-html-->', appHtml)
      } else {
        // Fallback: inject into empty <div id="root"></div>
        html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
      }
      
      // Remove default title and meta tags to avoid duplicates (SSG injects proper ones)
      html = html
        .replace(/<!-- Default title - React Helmet will override per page -->\s*<title>iGeeksBlog<\/title>\s*/, '')
        .replace(/<meta name="description" content="Your daily source.*?" \/>/, '')
      
      // Validate HTML structure before writing
      const validation = validateHtmlStructure(html, routeUrl)
      
      if (validation.errors.length > 0) {
        console.error(`[SSG] ⚠️ VALIDATION FAILED for ${routeUrl}:`)
        validation.errors.forEach(err => console.error(`[SSG]   ✗ ${err}`))
        validationErrorCount++
      }
      
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warn => console.warn(`[SSG]   ⚠ ${routeUrl}: ${warn}`))
      }
      
      // Determine file path - use flat HTML files for reliable Netlify serving
      let filePath;
      if (routeUrl === '/') {
        filePath = 'dist/index.html';
      } else if (routeUrl.endsWith('.html')) {
        // Static files like /llm.html stay as-is
        filePath = `dist${routeUrl}`;
      } else {
        // Dynamic routes: /slug -> /slug.html (flat file, not directory)
        filePath = `dist${routeUrl}.html`;
      }
      
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
  
  // Build summary
  console.log(`\n[SSG] ========== BUILD SUMMARY ==========`);
  if (usingFallback) {
    console.log(`[SSG] ⚠️  USING FALLBACK DATA (WordPress API failed)`);
  }
  if (isPartialBuild) {
    console.log(`[SSG] ⚡ PARTIAL BUILD: ${cacheHitCount} from cache, ${successCount} regenerated`);
  }
  console.log(`[SSG] Total routes generated: ${successCount + cacheHitCount}`);
  const categoryCount = [...routeData.entries()].filter(([_, v]) => v.type === 'category').length;
  const tagCount = [...routeData.entries()].filter(([_, v]) => v.type === 'tag').length;
  const authorCount = [...routeData.entries()].filter(([_, v]) => v.type === 'author').length;
  const pageCount = [...routeData.entries()].filter(([_, v]) => v.type === 'page').length;
  console.log(`[SSG] Posts: ${postCount}${usingFallback ? ' (demo)' : ''}`);
  console.log(`[SSG] Categories: ${categoryCount}${usingFallback ? ' (local)' : ''}`);
  console.log(`[SSG] Tags: ${tagCount}${usingFallback ? ' (local)' : ''}`);
  console.log(`[SSG] Authors: ${authorCount}${usingFallback ? ' (local)' : ''}`);
  console.log(`[SSG] Pages: ${pageCount}`);
  if (isPartialBuild) {
    console.log(`[SSG] Cache hits: ${cacheHitCount}`);
  }
  console.log(`[SSG] Build errors: ${errorCount}`);
  console.log(`[SSG] Validation errors: ${validationErrorCount}`);
  console.log(`[SSG] ======================================\n`);
  
  // Fail build if validation errors found (optional - can be controlled by env var)
  if (validationErrorCount > 0 && process.env.STRICT_VALIDATION === 'true') {
    console.error(`[SSG] ❌ Build failed: ${validationErrorCount} validation errors detected`)
    process.exit(1)
  } else if (validationErrorCount > 0) {
    console.warn(`[SSG] ⚠️ Build completed with ${validationErrorCount} validation warnings (set STRICT_VALIDATION=true to fail on errors)`)
  }
  
  const duration = ((Date.now() - buildStart) / 1000).toFixed(1)
  console.log(`[SSG] Build complete: ${successCount} rendered, ${cacheHitCount} cached, ${errorCount} errors, ${duration}s`)
})()
