import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

// Configuration
const API_BASE = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2'
const SITE_URL = process.env.SITE_URL || 'https://dev.igeeksblog.com'

// Faster timeout to prevent build hangs
async function fetchWithTimeout(url, timeout = 2000) {
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

// Fetch items from WordPress with strict limits for fast builds
async function fetchAllFromWP(endpoint, maxItems = 20) {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/${endpoint}?per_page=${maxItems}`,
      2000
    )
    if (!response.ok) return []
    return await response.json()
  } catch (error) {
    console.warn(`Warning: Could not fetch ${endpoint}: ${error.message}`)
    return []
  }
}

// Generate routes to prerender (limited for fast builds)
async function getRoutesToPrerender() {
  const startTime = Date.now()
  console.log('Fetching content from WordPress (2s timeout per request)...')
  
  // Fetch all in parallel with aggressive timeouts
  const [posts, categories, tags, authors] = await Promise.all([
    fetchAllFromWP('posts', 20),
    fetchAllFromWP('categories', 15),
    fetchAllFromWP('tags', 15),
    fetchAllFromWP('users', 10),
  ])
  
  console.log(`API fetch completed in ${Date.now() - startTime}ms`)
  console.log(`Found: ${posts.length} posts, ${categories.length} categories, ${tags.length} tags, ${authors.length} authors`)
  
  const routes = [
    '/',
    '/preview',
    ...posts.map(p => `/${p.slug}`),
    ...categories.map(c => `/category/${c.slug}`),
    ...tags.map(t => `/tag/${t.slug}`),
    ...authors.map(a => `/author/${a.slug}`),
  ]
  
  return { routes, posts }
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

// Render pages in parallel batches for speed
async function renderInBatches(routes, template, render, batchSize = 10) {
  for (let i = 0; i < routes.length; i += batchSize) {
    const batch = routes.slice(i, i + batchSize)
    await Promise.all(batch.map(routeUrl => {
      try {
        const appHtml = render(routeUrl)
        const html = template.replace('<!--app-html-->', appHtml)
        const filePath = routeUrl === '/' ? 'dist/index.html' : `dist${routeUrl}.html`
        ensureDir(toAbsolute(filePath))
        fs.writeFileSync(toAbsolute(filePath), html)
      } catch (error) {
        console.error(`Failed: ${routeUrl}`)
      }
    }))
    console.log(`Rendered ${Math.min(i + batchSize, routes.length)}/${routes.length} pages`)
  }
}

// Main prerender function
;(async () => {
  const buildStart = Date.now()
  console.log('Starting pre-render build...')
  
  const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
  
  const serverAssetsDir = toAbsolute('dist/server/assets')
  const files = fs.readdirSync(serverAssetsDir)
  const entryFile = files.find(f => f.startsWith('entry-server') && f.endsWith('.js'))
  if (!entryFile) {
    throw new Error('Could not find entry-server.js in dist/server/assets')
  }
  const { render } = await import(`./dist/server/assets/${entryFile}`)
  
  const { routes, posts } = await getRoutesToPrerender()
  console.log(`Pre-rendering ${routes.length} routes in parallel batches...`)
  
  await renderInBatches(routes, template, render, 10)
  
  // Generate sitemap
  const sitemap = generateSitemap(routes, posts)
  fs.writeFileSync(toAbsolute('dist/sitemap.xml'), sitemap)
  
  console.log(`Build complete in ${((Date.now() - buildStart) / 1000).toFixed(1)}s`)
})()
