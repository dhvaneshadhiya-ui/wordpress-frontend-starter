/**
 * WordPress Content Fetcher
 * 
 * Fetches all content from WordPress and saves to src/data/*.json
 * Run via GitHub Action (daily/webhook) or manually: node scripts/fetch-wp-content.js
 * 
 * This enables fast SSG builds by using cached JSON instead of live API calls
 * 
 * NEW: Generates build-manifest.json with content hashes for partial rebuilds
 */

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, '..', p)

// Configuration
const WP_API_URL = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2'
const API_TIMEOUT = 60000
const POSTS_PER_PAGE = 50
const REQUEST_DELAY = 300

// Chunking configuration - keeps each file under ~30MB for GitHub
const POSTS_PER_CHUNK = 200

// Manifest configuration - MUST match CACHE_VERSION in prerender.js
const MANIFEST_VERSION = 2
const MAX_CHANGED_ROUTES_FOR_PARTIAL = 50  // Force full rebuild if more than this

console.log(`[WP-Fetch] Starting WordPress content fetch...`)
console.log(`[WP-Fetch] API URL: ${WP_API_URL}`)

// ============================================
// CONTENT HASHING FOR CHANGE DETECTION
// ============================================

/**
 * Generate a deterministic hash for content
 */
function generateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 12)
}

/**
 * Generate hash for a post based on key fields
 */
function generatePostHash(post) {
  const hashContent = [
    post.title?.rendered || '',
    post.content?.rendered || '',
    post.modified || post.date || '',
    String(post.featured_media || ''),
    JSON.stringify(post.categories || []),
    JSON.stringify(post.tags || []),
    String(post.author || '')
  ].join('|')
  return generateHash(hashContent)
}

/**
 * Generate hash for a category
 */
function generateCategoryHash(category) {
  const hashContent = [
    category.name || '',
    category.description || '',
    String(category.count || 0)
  ].join('|')
  return generateHash(hashContent)
}

/**
 * Generate hash for a tag
 */
function generateTagHash(tag) {
  const hashContent = [
    tag.name || '',
    tag.description || '',
    String(tag.count || 0)
  ].join('|')
  return generateHash(hashContent)
}

/**
 * Generate hash for an author
 */
function generateAuthorHash(author) {
  const hashContent = [
    author.name || '',
    author.description || '',
    JSON.stringify(author.avatar_urls || {})
  ].join('|')
  return generateHash(hashContent)
}

/**
 * Load previous build manifest
 */
function loadPreviousManifest() {
  const manifestPath = toAbsolute('src/data/build-manifest.json')
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      if (manifest.version === MANIFEST_VERSION) {
        console.log(`[WP-Fetch] ✓ Loaded previous manifest (${Object.keys(manifest.contentHashes?.posts || {}).length} posts tracked)`)
        return manifest
      }
      console.log(`[WP-Fetch] ⚠ Manifest version mismatch (${manifest.version} vs ${MANIFEST_VERSION}) - will do full rebuild`)
    } catch (e) {
      console.warn(`[WP-Fetch] ⚠ Could not parse previous manifest: ${e.message}`)
    }
  }
  return null
}

/**
 * Detect changed routes by comparing hashes
 */
