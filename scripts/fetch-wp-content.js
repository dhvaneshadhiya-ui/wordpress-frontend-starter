import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  createBuildMetrics,
  recordTiming,
  recordStat,
  finalizeBuildMetrics,
  saveBuildMetrics,
  printMetricsSummary
} from './build-metrics.js';

const WORDPRESS_API = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2';
const OUTPUT_DIR = './src/data';
const CACHE_DIR = './.build-cache';
const FETCH_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const INCREMENTAL_MODE = process.env.INCREMENTAL_BUILD !== 'false';

// ============= Caching Utilities =============

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCacheData() {
  const cachePath = path.join(CACHE_DIR, 'content-cache.json');
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch {
      return { posts: {}, lastFetch: null, etags: {} };
    }
  }
  return { posts: {}, lastFetch: null, etags: {} };
}

function saveCacheData(cache) {
  ensureCacheDir();
  fs.writeFileSync(
    path.join(CACHE_DIR, 'content-cache.json'),
    JSON.stringify(cache, null, 2)
  );
}

function getContentHash(content) {
  return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
}

// ============= Fetch Utilities =============

async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Connection': 'keep-alive',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);
      
      if ([502, 503, 504].includes(response.status)) {
        if (attempt === retries) {
          throw new Error(`Server error after ${retries} attempts: ${response.status}`);
        }
        const delay = Math.pow(2, attempt) * 4000; // 4s, 8s, 16s for gateway errors
        console.log(`  ⚠️ Server error ${response.status}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (attempt === retries) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout}ms: ${url}`);
        }
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 2000; // 2s, 4s for other errors
      console.log(`  ⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function testApiConnection() {
  console.log('🔌 Testing API connection...');
  const response = await fetchWithTimeout(`${WORDPRESS_API}/posts?per_page=1`);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }
  console.log(`✅ API connection successful!`);
  return true;
}

// ============= Media Fetching =============

async function fetchMedia(mediaId) {
  if (!mediaId) return null;
  try {
    const response = await fetchWithTimeout(`${WORDPRESS_API}/media/${mediaId}`, 15000, 2);
    if (!response.ok) return null;
    const media = await response.json();
    return media.source_url || media.media_details?.sizes?.full?.source_url || null;
  } catch {
    return null;
  }
}

async function fetchMediaBatch(mediaIds) {
  const uniqueIds = [...new Set(mediaIds.filter(id => id))];
  if (uniqueIds.length === 0) return {};
  
  console.log(`  📷 Fetching ${uniqueIds.length} featured images (parallel batches)...`);
  
  const mediaMap = {};
  const BATCH_SIZE = 20; // Increased parallelism
  
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(id => fetchMedia(id)));
    
    batch.forEach((id, index) => {
      mediaMap[id] = results[index];
    });
    
    // Minimal delay between batches
    if (i + BATCH_SIZE < uniqueIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return mediaMap;
}

// ============= Incremental Post Fetching =============

async function fetchModifiedPostsSince(lastModified) {
  if (!lastModified) {
    console.log('  📥 No cache found, fetching all posts...');
    return { posts: await fetchAllPosts(), isFullFetch: true };
  }

  console.log(`  🔍 Checking for posts modified since ${lastModified}...`);
  
  try {
    // Fetch posts modified after our last fetch
    const modifiedAfter = new Date(lastModified).toISOString();
    const response = await fetchWithTimeout(
      `${WORDPRESS_API}/posts?per_page=100&modified_after=${modifiedAfter}&orderby=modified&order=desc`
    );
    
    if (!response.ok) {
      console.log('  ⚠️ Modified posts query failed, falling back to full fetch');
      return { posts: await fetchAllPosts(), isFullFetch: true };
    }
    
    const modifiedPosts = await response.json();
    const totalModified = parseInt(response.headers.get('X-WP-Total') || '0');
    
    if (modifiedPosts.length === 0) {
      console.log('  ✨ No posts modified since last fetch!');
      return { posts: [], isFullFetch: false, noChanges: true };
    }
    
    console.log(`  📝 Found ${totalModified} modified posts`);
    return { posts: modifiedPosts, isFullFetch: false };
  } catch (error) {
    console.log(`  ⚠️ Incremental fetch failed: ${error.message}, falling back to full fetch`);
    return { posts: await fetchAllPosts(), isFullFetch: true };
  }
}

async function checkServerHealth() {
  try {
    const response = await fetchWithTimeout(`${WORDPRESS_API}/posts?per_page=1`, 10000, 1);
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchAllPosts() {
  let allPosts = [];
  let page = 1;
  let hasMore = true;
  let consecutiveSlowRequests = 0;
  let consecutiveFailures = 0;
  
  const CHECKPOINT_FILE = path.join(CACHE_DIR, 'fetch-checkpoint.json');
  const POSTS_PER_PAGE = 50; // Reduced from 100 for server reliability
  const CHECKPOINT_INTERVAL = 3; // Save progress every 3 pages
  const REQUEST_TIMEOUT = 30000; // 30s timeout
  const SLOW_REQUEST_THRESHOLD = 20000; // 20s = slow request

  // Load checkpoint if exists
  ensureCacheDir();
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
      if (Date.now() - checkpoint.timestamp < 600000) { // Valid for 10 minutes
        allPosts = checkpoint.posts;
        page = checkpoint.nextPage;
        console.log(`  🔄 Resuming from checkpoint: page ${page}, ${allPosts.length} posts loaded`);
      }
    } catch {}
  }

  while (hasMore) {
    // After 2 consecutive failures, wait 30s for server recovery
    if (consecutiveFailures >= 2) {
      console.log(`  🚨 Multiple failures detected, waiting 30s for server recovery...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
      consecutiveFailures = 0;
    }

    // Health check every 5 pages or after slow requests
    if (page > 1 && (page % 5 === 1 || consecutiveSlowRequests >= 2)) {
      console.log(`  🏥 Checking server health...`);
      const isHealthy = await checkServerHealth();
      if (!isHealthy) {
        console.log(`  ⚠️ Server stressed, waiting 15s before continuing...`);
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
      consecutiveSlowRequests = 0;
    }

    console.log(`  Fetching posts page ${page}...`);
    const requestStart = Date.now();
    
    try {
      const response = await fetchWithTimeout(
        `${WORDPRESS_API}/posts?page=${page}&per_page=${POSTS_PER_PAGE}`,
        REQUEST_TIMEOUT,
        3
      );
      
      const requestDuration = Date.now() - requestStart;
      
      if (!response.ok) {
        if (response.status === 400) break;
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const posts = await response.json();
      if (posts.length === 0) break;
      
      allPosts = [...allPosts, ...posts];
      consecutiveFailures = 0;
      
      // Track slow requests for adaptive throttling
      if (requestDuration > SLOW_REQUEST_THRESHOLD) {
        consecutiveSlowRequests++;
        console.log(`  ⏱️ Slow request: ${Math.round(requestDuration / 1000)}s`);
      } else {
        consecutiveSlowRequests = Math.max(0, consecutiveSlowRequests - 1);
      }
      
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;
      
      // Save checkpoint every 3 pages
      if (page % CHECKPOINT_INTERVAL === 0) {
        fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({
          posts: allPosts,
          nextPage: page,
          timestamp: Date.now()
        }));
        console.log(`  💾 Checkpoint saved: ${allPosts.length} posts`);
      }
      
      if (hasMore) {
        // Adaptive delay based on request speed
        let delay = 1000; // Base delay 1s
        if (requestDuration > SLOW_REQUEST_THRESHOLD) {
          delay = 2500; // Slow down if server is struggling
        } else if (consecutiveSlowRequests > 0) {
          delay = 1500; // Slightly slower after slow requests
        }
        // Progressive increase for later pages
        if (page > 15) {
          delay += (page - 15) * 100;
        }
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 4000)));
      }
    } catch (error) {
      consecutiveFailures++;
      throw error;
    }
  }

  // Clean up checkpoint on successful completion
  if (fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
  }

  console.log(`  ✅ Fetched ${allPosts.length} posts total`);
  return allPosts;
}

