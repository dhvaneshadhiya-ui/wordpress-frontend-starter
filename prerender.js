import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

// Configuration
const API_BASE = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2'
const SITE_URL = process.env.SITE_URL || 'https://dev.igeeksblog.com'

// Fetch all items from a paginated WordPress endpoint
async function fetchAllFromWP(endpoint, perPage = 100) {
  const items = []
  let page = 1
  let hasMore = true
  
  while (hasMore) {
    const response = await fetch(`${API_BASE}/${endpoint}?per_page=${perPage}&page=${page}`)
    if (!response.ok) {
      if (response.status === 400) break // No more pages
      throw new Error(`Failed to fetch ${endpoint}: ${response.status}`)
    }
    
    const data = await response.json()
    items.push(...data)
    
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1')
    hasMore = page < totalPages
    page++
  }
  
  return items
}

// Generate all routes to prerender
async function getRoutesToPrerender() {
  console.log('Fetching content from WordPress...')
  console.log('API Base:', API_BASE)
  
  const [posts, categories, tags, authors] = await Promise.all([
    fetchAllFromWP('posts'),
    fetchAllFromWP('categories'),
    fetchAllFromWP('tags'),
    fetchAllFromWP('users'),
  ])
  
  console.log(`Found: ${posts.length} posts, ${categories.length} categories, ${tags.length} tags, ${authors.length} authors`)
  
  const routes = [
    '/',
    '/preview',
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