function detectChangedRoutes(results, previousManifest) {
  const changedRoutes = new Set()
  const newHashes = {
    posts: {},
    categories: {},
    tags: {},
    authors: {}
  }
  
  const prevHashes = previousManifest?.contentHashes || { posts: {}, categories: {}, tags: {}, authors: {} }
  
  // Check posts
  for (const post of results.posts) {
    const slug = post.slug
    const hash = generatePostHash(post)
    newHashes.posts[slug] = hash
    
    if (prevHashes.posts[slug] !== hash) {
      // Post is new or modified
      changedRoutes.add(`/${slug}`)
      
      // Also mark affected archives
      const categories = post._embedded?.['wp:term']?.[0] || []
      const tags = post._embedded?.['wp:term']?.[1] || []
      const author = post._embedded?.['author']?.[0]
      
      for (const cat of categories) {
        changedRoutes.add(`/category/${cat.slug}`)
      }
      for (const tag of tags) {
        changedRoutes.add(`/tag/${tag.slug}`)
      }
      if (author?.slug) {
        changedRoutes.add(`/author/${author.slug}`)
      }
    }
  }
  
  // Check if any posts were deleted (existed before, not now)
  for (const slug of Object.keys(prevHashes.posts)) {
    if (!newHashes.posts[slug]) {
      // Post was deleted - need to rebuild archives that might have referenced it
      changedRoutes.add('/') // Homepage might need update
      console.log(`[WP-Fetch] Post deleted: ${slug}`)
    }
  }
  
  // Check categories
  for (const category of results.categories) {
    const slug = category.slug
    const hash = generateCategoryHash(category)
    newHashes.categories[slug] = hash
    
    if (prevHashes.categories[slug] !== hash) {
      changedRoutes.add(`/category/${slug}`)
    }
  }
  
  // Check tags
  for (const tag of results.tags) {
    const slug = tag.slug
    const hash = generateTagHash(tag)
    newHashes.tags[slug] = hash
    
    if (prevHashes.tags[slug] !== hash) {
      changedRoutes.add(`/tag/${slug}`)
    }
  }
  
  // Check authors
  for (const author of results.authors) {
    const slug = author.slug
    const hash = generateAuthorHash(author)
    newHashes.authors[slug] = hash
    
    if (prevHashes.authors[slug] !== hash) {
      changedRoutes.add(`/author/${slug}`)
    }
  }
  
  // Always check if homepage needs update (if any post in top 20 changed)
  const top20Posts = results.posts.slice(0, 20)
  for (const post of top20Posts) {
    if (prevHashes.posts[post.slug] !== newHashes.posts[post.slug]) {
      changedRoutes.add('/')
      break
    }
  }
  
  // If no previous manifest, all routes are "changed" (first build)
  if (!previousManifest) {
    console.log(`[WP-Fetch] No previous manifest - marking all routes as changed`)
    // Don't populate changedRoutes - let it stay empty which means "no partial build"
    return { changedRoutes: [], newHashes, fullRebuildRequired: true }
  }
  
  const changedArray = Array.from(changedRoutes)
  const fullRebuildRequired = changedArray.length > MAX_CHANGED_ROUTES_FOR_PARTIAL
  
  if (fullRebuildRequired) {
    console.log(`[WP-Fetch] ⚠ ${changedArray.length} routes changed (>${MAX_CHANGED_ROUTES_FOR_PARTIAL}) - full rebuild required`)
  }
  
  return { changedRoutes: changedArray, newHashes, fullRebuildRequired }
}

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
function saveContent(results, changeInfo) {
  const dataDir = toAbsolute('src/data')
  const postsDir = path.join(dataDir, 'posts')
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  // Create posts directory for chunks
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true })
  }
  
  // Clean up old chunk files
  try {
    const existingChunks = fs.readdirSync(postsDir).filter(f => f.startsWith('chunk-'))
    for (const chunk of existingChunks) {
      fs.unlinkSync(path.join(postsDir, chunk))
    }
    console.log(`[WP-Fetch] Cleaned up ${existingChunks.length} old chunk files`)
  } catch (e) {
    // Directory might be empty or not exist yet
  }
  
  // Split posts into chunks and save (no pretty-print to save space)
  const chunks = []
  for (let i = 0; i < results.posts.length; i += POSTS_PER_CHUNK) {
    const chunkIndex = Math.floor(i / POSTS_PER_CHUNK)
    const chunkPosts = results.posts.slice(i, i + POSTS_PER_CHUNK)
    const filename = `chunk-${chunkIndex}.json`
    
    fs.writeFileSync(
      path.join(postsDir, filename),
      JSON.stringify(chunkPosts)  // Minified JSON to reduce size
    )
    
    const fileSize = (fs.statSync(path.join(postsDir, filename)).size / (1024 * 1024)).toFixed(2)
    chunks.push({ filename, postCount: chunkPosts.length, sizeMB: parseFloat(fileSize) })
  }
  
  // Save manifest with chunk info
  const postsIndex = { 
    chunks: chunks.map(c => c.filename), 
    totalPosts: results.posts.length,
    postsPerChunk: POSTS_PER_CHUNK,
    chunkDetails: chunks
  }
  fs.writeFileSync(
    path.join(postsDir, 'index.json'),
    JSON.stringify(postsIndex, null, 2)
  )
  
  console.log(`[WP-Fetch] ✓ Saved ${results.posts.length} posts in ${chunks.length} chunks:`)
  for (const chunk of chunks) {
    console.log(`[WP-Fetch]   - ${chunk.filename}: ${chunk.postCount} posts (${chunk.sizeMB} MB)`)
  }
  
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
  
  // Save build manifest for partial rebuilds
  const manifest = {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    contentHashes: changeInfo.newHashes,
    changedRoutes: changeInfo.changedRoutes,
    changedCount: changeInfo.changedRoutes.length,
    totalPosts: results.posts.length,
    totalCategories: results.categories.length,
    totalTags: results.tags.length,
    totalAuthors: results.authors.length,
    fullRebuildRequired: changeInfo.fullRebuildRequired
  }
  fs.writeFileSync(
    path.join(dataDir, 'build-manifest.json'),
    JSON.stringify(manifest, null, 2)
  )
  console.log(`[WP-Fetch] ✓ Saved build manifest (${changeInfo.changedRoutes.length} changed routes)`)
}

// Main execution
const startTime = Date.now()

// Load previous manifest for change detection
const previousManifest = loadPreviousManifest()

fetchAllContent()
  .then(results => {
    // Detect changes
    const changeInfo = detectChangedRoutes(results, previousManifest)
    
    // Save content and manifest
    saveContent(results, changeInfo)
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n[WP-Fetch] ✅ Content fetch complete in ${duration}s`)
    console.log(`[WP-Fetch] Posts: ${results.posts.length}, Categories: ${results.categories.length}, Tags: ${results.tags.length}`)
    console.log(`[WP-Fetch] Changed routes: ${changeInfo.changedRoutes.length}${changeInfo.fullRebuildRequired ? ' (full rebuild required)' : ''}`)
    
    // Log some changed routes for visibility
    if (changeInfo.changedRoutes.length > 0 && changeInfo.changedRoutes.length <= 10) {
      console.log(`[WP-Fetch] Changed: ${changeInfo.changedRoutes.join(', ')}`)
    } else if (changeInfo.changedRoutes.length > 10) {
      console.log(`[WP-Fetch] Changed (first 10): ${changeInfo.changedRoutes.slice(0, 10).join(', ')}...`)
    }
  })
  .catch(error => {
    console.error(`[WP-Fetch] ❌ Failed: ${error.message}`)
    process.exit(1)
  })
