const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://dev.igeeksblog.com';
const DATA_DIR = './src/data';
const DIST_DIR = './dist';

function generateSEOFiles() {
  console.log('🔍 Generating SEO files...');

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Check if data exists
  if (!fs.existsSync(path.join(DATA_DIR, 'posts.json'))) {
    console.warn('⚠️ No posts.json found. Generating basic SEO files...');
    generateBasicSEOFiles();
    return;
  }

  const postsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'posts.json'), 'utf8'));
  const categoriesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'categories.json'), 'utf8'));
  const tagsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tags.json'), 'utf8'));
  const authorsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'authors.json'), 'utf8'));

  // Generate sitemap.xml
  const sitemap = generateSitemap(postsData, categoriesData, tagsData, authorsData);
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
  console.log('✅ Generated sitemap.xml');

  // Generate sitemap index for large sites
  if (postsData.length > 1000) {
    const sitemapIndex = generateSitemapIndex(postsData);
    fs.writeFileSync(path.join(DIST_DIR, 'sitemap-index.xml'), sitemapIndex);
    console.log('✅ Generated sitemap-index.xml');
  }

  // Generate robots.txt
  const robots = generateRobots();
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robots);
  console.log('✅ Generated robots.txt');

  // Generate news sitemap for Google News
  const newsSitemap = generateNewsSitemap(postsData);
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap-news.xml'), newsSitemap);
  console.log('✅ Generated sitemap-news.xml');

  console.log('\n🎉 SEO files generation complete!');
}

function generateBasicSEOFiles() {
  // Generate basic robots.txt
  const robots = generateRobots();
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robots);
  console.log('✅ Generated basic robots.txt');

  // Generate basic sitemap
  const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), basicSitemap);
  console.log('✅ Generated basic sitemap.xml');
}

function generateSitemap(posts, categories, tags, authors) {
  const today = new Date().toISOString().split('T')[0];
  
  const urls = [
    // Homepage
    {
      loc: SITE_URL,
      lastmod: today,
      changefreq: 'daily',
      priority: '1.0'
    },
    // Posts
    ...posts.map(post => ({
      loc: `${SITE_URL}/${post.slug}`,
      lastmod: (post.modified || post.date).split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    })),
    // Categories
    ...categories.map(cat => ({
      loc: `${SITE_URL}/category/${cat.slug}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.6'
    })),
    // Tags
    ...tags.filter(tag => tag.count > 0).map(tag => ({
      loc: `${SITE_URL}/tag/${tag.slug}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.5'
    })),
    // Authors
    ...authors.map(author => ({
      loc: `${SITE_URL}/author/${author.slug}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.5'
    }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

function generateSitemapIndex(posts) {
  const today = new Date().toISOString().split('T')[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-news.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

function generateNewsSitemap(posts) {
  // Only include posts from the last 2 days for Google News
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const recentPosts = posts.filter(post => {
    const postDate = new Date(post.date);
    return postDate >= twoDaysAgo;
  }).slice(0, 1000); // Google News sitemap limit

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recentPosts.map(post => `  <url>
    <loc>${escapeXml(`${SITE_URL}/${post.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>iGeeksBlog</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${post.date}</news:publication_date>
      <news:title>${escapeXml(stripHtml(post.title?.rendered || ''))}</news:title>
    </news:news>
  </url>`).join('\n')}
</urlset>`;
}

function generateRobots() {
  return `# robots.txt for ${SITE_URL}
User-agent: *
Allow: /

# Sitemaps
Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/sitemap-news.xml

# Crawl-delay (optional, adjust as needed)
Crawl-delay: 1

# Disallow admin/private paths
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /static/

# Allow search engines to access all content
Allow: /*.css
Allow: /*.js
Allow: /*.png
Allow: /*.jpg
Allow: /*.gif
Allow: /*.svg
Allow: /*.webp
`;
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

generateSEOFiles();
