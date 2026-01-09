// Generate robots.txt for production/staging environments
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const enableIndexing = process.env.VITE_ENABLE_INDEXING === 'true'
const siteUrl = process.env.SITE_URL || 'https://wp.dev.igeeksblog.com'

const stagingRobots = `# Staging - Block all crawlers
User-agent: *
Disallow: /
`

const productionRobots = `# Production robots.txt - iGeeksBlog
User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml

# AI Search Engines - Allow for GEO citations
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: Amazonbot
Allow: /

# Block AI Training Crawlers (preserve content ownership)
User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /
`

const content = enableIndexing ? productionRobots : stagingRobots
const outputPath = path.resolve(__dirname, '../dist/robots.txt')

// Ensure dist directory exists
const distDir = path.dirname(outputPath)
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

fs.writeFileSync(outputPath, content)
console.log(`✓ Generated robots.txt for ${enableIndexing ? 'PRODUCTION' : 'STAGING'} environment`)
