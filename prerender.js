import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

// Configuration
const API_BASE = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2'
const SITE_URL = process.env.SITE_URL || 'https://dev.igeeksblog.com'

// Fetch with timeout to prevent hanging
async function fetchWithTimeout(url, timeout = 4000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Fetch all items from a paginated WordPress endpoint (limited for faster builds)
async function fetchAllFromWP(endpoint, perPage = 50, maxItems = 50) {
  const items = []
  let page = 1
  let hasMore = true
  
  while (hasMore && items.length < maxItems) {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/${endpoint}?per_page=${perPage}&page=${page}`,
        4000
      )
      if (!response.ok) {
        if (response.status === 400) break
        console.warn(`Warning: ${endpoint} returned ${response.status}`)
        break
      }
      
      const data = await response.json()
      items.push(...data)
      
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1')
      hasMore = page < totalPages
      page++
    } catch (error) {
      console.warn(`Warning: Could not fetch ${endpoint}: ${error.message}`)
      break
    }
  }
  
  return items.slice(0, maxItems)
}

// Generate all routes to prerender
async function getRoutesToPrerender() {
  console.log('Fetching content from WordPress...')
  console.log('API Base:', API_BASE)
  
  let posts = [], categories = [], tags = [], authors = []
  
  try {
    const results = await Promise.all([
      fetchAllFromWP('posts', 50, 50),
      fetchAllFromWP('categories', 50, 50),
      fetchAllFromWP('tags', 50, 50),
      fetchAllFromWP('users', 20, 20),
    ])
    posts = results[0]
    categories = results[1]
    tags = results[2]
    authors = results[3]
  } catch (error) {
    console.warn('Warning: WordPress API unreachable, using minimal routes')
    console.warn('Error:', error.message)
  }
  
  console.log(`Found: ${posts.length} posts, ${categories.length} categories, ${tags.length} tags, ${authors.length} authors`)
  
  const routes = [
    '/',
    '/preview',
    '/llm.html', // Static LLM-friendly page for AI crawlers
    ...posts.map(p => `/${p.slug}`),
    ...categories.map(c => `/category/${c.slug}`),
    ...tags.map(t => `/tag/${t.slug}`),
    ...authors.map(a => `/author/${a.slug}`),
  ]
  
  return { routes, posts, categories, tags, authors }
}

// Ensure directory exists
function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Generate sitemap XML
function generateSitemap(routes, posts) {
  const now = new Date().toISOString()
  
  const urlEntries = routes
    .filter(route => route !== '/preview') // Exclude preview from sitemap
    .map(route => {
      let priority = '0.5'
      let changefreq = 'weekly'
      let lastmod = now
      
      if (route === '/') {
        priority = '1.0'
        changefreq = 'daily'
      } else if (!route.startsWith('/category/') && !route.startsWith('/tag/') && !route.startsWith('/author/')) {
        // Post pages
        priority = '0.8'
        changefreq = 'monthly'
        const post = posts.find(p => `/${p.slug}` === route)
        if (post?.modified) lastmod = new Date(post.modified).toISOString()
      } else if (route.startsWith('/category/') || route.startsWith('/tag/')) {
        priority = '0.6'
        changefreq = 'weekly'
      } else if (route.startsWith('/author/')) {
        priority = '0.4'
        changefreq = 'monthly'
      }
      
      return `  <url>
    <loc>${SITE_URL}${route === '/' ? '' : route}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
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
  const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
  
  // Find the entry-server file (handles hash in filename from Vite build)
  const serverAssetsDir = toAbsolute('dist/server/assets')
  const files = fs.readdirSync(serverAssetsDir)
  const entryFile = files.find(f => f.startsWith('entry-server') && f.endsWith('.js'))
  if (!entryFile) {
    throw new Error('Could not find entry-server.js in dist/server/assets')
  }
  const { render } = await import(`./dist/server/assets/${entryFile}`)
  
  const { routes, posts } = await getRoutesToPrerender()
  console.log(`Pre-rendering ${routes.length} routes...`)
  
  for (const routeUrl of routes) {
    try {
      const appHtml = render(routeUrl)
      const html = template.replace('<!--app-html-->', appHtml)
      
      let filePath
      if (routeUrl === '/') {
        filePath = 'dist/index.html'
      } else {
        filePath = `dist${routeUrl}.html`
      }
      
      ensureDir(toAbsolute(filePath))
      fs.writeFileSync(toAbsolute(filePath), html)
      console.log('pre-rendered:', filePath)
    } catch (error) {
      console.error(`Failed to prerender ${routeUrl}:`, error.message)
    }
  }
  
  // Generate sitemap
  console.log('Generating sitemap.xml...')
  const sitemap = generateSitemap(routes, posts)
  fs.writeFileSync(toAbsolute('dist/sitemap.xml'), sitemap)
  console.log(`Sitemap generated with ${routes.length - 1} URLs`)
  
  console.log('Pre-rendering complete!')
})()
