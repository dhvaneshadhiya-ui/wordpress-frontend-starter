import fs from 'fs';
import path from 'path';

const WORDPRESS_API = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2';
const OUTPUT_DIR = './src/data';
const FETCH_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

// Fetch with timeout and retry wrapper
async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      // Retry on gateway errors (502, 503, 504)
      if ([502, 503, 504].includes(response.status)) {
        if (attempt === retries) {
          throw new Error(`Server error after ${retries} attempts: ${response.status} ${response.statusText}`);
        }
        const delay = Math.pow(2, attempt) * 2000; // Longer delay for server errors
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
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`  ⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Test API connectivity before proceeding
async function testApiConnection() {
  console.log('🔌 Testing API connection...');
  try {
    const response = await fetchWithTimeout(`${WORDPRESS_API}/posts?per_page=1`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`✅ API connection successful! Found posts endpoint.`);
    return true;
  } catch (error) {
    console.error(`❌ API connection failed: ${error.message}`);
    throw error; // Re-throw to fail the build
  }
}

// Fetch a single media item by ID
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

// Batch fetch media for multiple posts
async function fetchMediaBatch(mediaIds) {
  const uniqueIds = [...new Set(mediaIds.filter(id => id))];
  if (uniqueIds.length === 0) return {};
  
  console.log(`  📷 Fetching ${uniqueIds.length} featured images...`);
  
  const mediaMap = {};
  
  // Fetch in batches of 10 to avoid overwhelming the server
  for (let i = 0; i < uniqueIds.length; i += 10) {
    const batch = uniqueIds.slice(i, i + 10);
    const results = await Promise.all(batch.map(id => fetchMedia(id)));
    
    batch.forEach((id, index) => {
      mediaMap[id] = results[index];
    });
    
    // Small delay between batches
    if (i + 10 < uniqueIds.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return mediaMap;
}

async function fetchWordPressContent() {
  try {
    console.log('🚀 Fetching WordPress content...');
    console.log(`📡 API URL: ${WORDPRESS_API}`);
    
    // Test API first
    await testApiConnection();
    
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
    }

    // Fetch categories, tags, and authors FIRST (these are lightweight)
    const categories = await fetchAllCategories();
    console.log(`📂 Fetched ${categories.length} categories`);

    const tags = await fetchAllTags();
    console.log(`🏷️ Fetched ${tags.length} tags`);

    const authors = await fetchAllAuthors();
    console.log(`👤 Fetched ${authors.length} authors`);

    // Create lookup maps for efficient joining
    const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));
    const tagMap = Object.fromEntries(tags.map(t => [t.id, t]));

    // Fetch posts WITHOUT _embed (much faster!)
    const posts = await fetchAllPosts();
    console.log(`📦 Fetched ${posts.length} posts`);

    // Batch fetch all featured media
    const mediaIds = posts.map(post => post.featured_media);
    const mediaMap = await fetchMediaBatch(mediaIds);

    // Process posts with SEO metadata using lookup maps
    const postsWithMeta = posts.map((post) => {
      const aioseoJson = post.aioseo_head_json || {};
      const yoastJson = post.yoast_head_json || {};
      
      // Get featured image from our fetched media
      const featuredImage = mediaMap[post.featured_media] || null;
      
      // Get author from lookup map
      const author = authorMap[post.author] || null;
      
      // Get categories from lookup map
      const postCategories = (post.categories || [])
        .map(catId => categoryMap[catId])
        .filter(Boolean);
      
      // Get tags from lookup map
      const postTags = (post.tags || [])
        .map(tagId => tagMap[tagId])
        .filter(Boolean);

      // Build SEO data with fallbacks
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
    });

    // Save posts data
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'posts.json'),
      JSON.stringify(postsWithMeta, null, 2)
    );
    console.log(`✅ Saved posts.json`);

    // Save categories
    const categoriesWithSeo = categories.map(cat => {
      const aioseoJson = cat.aioseo_head_json || {};
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        count: cat.count,
        seo: {
          title: aioseoJson.title || `${cat.name} - iGeeksBlog`,
          description: aioseoJson.description || cat.description || `Browse all ${cat.name} articles on iGeeksBlog`,
          ogTitle: aioseoJson.og_title || cat.name,
          ogDescription: aioseoJson.og_description || cat.description
        }
      };
    });
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'categories.json'),
      JSON.stringify(categoriesWithSeo, null, 2)
    );
    console.log(`✅ Saved categories.json`);

    // Save tags
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'tags.json'),
      JSON.stringify(tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        count: tag.count
      })), null, 2)
    );
    console.log(`✅ Saved tags.json`);

    // Save authors
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'authors.json'),
      JSON.stringify(authors.map(author => ({
        id: author.id,
        name: author.name,
        slug: author.slug,
        description: author.description,
        avatar: author.avatar_urls?.['96'] || author.avatar_urls?.['48']
      })), null, 2)
    );
    console.log(`✅ Saved authors.json`);

    // Generate routes for all content types
    const routes = [
      { path: '/', type: 'home' },
      ...postsWithMeta.map(post => ({
        path: `/${post.slug}`,
        type: 'post',
        id: post.id,
        slug: post.slug
      })),
      ...categoriesWithSeo.map(cat => ({
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
    ];

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'routes.json'),
      JSON.stringify(routes, null, 2)
    );
    console.log(`✅ Saved routes.json with ${routes.length} routes`);

    // Verify files were created
    console.log('\n📋 Verifying generated files...');
    const requiredFiles = ['posts.json', 'categories.json', 'tags.json', 'authors.json', 'routes.json'];
    for (const file of requiredFiles) {
      const filePath = path.join(OUTPUT_DIR, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`  ✅ ${file} (${stats.size} bytes)`);
      } else {
        console.error(`  ❌ ${file} missing!`);
        process.exit(1);
      }
    }

    console.log('\n🎉 WordPress content fetch complete!');
    
  } catch (error) {
    console.error('❌ Error fetching WordPress content:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Fetch posts WITHOUT _embed - much lighter queries!
async function fetchAllPosts() {
  let allPosts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`  Fetching posts page ${page}...`);
    const response = await fetchWithTimeout(
      `${WORDPRESS_API}/posts?page=${page}&per_page=20`
    );
    
    if (!response.ok) {
      if (response.status === 400) {
        hasMore = false;
        break;
      }
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }

    const posts = await response.json();
    if (posts.length === 0) {
      hasMore = false;
      break;
    }
    
    allPosts = [...allPosts, ...posts];
    
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
    hasMore = page < totalPages;
    page++;
    
    // Add delay between requests to avoid overwhelming the server
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return allPosts;
}

async function fetchAllCategories() {
  let allCategories = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchWithTimeout(
      `${WORDPRESS_API}/categories?page=${page}&per_page=100`
    );
    
    if (!response.ok) {
      if (response.status === 400) break;
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const categories = await response.json();
    if (categories.length === 0) break;
    
    allCategories = [...allCategories, ...categories];
    
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
    hasMore = page < totalPages;
    page++;
  }

  return allCategories;
}

async function fetchAllTags() {
  let allTags = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchWithTimeout(
      `${WORDPRESS_API}/tags?page=${page}&per_page=100`
    );
    
    if (!response.ok) {
      if (response.status === 400) break;
      throw new Error(`Failed to fetch tags: ${response.statusText}`);
    }

    const tags = await response.json();
    if (tags.length === 0) break;
    
    allTags = [...allTags, ...tags];
    
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
    hasMore = page < totalPages;
    page++;
  }

  return allTags;
}

async function fetchAllAuthors() {
  try {
    const response = await fetchWithTimeout(`${WORDPRESS_API}/users?per_page=100`);
    
    if (!response.ok) {
      console.warn('Could not fetch authors, using empty array');
      return [];
    }

    return response.json();
  } catch (error) {
    console.warn('Authors fetch failed, using empty array:', error.message);
    return [];
  }
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

fetchWordPressContent();
