import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://dev.igeeksblog.com'

// Static routes only - no API calls to prevent build timeouts
const STATIC_ROUTES = ['/', '/preview']

// Ensure directory exists
function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Generate minimal sitemap
function generateSitemap(routes) {
  const now = new Date().toISOString()
  
  const urlEntries = routes
    .filter(route => route !== '/preview')
    .map(route => {
      const priority = route === '/' ? '1.0' : '0.5'
      return `  <url>
    <loc>${SITE_URL}${route === '/' ? '' : route}</loc>
    <lastmod>${now}</lastmod>
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
  console.log('Starting pre-render build (static routes only)...')
  
  const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
  
  const serverAssetsDir = toAbsolute('dist/server/assets')
  const files = fs.readdirSync(serverAssetsDir)
  const entryFile = files.find(f => f.startsWith('entry-server') && f.endsWith('.js'))
  if (!entryFile) {
    throw new Error('Could not find entry-server.js in dist/server/assets')
  }
  const { render } = await import(`./dist/server/assets/${entryFile}`)
  
  console.log(`Pre-rendering ${STATIC_ROUTES.length} static routes...`)
  
  // Render all routes
  for (const routeUrl of STATIC_ROUTES) {
    try {
      const appHtml = render(routeUrl)
      const html = template.replace('<!--app-html-->', appHtml)
      const filePath = routeUrl === '/' ? 'dist/index.html' : `dist${routeUrl}.html`
      ensureDir(toAbsolute(filePath))
      fs.writeFileSync(toAbsolute(filePath), html)
      console.log(`✓ ${routeUrl}`)
    } catch (error) {
      console.error(`✗ ${routeUrl}: ${error.message}`)
    }
  }
  
  // Generate sitemap
  const sitemap = generateSitemap(STATIC_ROUTES)
  fs.writeFileSync(toAbsolute('dist/sitemap.xml'), sitemap)
  console.log('✓ sitemap.xml')
  
  console.log(`Build complete in ${((Date.now() - buildStart) / 1000).toFixed(1)}s`)
})()
