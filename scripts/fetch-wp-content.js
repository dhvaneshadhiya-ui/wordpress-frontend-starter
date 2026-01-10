/**
 * WordPress Content Fetcher
 * 
 * Fetches all content from WordPress and saves to src/data/*.json
 * Run via GitHub Action (daily/webhook) or manually: node scripts/fetch-wp-content.js
 * 
 * This enables fast SSG builds by using cached JSON instead of live API calls
 */

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, '..', p)

// Configuration
const WP_API_URL = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2'
const API_TIMEOUT = 60000
const POSTS_PER_PAGE = 50
const REQUEST_DELAY = 300

console.log(`[WP-Fetch] Starting WordPress content fetch...`)
console.log(`[WP-Fetch] API URL: ${WP_API_URL}`)

// Fetch with timeout and JSON extraction
async function fetchWithTimeout(url, timeout = API_TIMEOUT) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      // Extract JSON from malformed WordPress response
      const jsonMatch = text.match(/\[[\s\S]*\]$/) || text.match(/\{[\s\S]*\}$/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
      throw new Error(`Invalid JSON: ${text.substring(0, 100)}`)
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Fetch all items with pagination
async function fetchAllPaginated(endpoint, perPage = POSTS_PER_PAGE) {
  const items = []
  let page = 1
  let hasMore = true
  
  while (hasMore) {
    try {
      const url = `${WP_API_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}`
      const data = await fetchWithTimeout(url)
      items.push(...data)
      hasMore = data.length === perPage
      page++
      
      if (hasMore) await new Promise(r => setTimeout(r, REQUEST_DELAY))
    } catch (error) {
      console.warn(`[WP-Fetch] Error fetching ${endpoint} page ${page}: ${error.message}`)
      hasMore = false
    }
  }
  
  return items
}

// Main fetch function
async function fetchAllContent() {
  const startTime = Date.now()
  const results = {
    posts: [],
    categories: [],
    tags: [],
    authors: [],
    pages: [],
    media: new Map()
  }
  
  try {
    // 1. Fetch all posts (without _embed)
    console.log('[WP-Fetch] Fetching posts...')
    results.posts = await fetchAllPaginated('posts')
    console.log(`[WP-Fetch] ✓ Fetched ${results.posts.length} posts`)
    
    // 2. Fetch all categories
    console.log('[WP-Fetch] Fetching categories...')
    results.categories = await fetchAllPaginated('categories')
    console.log(`[WP-Fetch] ✓ Fetched ${results.categories.length} categories`)
    
    // 3. Fetch all tags
    console.log('[WP-Fetch] Fetching tags...')
    results.tags = await fetchAllPaginated('tags')
    console.log(`[WP-Fetch] ✓ Fetched ${results.tags.length} tags`)
    
    // 4. Fetch all authors
    console.log('[WP-Fetch] Fetching authors...')
    results.authors = await fetchAllPaginated('users')
    console.log(`[WP-Fetch] ✓ Fetched ${results.authors.length} authors`)
    
    // 5. Fetch static pages
    console.log('[WP-Fetch] Fetching static pages...')
    const pageSlugs = ['about', 'contact-us', 'privacy-policy']
    for (const slug of pageSlugs) {
      try {
        const pageData = await fetchWithTimeout(`${WP_API_URL}/pages?slug=${slug}&_embed=true`)
        if (pageData?.[0]) {
          results.pages.push(pageData[0])
          console.log(`[WP-Fetch] ✓ Fetched page: ${slug}`)
        }
      } catch (error) {
        console.warn(`[WP-Fetch] ⚠ Failed to fetch page ${slug}: ${error.message}`)
      }
    }
    
    // 6. Fetch media for posts
    console.log('[WP-Fetch] Fetching featured media...')
    const mediaIds = [...new Set(results.posts.map(p => p.featured_media).filter(Boolean))]
    const mediaBatchSize = 100
    
    for (let i = 0; i < mediaIds.length; i += mediaBatchSize) {
      const batchIds = mediaIds.slice(i, i + mediaBatchSize)
      try {
        const mediaUrl = `${WP_API_URL}/media?include=${batchIds.join(',')}&per_page=${mediaBatchSize}`
        const mediaItems = await fetchWithTimeout(mediaUrl)
        for (const item of mediaItems) {
          results.media.set(item.id, item)
        }
        console.log(`[WP-Fetch] ✓ Fetched media batch ${Math.floor(i / mediaBatchSize) + 1}: ${mediaItems.length} items`)
        await new Promise(r => setTimeout(r, REQUEST_DELAY))
      } catch (error) {
        console.warn(`[WP-Fetch] ⚠ Failed to fetch media batch: ${error.message}`)
      }
    }
    
    // 7. Build embedded data structure for posts
    console.log('[WP-Fetch] Building embedded data...')
    const categoryMap = new Map(results.categories.map(c => [c.id, c]))
    const tagMap = new Map(results.tags.map(t => [t.id, t]))
    const authorMap = new Map(results.authors.map(a => [a.id, a]))
    
    results.posts = results.posts.map(post => {
      const featuredMedia = results.media.get(post.featured_media)
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
    
    console.log(`[WP-Fetch] ✓ Attached embedded data to ${results.posts.length} posts`)
    
  } catch (error) {
    console.error(`[WP-Fetch] ❌ Fatal error: ${error.message}`)
    process.exit(1)
  }
  
  return results
}

// Save content to JSON files
function saveContent(results) {
  const dataDir = toAbsolute('src/data')
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  // Save posts (main content file)
  fs.writeFileSync(
    path.join(dataDir, 'posts.json'),
    JSON.stringify(results.posts, null, 2)
  )
  console.log(`[WP-Fetch] ✓ Saved ${results.posts.length} posts to posts.json`)
  
  // Save categories
  fs.writeFileSync(
    path.join(dataDir, 'categories.json'),
    JSON.stringify(results.categories, null, 2)
  )
  console.log(`[WP-Fetch] ✓ Saved ${results.categories.length} categories`)
  
  // Save tags
  fs.writeFileSync(
    path.join(dataDir, 'tags.json'),
    JSON.stringify(results.tags, null, 2)
  )
  console.log(`[WP-Fetch] ✓ Saved ${results.tags.length} tags`)
  
  // Save authors
  fs.writeFileSync(
    path.join(dataDir, 'authors.json'),
    JSON.stringify(results.authors, null, 2)
  )
  console.log(`[WP-Fetch] ✓ Saved ${results.authors.length} authors`)
  
  // Save static pages as object keyed by slug
  const pagesObj = {}
  for (const page of results.pages) {
    pagesObj[page.slug] = {
      slug: page.slug,
      title: page.title?.rendered || page.slug,
      content: page.content?.rendered || ''
    }
  }
  fs.writeFileSync(
    path.join(dataDir, 'static-pages.json'),
    JSON.stringify(pagesObj, null, 2)
  )
  console.log(`[WP-Fetch] ✓ Saved ${results.pages.length} static pages`)
  
  // Save fetch metadata
  const metadata = {
    lastFetch: new Date().toISOString(),
    counts: {
      posts: results.posts.length,
      categories: results.categories.length,
      tags: results.tags.length,
      authors: results.authors.length,
      pages: results.pages.length,
      media: results.media.size
    }
  }
  fs.writeFileSync(
    path.join(dataDir, 'fetch-metadata.json'),
    JSON.stringify(metadata, null, 2)
  )
  console.log(`[WP-Fetch] ✓ Saved fetch metadata`)
}

// Main execution
const startTime = Date.now()

fetchAllContent()
  .then(results => {
    saveContent(results)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n[WP-Fetch] ✅ Content fetch complete in ${duration}s`)
    console.log(`[WP-Fetch] Posts: ${results.posts.length}, Categories: ${results.categories.length}, Tags: ${results.tags.length}`)
  })
  .catch(error => {
    console.error(`[WP-Fetch] ❌ Failed: ${error.message}`)
    process.exit(1)
  })
