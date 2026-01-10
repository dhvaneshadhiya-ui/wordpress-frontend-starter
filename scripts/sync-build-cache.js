/**
 * Build Cache Synchronization Script
 * 
 * Manages HTML file caching between builds to enable partial rebuilds.
 * 
 * Usage:
 *   node scripts/sync-build-cache.js restore  - Copy cached files to dist/ before build
 *   node scripts/sync-build-cache.js save     - Save built files to cache after build
 *   node scripts/sync-build-cache.js clean    - Clear the cache
 */

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, '..', p)

const CACHE_DIR = toAbsolute('.build-cache')
const DIST_DIR = toAbsolute('dist')

/**
 * Recursively copy directory
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return 0
  
  let count = 0
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    
    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath)
    } else if (entry.name.endsWith('.html')) {
      fs.copyFileSync(srcPath, destPath)
      count++
    }
  }
  
  return count
}

/**
 * Restore cached HTML files to dist/ before build starts
 * This allows partial builds to copy unchanged files
 */
function restoreCache() {
  console.log('[Cache] Restoring cached HTML files...')
  
  if (!fs.existsSync(CACHE_DIR)) {
    console.log('[Cache] No cache directory found - starting fresh build')
    return
  }
  
  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true })
  }
  
  const count = copyDirRecursive(CACHE_DIR, DIST_DIR)
  console.log(`[Cache] ✓ Restored ${count} HTML files from cache`)
}

/**
 * Save built files to cache after build completes
 * This populates the cache for the next partial build
 * Includes: HTML files, client bundle (assets/), and root files
 */
function saveCache() {
  console.log('[Cache] Saving build artifacts to cache...')
  
  if (!fs.existsSync(DIST_DIR)) {
    console.warn('[Cache] ⚠ No dist directory found - nothing to cache')
    return
  }
  
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
  
  // 1. Save HTML files (for partial content rebuilds)
  const htmlCount = copyDirRecursive(DIST_DIR, CACHE_DIR)
  console.log(`[Cache] ✓ Saved ${htmlCount} HTML files`)
  
  // 2. Save client bundle assets (for skipping Vite build on partial)
  const assetsDir = path.join(DIST_DIR, 'assets')
  const cacheAssetsDir = path.join(CACHE_DIR, 'assets')
  
  if (fs.existsSync(assetsDir)) {
    // Clear old assets first
    if (fs.existsSync(cacheAssetsDir)) {
      fs.rmSync(cacheAssetsDir, { recursive: true, force: true })
    }
    fs.cpSync(assetsDir, cacheAssetsDir, { recursive: true })
    const assetCount = fs.readdirSync(assetsDir).length
    console.log(`[Cache] ✓ Saved ${assetCount} client bundle assets`)
  }
  
  // 3. Save root files needed for client bundle
  const rootFiles = ['index.html', 'favicon.ico', 'logo.png']
  let rootCount = 0
  for (const file of rootFiles) {
    const srcFile = path.join(DIST_DIR, file)
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(CACHE_DIR, file))
      rootCount++
    }
  }
  console.log(`[Cache] ✓ Saved ${rootCount} root files`)
}

/**
 * Clear the build cache
 */
function cleanCache() {
  console.log('[Cache] Clearing build cache...')
  
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true })
    console.log('[Cache] ✓ Cache cleared')
  } else {
    console.log('[Cache] No cache to clear')
  }
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  if (!fs.existsSync(CACHE_DIR)) {
    return { exists: false, htmlCount: 0, assetCount: 0, sizeBytes: 0 }
  }
  
  let htmlCount = 0
  let assetCount = 0
  let sizeBytes = 0
  
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else {
        sizeBytes += fs.statSync(fullPath).size
        if (entry.name.endsWith('.html')) {
          htmlCount++
        } else if (dir.includes('assets')) {
          assetCount++
        }
      }
    }
  }
  
  walkDir(CACHE_DIR)
  
  return { exists: true, htmlCount, assetCount, sizeBytes }
}

// Main execution
const command = process.argv[2]

switch (command) {
  case 'restore':
    restoreCache()
    break
  case 'save':
    saveCache()
    break
  case 'clean':
    cleanCache()
    break
  case 'stats':
    const stats = getCacheStats()
    if (stats.exists) {
      console.log(`[Cache] HTML: ${stats.htmlCount}, Assets: ${stats.assetCount}, Size: ${(stats.sizeBytes / 1024 / 1024).toFixed(2)} MB`)
    } else {
      console.log('[Cache] No cache exists')
    }
    break
  default:
    console.log('Usage: node scripts/sync-build-cache.js [restore|save|clean|stats]')
    process.exit(1)
}
