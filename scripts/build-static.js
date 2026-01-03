import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SITE_URL = process.env.SITE_URL || 'https://dev.igeeksblog.com';
const DATA_DIR = './src/data';
const DIST_DIR = './dist';
const CACHE_DIR = './.build-cache';
const PARALLEL_WRITES = 50; // Number of files to write in parallel

// ============= Caching Utilities =============

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getStaticCache() {
  const cachePath = path.join(CACHE_DIR, 'static-cache.json');
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch {
      return { hashes: {} };
    }
  }
  return { hashes: {} };
}

function saveStaticCache(cache) {
  ensureCacheDir();
  fs.writeFileSync(
    path.join(CACHE_DIR, 'static-cache.json'),
    JSON.stringify(cache, null, 2)
  );
}

function getContentHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

// ============= Vite Assets =============

function getViteAssets() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Vite build output not found. Run vite build first.');
    process.exit(1);
  }
  
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  
  const scriptMatch = indexHtml.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*>/);
  const cssMatches = indexHtml.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g);
  
  const jsPath = scriptMatch ? scriptMatch[1] : '/assets/index.js';
  const cssPaths = [];
  
  for (const match of cssMatches) {
    cssPaths.push(match[1]);
  }
  
  console.log(`📦 Vite assets: JS=${jsPath}, CSS=${cssPaths.length} files`);
  
  return { jsPath, cssPaths };
}

// ============= Parallel File Writing =============

async function writeFilesInParallel(files, cache) {
  const results = { written: 0, skipped: 0 };
  
  for (let i = 0; i < files.length; i += PARALLEL_WRITES) {
    const batch = files.slice(i, i + PARALLEL_WRITES);
    
    await Promise.all(batch.map(async ({ filePath, content, cacheKey }) => {
      const hash = getContentHash(content);
      
      // Skip if content hasn't changed
      if (cache.hashes[cacheKey] === hash && fs.existsSync(filePath)) {
        results.skipped++;
        return;
      }
      
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content);
      cache.hashes[cacheKey] = hash;
      results.written++;
    }));
  }
  
  return results;
}

// ============= HTML Generators =============

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function generateAssetTags(viteAssets) {
  const cssTags = viteAssets.cssPaths.map(css => 
    `<link rel="stylesheet" crossorigin href="${css}">`
  ).join('\n    ');
  
  const jsTag = `<script type="module" crossorigin src="${viteAssets.jsPath}"></script>`;
  
  return { cssTags, jsTag };
}

function generatePostHTML(post, viteAssets) {
  const title = escapeHtml(stripHtml(post.seo?.title || post.title?.rendered || ''));
  const description = escapeHtml(post.seo?.description || '');
  const ogTitle = escapeHtml(post.seo?.ogTitle || title);
  const ogDescription = escapeHtml(post.seo?.ogDescription || description);
  const image = post.seo?.image || post.featuredImage || '';
  const canonical = `${SITE_URL}/${post.slug}`;
  const authorName = escapeHtml(post.author?.name || 'iGeeksBlog');
  const { cssTags, jsTag } = generateAssetTags(viteAssets);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": stripHtml(post.title?.rendered || ''),
    "description": stripHtml(post.excerpt?.rendered || ''),
    "image": image,
    "author": { "@type": "Person", "name": post.author?.name || 'iGeeksBlog' },
    "publisher": {
      "@type": "Organization",
      "name": "iGeeksBlog",
      "logo": { "@type": "ImageObject", "url": `${SITE_URL}/favicon.ico` }
    },
    "datePublished": post.date,
    "dateModified": post.modified,
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonical }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="noindex, nofollow">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="iGeeksBlog">
    ${image ? `<meta property="og:image" content="${image}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@iaborahimali">
    <meta name="twitter:title" content="${escapeHtml(post.seo?.twitterTitle || title)}">
    <meta name="twitter:description" content="${escapeHtml(post.seo?.twitterDescription || description)}">
    ${post.seo?.twitterImage ? `<meta name="twitter:image" content="${post.seo.twitterImage}">` : ''}
    <meta property="article:published_time" content="${post.seo?.publishedTime || post.date}">
    <meta property="article:modified_time" content="${post.seo?.modifiedTime || post.modified}">
    <meta property="article:author" content="${authorName}">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    ${cssTags}
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
    <div id="root">
        <article itemscope itemtype="https://schema.org/Article">
            <header>
                <h1 itemprop="headline">${post.title?.rendered || ''}</h1>
                <div class="meta">
                    <span itemprop="author" itemscope itemtype="https://schema.org/Person">
                        By <span itemprop="name">${authorName}</span>
                    </span>
                    <time itemprop="datePublished" datetime="${post.date}">
                        ${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                </div>
                ${image ? `<img itemprop="image" src="${image}" alt="${title}" loading="lazy">` : ''}
            </header>
            <div itemprop="articleBody" class="content">${post.content?.rendered || ''}</div>
        </article>
    </div>
    <script>window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'post', data: post })};</script>
    ${jsTag}
</body>
</html>`;
}

