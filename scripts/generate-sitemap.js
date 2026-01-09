/**
 * Dynamic Sitemap Generator
 * Fetches all content from WordPress API and generates a complete sitemap.xml
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://wp.dev.igeeksblog.com';
const WP_API_URL = process.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2';
const API_TIMEOUT = 15000;

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, timeout = API_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch all paginated items from an endpoint
 */
async function fetchAllPaginated(endpoint, perPage = 100) {
  const items = [];
  let page = 1;
  let hasMore = true;
  
  console.log(`[Sitemap] Fetching ${endpoint}...`);
  
  while (hasMore) {
    try {
      const response = await fetchWithTimeout(
        `${WP_API_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}`
      );
      const data = await response.json();
      items.push(...data);
      hasMore = data.length === perPage;
      page++;
    } catch (error) {
      console.log(`[Sitemap] Finished ${endpoint} at page ${page - 1} (${items.length} items)`);
      hasMore = false;
    }
  }
  
  return items;
}

/**
 * Generate XML sitemap entry
 */
function generateUrlEntry(loc, options = {}) {
  const { lastmod, changefreq = 'weekly', priority = '0.5' } = options;
  
  return `  <url>
    <loc>${loc}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * Main function
 */
async function generateSitemap() {
  console.log('[Sitemap] Starting sitemap generation...');
  console.log(`[Sitemap] API URL: ${WP_API_URL}`);
  console.log(`[Sitemap] Site URL: ${SITE_URL}`);
  
  const urls = [];
  
  // Static pages
  urls.push(generateUrlEntry(SITE_URL, { priority: '1.0', changefreq: 'daily' }));
  urls.push(generateUrlEntry(`${SITE_URL}/llm.html`, { priority: '0.7', changefreq: 'monthly' }));
  
  try {
    // Fetch all content in parallel
    const [posts, categories, tags, authors] = await Promise.all([
      fetchAllPaginated('posts'),
      fetchAllPaginated('categories'),
      fetchAllPaginated('tags'),
      fetchAllPaginated('users'),
    ]);
    
    console.log(`[Sitemap] Found: ${posts.length} posts, ${categories.length} categories, ${tags.length} tags, ${authors.length} authors`);
    
    // Posts (highest priority after homepage)
    for (const post of posts) {
      urls.push(generateUrlEntry(`${SITE_URL}/${post.slug}`, {
        lastmod: new Date(post.modified).toISOString().split('T')[0],
        priority: '0.8',
        changefreq: 'weekly'
      }));
    }
    
    // Categories (only with posts)
    for (const cat of categories.filter(c => c.count > 0)) {
      urls.push(generateUrlEntry(`${SITE_URL}/category/${cat.slug}`, {
        priority: '0.6',
        changefreq: 'weekly'
      }));
    }
    
    // Tags (only with posts)
    for (const tag of tags.filter(t => t.count > 0)) {
      urls.push(generateUrlEntry(`${SITE_URL}/tag/${tag.slug}`, {
        priority: '0.5',
        changefreq: 'weekly'
      }));
    }
    
    // Authors
    for (const author of authors) {
      urls.push(generateUrlEntry(`${SITE_URL}/author/${author.slug}`, {
        priority: '0.5',
        changefreq: 'monthly'
      }));
    }
    
  } catch (error) {
    console.error('[Sitemap] Error fetching from WordPress API:', error.message);
    console.log('[Sitemap] Generating minimal sitemap with static pages only');
  }
  
  // Generate final XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  
  // Write to public directory
  const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outputPath, sitemap);
  
  console.log(`[Sitemap] ✅ Generated sitemap.xml with ${urls.length} URLs`);
  console.log(`[Sitemap] Output: ${outputPath}`);
}

// Run
generateSitemap().catch(console.error);