// ============= Parallel Category/Tag/Author Fetching =============

async function fetchAllCategories() {
  const response = await fetchWithTimeout(`${WORDPRESS_API}/categories?per_page=100`);
  if (!response.ok) throw new Error(`Failed to fetch categories: ${response.statusText}`);
  return response.json();
}

async function fetchAllTags() {
  const response = await fetchWithTimeout(`${WORDPRESS_API}/tags?per_page=100`);
  if (!response.ok) throw new Error(`Failed to fetch tags: ${response.statusText}`);
  return response.json();
}

async function fetchAllAuthors() {
  try {
    const response = await fetchWithTimeout(`${WORDPRESS_API}/users?per_page=100`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

// ============= Main Fetch Function =============

async function fetchWordPressContent() {
  const metrics = createBuildMetrics('content-fetch');
  
  try {
    console.log('🚀 Fetching WordPress content...');
    console.log(`📡 API URL: ${WORDPRESS_API}`);
    console.log(`🔄 Incremental mode: ${INCREMENTAL_MODE ? 'enabled' : 'disabled'}`);
    
    const apiTestStart = Date.now();
    await testApiConnection();
    recordTiming(metrics, 'API Connection Test', apiTestStart);
    
    // Ensure directories exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    ensureCacheDir();

    // Load cache for incremental builds
    const cache = INCREMENTAL_MODE ? getCacheData() : { posts: {}, lastFetch: null };

    // Fetch taxonomy data in parallel (these rarely change)
    console.log('📂 Fetching taxonomies in parallel...');
    const taxonomyStart = Date.now();
    const [categories, tags, authors] = await Promise.all([
      fetchAllCategories(),
      fetchAllTags(),
      fetchAllAuthors()
    ]);
    recordTiming(metrics, 'Taxonomy Fetch', taxonomyStart);
    recordStat(metrics, 'categories', categories.length);
    recordStat(metrics, 'tags', tags.length);
    recordStat(metrics, 'authors', authors.length);
    console.log(`  ✅ Categories: ${categories.length}, Tags: ${tags.length}, Authors: ${authors.length}`);

    // Create lookup maps
    const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));
    const tagMap = Object.fromEntries(tags.map(t => [t.id, t]));

    // Incremental post fetching
    let allPosts;
    let postsNeedProcessing;
    
    const postFetchStart = Date.now();
    if (INCREMENTAL_MODE && cache.lastFetch) {
      const { posts: modifiedPosts, isFullFetch, noChanges } = await fetchModifiedPostsSince(cache.lastFetch);
      
      if (noChanges) {
        // Use cached posts, just update taxonomies
        console.log('  📦 Using cached posts data');
        allPosts = Object.values(cache.posts);
        postsNeedProcessing = [];
        recordStat(metrics, 'fetchType', 'cached');
      } else if (isFullFetch) {
        allPosts = modifiedPosts;
        postsNeedProcessing = modifiedPosts;
        recordStat(metrics, 'fetchType', 'full');
      } else {
        // Merge modified posts with cache
        const cachedPosts = { ...cache.posts };
        for (const post of modifiedPosts) {
          cachedPosts[post.id] = post;
        }
        allPosts = Object.values(cachedPosts);
        postsNeedProcessing = modifiedPosts;
        recordStat(metrics, 'fetchType', 'incremental');
      }
    } else {
      allPosts = await fetchAllPosts();
      postsNeedProcessing = allPosts;
      recordStat(metrics, 'fetchType', 'full');
    }
    recordTiming(metrics, 'Post Fetch', postFetchStart);
    recordStat(metrics, 'totalPosts', allPosts.length);
    recordStat(metrics, 'postsModified', postsNeedProcessing.length);
    
    console.log(`📦 Total posts: ${allPosts.length}, Need processing: ${postsNeedProcessing.length}`);

    // Batch fetch featured media only for posts that need processing
    const mediaFetchStart = Date.now();
    const mediaIds = postsNeedProcessing.map(post => post.featured_media);
    const mediaMap = await fetchMediaBatch(mediaIds);
    recordTiming(metrics, 'Media Fetch', mediaFetchStart);
    recordStat(metrics, 'mediaFetched', Object.keys(mediaMap).length);

    // Process posts
    const processPost = (post, existingProcessed = null) => {
      // If already processed and not in new batch, keep existing
      if (existingProcessed && !postsNeedProcessing.find(p => p.id === post.id)) {
        return existingProcessed;
      }

      const aioseoJson = post.aioseo_head_json || {};
      const yoastJson = post.yoast_head_json || {};
      const featuredImage = mediaMap[post.featured_media] || null;
      const author = authorMap[post.author] || null;
      
      const postCategories = (post.categories || [])
        .map(catId => categoryMap[catId])
        .filter(Boolean);
      
      const postTags = (post.tags || [])
        .map(tagId => tagMap[tagId])
        .filter(Boolean);

      const seo = {
        title: aioseoJson.title || yoastJson.title || post.title?.rendered || '',
        description: aioseoJson.description || yoastJson.description || stripHtml(post.excerpt?.rendered || '').substring(0, 160),
        ogTitle: aioseoJson.og_title || yoastJson.og_title || post.title?.rendered || '',
        ogDescription: aioseoJson.og_description || yoastJson.og_description || stripHtml(post.excerpt?.rendered || '').substring(0, 160),
        ogImage: aioseoJson.og_image?.url || yoastJson.og_image?.[0]?.url || featuredImage,
        twitterTitle: aioseoJson.twitter_title || yoastJson.twitter_title || post.title?.rendered || '',
        twitterDescription: aioseoJson.twitter_description || yoastJson.twitter_description || stripHtml(post.excerpt?.rendered || '').substring(0, 160),
        twitterImage: aioseoJson.twitter_image?.url || yoastJson.twitter_image || featuredImage,
        canonical: aioseoJson.canonical_url || yoastJson.canonical || `https://dev.igeeksblog.com/${post.slug}`,
        publishedTime: post.date,
        modifiedTime: post.modified,
        author: author?.name || 'iGeeksBlog',
        authorSlug: author?.slug || '',
        image: featuredImage
      };

      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        date: post.date,
        modified: post.modified,
        featuredImage,
        author: author ? {
          id: author.id,
          name: author.name,
          slug: author.slug,
          avatar: author.avatar_urls?.['96'] || author.avatar_urls?.['48']
        } : null,
        categories: postCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug
        })),
        tags: postTags.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        })),
        seo
      };
    };

    // Load existing processed posts for incremental merge
    let existingProcessedMap = {};
    const existingPostsPath = path.join(OUTPUT_DIR, 'posts.json');
    if (INCREMENTAL_MODE && fs.existsSync(existingPostsPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(existingPostsPath, 'utf8'));
        existingProcessedMap = Object.fromEntries(existing.map(p => [p.id, p]));
      } catch {}
    }

    // Process all posts
    const postsWithMeta = allPosts.map(post => 
      processPost(post, existingProcessedMap[post.id])
    );

    // Sort by date (newest first)
    postsWithMeta.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Save all data files in parallel
    console.log('💾 Saving data files...');
    
    const saveOperations = [
      {
        file: 'posts.json',
        data: postsWithMeta
      },
      {
        file: 'categories.json',
        data: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          count: cat.count,
          seo: {
            title: cat.aioseo_head_json?.title || `${cat.name} - iGeeksBlog`,
            description: cat.aioseo_head_json?.description || cat.description || `Browse all ${cat.name} articles`
          }
        }))
      },
      {
        file: 'tags.json',
        data: tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          count: tag.count
        }))
      },
      {
        file: 'authors.json',
        data: authors.map(author => ({
          id: author.id,
          name: author.name,
          slug: author.slug,
          description: author.description,
          avatar: author.avatar_urls?.['96'] || author.avatar_urls?.['48']
        }))
      },
      {
        file: 'routes.json',
        data: [
          { path: '/', type: 'home' },
          ...postsWithMeta.map(post => ({
            path: `/${post.slug}`,
            type: 'post',
            id: post.id,
            slug: post.slug
          })),
          ...categories.map(cat => ({
            path: `/category/${cat.slug}`,
            type: 'category',
            id: cat.id,
            slug: cat.slug
          })),
          ...tags.map(tag => ({
            path: `/tag/${tag.slug}`,
            type: 'tag',
            id: tag.id,
            slug: tag.slug
          })),
          ...authors.map(author => ({
            path: `/author/${author.slug}`,
            type: 'author',
            id: author.id,
            slug: author.slug
          }))
        ]
      }
    ];

    for (const { file, data } of saveOperations) {
      fs.writeFileSync(path.join(OUTPUT_DIR, file), JSON.stringify(data, null, 2));
      console.log(`  ✅ Saved ${file}`);
    }

    // Update cache
    const newCache = {
      posts: Object.fromEntries(allPosts.map(p => [p.id, p])),
      lastFetch: new Date().toISOString(),
      contentHash: getContentHash(postsWithMeta)
    };
    saveCacheData(newCache);
    console.log('  ✅ Updated build cache');

    // Finalize and save metrics
    finalizeBuildMetrics(metrics);
    const allMetrics = saveBuildMetrics(metrics);
    
    console.log(`\n🎉 WordPress content fetch complete!`);
    printMetricsSummary(metrics, allMetrics);
    
  } catch (error) {
    console.error('❌ Error fetching WordPress content:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

fetchWordPressContent();