function generateCategoryHTML(category, posts, viteAssets) {
  const title = escapeHtml(category.seo?.title || `${category.name} - iGeeksBlog`);
  const description = escapeHtml(category.seo?.description || category.description || `Browse all ${category.name} articles`);
  const canonical = `${SITE_URL}/category/${category.slug}`;
  const { cssTags, jsTag } = generateAssetTags(viteAssets);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": category.name,
    "description": stripHtml(category.description || ''),
    "url": canonical,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": posts.length,
      "itemListElement": posts.slice(0, 10).map((post, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `${SITE_URL}/${post.slug}`
      }))
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="noindex, nofollow">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="iGeeksBlog">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    ${cssTags}
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
    <div id="root">
        <main>
            <h1>${escapeHtml(category.name)}</h1>
            ${category.description ? `<p>${category.description}</p>` : ''}
            <div class="posts-grid">
                ${posts.slice(0, 10).map(post => `
                    <article>
                        <h2><a href="/${post.slug}">${post.title?.rendered || ''}</a></h2>
                        <p>${stripHtml(post.excerpt?.rendered || '').substring(0, 160)}...</p>
                    </article>
                `).join('')}
            </div>
        </main>
    </div>
    <script>window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'category', data: { category, posts: posts.slice(0, 10) } })};</script>
    ${jsTag}
</body>
</html>`;
}

function generateTagHTML(tag, posts, viteAssets) {
  const title = escapeHtml(`${tag.name} - iGeeksBlog`);
  const description = escapeHtml(`Browse all articles tagged with ${tag.name}`);
  const canonical = `${SITE_URL}/tag/${tag.slug}`;
  const { cssTags, jsTag } = generateAssetTags(viteAssets);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="noindex, nofollow">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="iGeeksBlog">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    ${cssTags}
</head>
<body>
    <div id="root">
        <main>
            <h1>Tag: ${escapeHtml(tag.name)}</h1>
            <div class="posts-grid">
                ${posts.slice(0, 10).map(post => `
                    <article>
                        <h2><a href="/${post.slug}">${post.title?.rendered || ''}</a></h2>
                        <p>${stripHtml(post.excerpt?.rendered || '').substring(0, 160)}...</p>
                    </article>
                `).join('')}
            </div>
        </main>
    </div>
    <script>window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'tag', data: { tag, posts: posts.slice(0, 10) } })};</script>
    ${jsTag}
</body>
</html>`;
}

function generateAuthorHTML(author, posts, viteAssets) {
  const title = escapeHtml(`${author.name} - iGeeksBlog`);
  const description = escapeHtml(author.description || `Articles by ${author.name}`);
  const canonical = `${SITE_URL}/author/${author.slug}`;
  const { cssTags, jsTag } = generateAssetTags(viteAssets);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": author.name,
      "description": stripHtml(author.description || ''),
      "image": author.avatar,
      "url": canonical
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="noindex, nofollow">
    <meta property="og:type" content="profile">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="iGeeksBlog">
    ${author.avatar ? `<meta property="og:image" content="${author.avatar}">` : ''}
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    ${cssTags}
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
    <div id="root">
        <main>
            <header class="author-header">
                ${author.avatar ? `<img src="${author.avatar}" alt="${escapeHtml(author.name)}">` : ''}
                <h1>${escapeHtml(author.name)}</h1>
                ${author.description ? `<p>${author.description}</p>` : ''}
            </header>
            <div class="posts-grid">
                ${posts.slice(0, 10).map(post => `
                    <article>
                        <h2><a href="/${post.slug}">${post.title?.rendered || ''}</a></h2>
                        <p>${stripHtml(post.excerpt?.rendered || '').substring(0, 160)}...</p>
                    </article>
                `).join('')}
            </div>
        </main>
    </div>
    <script>window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'author', data: { author, posts: posts.slice(0, 10) } })};</script>
    ${jsTag}
