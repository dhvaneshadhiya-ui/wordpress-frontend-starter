import fs from 'fs';
import path from 'path';

const WORDPRESS_API = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2';
const OUTPUT_DIR = './src/data';

// Test API connectivity before proceeding
async function testApiConnection() {
  console.log('🔌 Testing API connection...');
  try {
    const response = await fetch(`${WORDPRESS_API}/posts?per_page=1`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`✅ API connection successful! Found posts endpoint.`);
    return true;
  } catch (error) {
    console.error(`❌ API connection failed: ${error.message}`);
    return false;
  }
}

async function fetchWordPressContent() {
  try {
    console.log('🚀 Fetching WordPress content...');
    console.log(`📡 API URL: ${WORDPRESS_API}`);
    
    // Test API first
    const apiOk = await testApiConnection();
    if (!apiOk) {
      throw new Error('Cannot connect to WordPress API');
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
    }

    // Fetch posts with embedded data
    const posts = await fetchAllPosts();
    console.log(`📦 Fetched ${posts.length} posts`);

    // Fetch categories
    const categories = await fetchAllCategories();
    console.log(`📂 Fetched ${categories.length} categories`);

    // Fetch tags
    const tags = await fetchAllTags();
    console.log(`🏷️ Fetched ${tags.length} tags`);

    // Fetch authors
    const authors = await fetchAllAuthors();
    console.log(`👤 Fetched ${authors.length} authors`);

    // Process posts with SEO metadata
    const postsWithMeta = posts.map((post) => {
      const aioseoJson = post.aioseo_head_json || {};
      const yoastJson = post.yoast_head_json || {};
      
      // Extract featured image
      const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
      const featuredImage = featuredMedia?.source_url || featuredMedia?.media_details?.sizes?.full?.source_url;
      
      // Extract author
      const author = post._embedded?.author?.[0];
      
      // Extract categories and tags from embedded terms
      const embeddedTerms = post._embedded?.['wp:term'] || [];
      const postCategories = embeddedTerms[0] || [];
      const postTags = embeddedTerms[1] || [];

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
    console.error('❌ Error fetching WordPress content:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function fetchAllPosts() {
  let allPosts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`  Fetching posts page ${page}...`);
    const response = await fetch(
      `${WORDPRESS_API}/posts?page=${page}&per_page=100&_embed=true`
    );
    
    if (!response.ok) {
      if (response.status === 400) {
        // No more pages
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
    
    // Check if there are more pages
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
    hasMore = page < totalPages;
    page++;
  }

  return allPosts;
}

async function fetchAllCategories() {
  let allCategories = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
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
    const response = await fetch(
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
  const response = await fetch(`${WORDPRESS_API}/users?per_page=100`);
  
  if (!response.ok) {
    console.warn('Could not fetch authors, using empty array');
    return [];
  }

  return response.json();
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

fetchWordPressContent();
