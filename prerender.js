import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

// WordPress API configuration
const API_BASE = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2'

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
  
  return routes
}

// Ensure directory exists
function ensureDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Main prerender function
;(async () => {
  const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
  const { render } = await import('./dist/server/entry-server.js')
  
  const routes = await getRoutesToPrerender()
  console.log(`Pre-rendering ${routes.length} routes...`)
  
  for (const routeUrl of routes) {
    try {
      const appHtml = render(routeUrl)
      const html = template.replace('<!--app-html-->', appHtml)
      
      // Determine output file path
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
  
  console.log('Pre-rendering complete!')
})()