</body>
</html>`;
}

function generateIndexHTML(posts, viteAssets) {
  const title = 'iGeeksBlog - Apple News, iPhone Tips & Tech Reviews';
  const description = 'Your source for the latest Apple news, iPhone tips, Mac tutorials, and comprehensive tech reviews.';
  const { cssTags, jsTag } = generateAssetTags(viteAssets);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "iGeeksBlog",
    "url": SITE_URL,
    "description": description,
    "publisher": {
      "@type": "Organization",
      "name": "iGeeksBlog",
      "logo": { "@type": "ImageObject", "url": `${SITE_URL}/favicon.ico` }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/?s={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="noindex, nofollow">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${SITE_URL}">
    <meta property="og:site_name" content="iGeeksBlog">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@iaborahimali">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <link rel="canonical" href="${SITE_URL}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    ${cssTags}
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
    <div id="root">
        <main>
            <h1>iGeeksBlog</h1>
            <p>${description}</p>
            <div class="posts-grid">
                ${posts.slice(0, 9).map(post => `
                    <article>
                        ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${escapeHtml(stripHtml(post.title?.rendered || ''))}" loading="lazy">` : ''}
                        <h2><a href="/${post.slug}">${post.title?.rendered || ''}</a></h2>
                        <p>${stripHtml(post.excerpt?.rendered || '').substring(0, 160)}...</p>
                    </article>
                `).join('')}
            </div>
        </main>
    </div>
    <script>window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'home', data: { posts: posts.slice(0, 9) } })};</script>
    ${jsTag}
</body>
</html>`;
}

// ============= Main Build Function =============

async function generateStaticHTML() {
  const startTime = Date.now();
  
  try {
    console.log('🏗️ Generating static HTML files with caching...');

    const postsPath = path.join(DATA_DIR, 'posts.json');
    if (!fs.existsSync(postsPath)) {
      console.error('❌ No posts.json found. Run fetch-content first.');
      process.exit(1);
    }

    const viteAssets = getViteAssets();
    const cache = getStaticCache();

    // Load all data
    console.log('📖 Loading data files...');
    const [postsData, categoriesData, tagsData, authorsData] = await Promise.all([
      JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'posts.json'), 'utf8')),
      JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'categories.json'), 'utf8')),
      JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tags.json'), 'utf8')),
      JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'authors.json'), 'utf8'))
    ]);

    console.log(`  Posts: ${postsData.length}, Categories: ${categoriesData.length}, Tags: ${tagsData.length}, Authors: ${authorsData.length}`);

    // Prepare all files to write
    const filesToWrite = [];

    // Post pages
    for (const post of postsData) {
      const html = generatePostHTML(post, viteAssets);
      filesToWrite.push({
        filePath: path.join(DIST_DIR, post.slug, 'index.html'),
        content: html,
        cacheKey: `post:${post.slug}:${post.modified}`
      });
    }

    // Category pages
    for (const category of categoriesData) {
      const categoryPosts = postsData.filter(post => 
        post.categories?.some(cat => cat.slug === category.slug)
      );
      const html = generateCategoryHTML(category, categoryPosts, viteAssets);
      filesToWrite.push({
        filePath: path.join(DIST_DIR, 'category', category.slug, 'index.html'),
        content: html,
        cacheKey: `category:${category.slug}`
      });
    }

    // Tag pages
    for (const tag of tagsData) {
      const tagPosts = postsData.filter(post => 
        post.tags?.some(t => t.slug === tag.slug)
      );
      const html = generateTagHTML(tag, tagPosts, viteAssets);
      filesToWrite.push({
        filePath: path.join(DIST_DIR, 'tag', tag.slug, 'index.html'),
        content: html,
        cacheKey: `tag:${tag.slug}`
      });
    }

    // Author pages
    for (const author of authorsData) {
      const authorPosts = postsData.filter(post => 
        post.author?.slug === author.slug
      );
      const html = generateAuthorHTML(author, authorPosts, viteAssets);
      filesToWrite.push({
        filePath: path.join(DIST_DIR, 'author', author.slug, 'index.html'),
        content: html,
        cacheKey: `author:${author.slug}`
      });
    }

    // Index page
    const indexHTML = generateIndexHTML(postsData, viteAssets);
    filesToWrite.push({
      filePath: path.join(DIST_DIR, 'index.html'),
      content: indexHTML,
      cacheKey: 'index'
    });

    // Write all files in parallel with caching
    console.log(`📝 Writing ${filesToWrite.length} HTML files...`);
    const results = await writeFilesInParallel(filesToWrite, cache);
    
    // Save updated cache
    saveStaticCache(cache);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Static HTML generation complete in ${duration}s!`);
    console.log(`   Written: ${results.written}, Skipped (cached): ${results.skipped}`);

  } catch (error) {
    console.error('❌ Static HTML generation failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

generateStaticHTML();
