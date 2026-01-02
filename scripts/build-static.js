import fs from 'fs';
import path from 'path';

const SITE_URL = process.env.SITE_URL || 'https://dev.igeeksblog.com';
const DATA_DIR = './src/data';
const DIST_DIR = './dist';

// Read Vite's built index.html to get correct asset references
function getViteAssets() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Vite build output not found. Run vite build first.');
    process.exit(1);
  }
  
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  
  // Extract script and link tags from Vite's index.html
  const scriptMatch = indexHtml.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*>/);
  const cssMatches = indexHtml.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g);
  
  const jsPath = scriptMatch ? scriptMatch[1] : '/assets/index.js';
  const cssPaths = [];
  
  for (const match of cssMatches) {
    cssPaths.push(match[1]);
  }
  
  console.log(`📦 Found Vite assets: JS=${jsPath}, CSS=${cssPaths.join(', ') || 'none'}`);
  
  return { jsPath, cssPaths };
}

function generateStaticHTML() {
  console.log('🏗️ Generating static HTML files...');
  console.log(`📁 Data directory: ${DATA_DIR}`);
  console.log(`📁 Dist directory: ${DIST_DIR}`);

  // Check if data exists with detailed logging
  const postsPath = path.join(DATA_DIR, 'posts.json');
  console.log(`🔍 Looking for posts.json at: ${postsPath}`);
  
  if (!fs.existsSync(postsPath)) {
    console.error('❌ No posts.json found. Run fetch-content first.');
    console.error('📂 Contents of DATA_DIR:');
    if (fs.existsSync(DATA_DIR)) {
      fs.readdirSync(DATA_DIR).forEach(file => console.log(`   - ${file}`));
    } else {
      console.error('   DATA_DIR does not exist!');
    }
    process.exit(1);
  }

  // Get Vite asset paths
  const viteAssets = getViteAssets();

  // Load data with verification
  console.log('📖 Loading data files...');
  const postsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'posts.json'), 'utf8'));
  console.log(`  ✅ Loaded ${postsData.length} posts`);
  
  const categoriesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'categories.json'), 'utf8'));
  console.log(`  ✅ Loaded ${categoriesData.length} categories`);
  
  const tagsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tags.json'), 'utf8'));
  console.log(`  ✅ Loaded ${tagsData.length} tags`);
  
  const authorsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'authors.json'), 'utf8'));
  console.log(`  ✅ Loaded ${authorsData.length} authors`);

  // Generate HTML for each post
  let postCount = 0;
  postsData.forEach(post => {
    const html = generatePostHTML(post, viteAssets);
    const postDir = path.join(DIST_DIR, post.slug);
    
    if (!fs.existsSync(postDir)) {
      fs.mkdirSync(postDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(postDir, 'index.html'), html);
    postCount++;
  });
  console.log(`✅ Generated ${postCount} post pages`);

  // Generate category pages
  let categoryCount = 0;
  categoriesData.forEach(category => {
    const categoryPosts = postsData.filter(post => 
      post.categories.some(cat => cat.slug === category.slug)
    );
    const html = generateCategoryHTML(category, categoryPosts, viteAssets);
    const catDir = path.join(DIST_DIR, 'category', category.slug);
    
    if (!fs.existsSync(catDir)) {
      fs.mkdirSync(catDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(catDir, 'index.html'), html);
    categoryCount++;
  });
  console.log(`✅ Generated ${categoryCount} category pages`);

  // Generate tag pages
  let tagCount = 0;
  tagsData.forEach(tag => {
    const tagPosts = postsData.filter(post => 
      post.tags.some(t => t.slug === tag.slug)
    );
    const html = generateTagHTML(tag, tagPosts, viteAssets);
    const tagDir = path.join(DIST_DIR, 'tag', tag.slug);
    
    if (!fs.existsSync(tagDir)) {
      fs.mkdirSync(tagDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(tagDir, 'index.html'), html);
    tagCount++;
  });
  console.log(`✅ Generated ${tagCount} tag pages`);

  // Generate author pages
  let authorCount = 0;
  authorsData.forEach(author => {
    const authorPosts = postsData.filter(post => 
      post.author?.slug === author.slug
    );
    const html = generateAuthorHTML(author, authorPosts, viteAssets);
    const authorDir = path.join(DIST_DIR, 'author', author.slug);
    
    if (!fs.existsSync(authorDir)) {
      fs.mkdirSync(authorDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(authorDir, 'index.html'), html);
    authorCount++;
  });
  console.log(`✅ Generated ${authorCount} author pages`);

  // Update the index.html with SEO content (don't overwrite, inject)
  const indexHTML = generateIndexHTML(postsData, viteAssets);
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHTML);
  console.log(`✅ Updated index page with SEO content`);

  console.log('\n🎉 Static HTML generation complete!');
}

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
  const title = escapeHtml(stripHtml(post.seo.title || post.title?.rendered || ''));
  const description = escapeHtml(post.seo.description || '');
  const ogTitle = escapeHtml(post.seo.ogTitle || title);
  const ogDescription = escapeHtml(post.seo.ogDescription || description);
  const image = post.seo.image || '';
  const canonical = `${SITE_URL}/${post.slug}`;
  const authorName = escapeHtml(post.author?.name || 'iGeeksBlog');
  const { cssTags, jsTag } = generateAssetTags(viteAssets);

  // Generate JSON-LD for article
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": stripHtml(post.title?.rendered || ''),
    "description": stripHtml(post.excerpt?.rendered || ''),
    "image": image,
    "author": {
      "@type": "Person",
      "name": post.author?.name || 'iGeeksBlog'
    },
    "publisher": {
      "@type": "Organization",
      "name": "iGeeksBlog",
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/favicon.ico`
      }
    },
    "datePublished": post.date,
    "dateModified": post.modified,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonical
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
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="iGeeksBlog">
    ${image ? `<meta property="og:image" content="${image}">` : ''}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@iaborahimali">
    <meta name="twitter:title" content="${escapeHtml(post.seo.twitterTitle || title)}">
    <meta name="twitter:description" content="${escapeHtml(post.seo.twitterDescription || description)}">
    ${post.seo.twitterImage ? `<meta name="twitter:image" content="${post.seo.twitterImage}">` : ''}
    
    <!-- Article meta -->
    <meta property="article:published_time" content="${post.seo.publishedTime}">
    <meta property="article:modified_time" content="${post.seo.modifiedTime}">
    <meta property="article:author" content="${authorName}">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${canonical}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Vite CSS -->
    ${cssTags}
    
    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
    </script>
</head>
<body>
    <div id="root">
        <!-- Pre-rendered content for SEO -->
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
            <div itemprop="articleBody" class="content">
                ${post.content?.rendered || ''}
            </div>
        </article>
    </div>
    
    <!-- Initial data for React hydration -->
    <script>
        window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'post', data: post })};
    </script>
    ${jsTag}
</body>
</html>`;
}

function generateCategoryHTML(category, posts, viteAssets) {
  const title = escapeHtml(category.seo?.title || `${category.name} - iGeeksBlog`);
  const description = escapeHtml(category.seo?.description || category.description || `Browse all ${category.name} articles on iGeeksBlog`);
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
      "itemListElement": posts.slice(0, 10).map((post, index) => ({
        "@type": "ListItem",
        "position": index + 1,
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
    
    <!-- Vite CSS -->
    ${cssTags}
    
    <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
    </script>
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
    
    <script>
        window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'category', data: { category, posts: posts.slice(0, 10) } })};
    </script>
    ${jsTag}
</body>
</html>`;
}

function generateTagHTML(tag, posts, viteAssets) {
  const title = escapeHtml(`${tag.name} - iGeeksBlog`);
  const description = escapeHtml(`Browse all articles tagged with ${tag.name} on iGeeksBlog`);
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
    
    <!-- Vite CSS -->
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
    
    <script>
        window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'tag', data: { tag, posts: posts.slice(0, 10) } })};
    </script>
    ${jsTag}
</body>
</html>`;
}

function generateAuthorHTML(author, posts, viteAssets) {
  const title = escapeHtml(`${author.name} - iGeeksBlog`);
  const description = escapeHtml(author.description || `Articles by ${author.name} on iGeeksBlog`);
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
    
    <!-- Vite CSS -->
    ${cssTags}
    
    <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
    </script>
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
    
    <script>
        window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'author', data: { author, posts: posts.slice(0, 10) } })};
    </script>
    ${jsTag}
</body>
</html>`;
}

function generateIndexHTML(posts, viteAssets) {
  const recentPosts = posts.slice(0, 12);
  const title = 'iGeeksBlog - Apple News, How-To Guides, Tips & App Reviews';
  const description = 'Your daily source for Apple news, how-to guides, tips, and app reviews.';
  const { cssTags, jsTag } = generateAssetTags(viteAssets);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "iGeeksBlog",
    "url": SITE_URL,
    "description": description,
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
    
    <meta name="twitter:card" content="summary">
    <meta name="twitter:site" content="@iaborahimali">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    
    <link rel="canonical" href="${SITE_URL}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Vite CSS -->
    ${cssTags}
    
    <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
    </script>
</head>
<body>
    <div id="root">
        <main>
            <h1>Latest Posts</h1>
            <div class="posts-grid">
                ${recentPosts.map(post => `
                    <article>
                        ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${escapeHtml(stripHtml(post.title?.rendered || ''))}" loading="lazy">` : ''}
                        <h2><a href="/${post.slug}">${post.title?.rendered || ''}</a></h2>
                        <p>${stripHtml(post.excerpt?.rendered || '').substring(0, 160)}...</p>
                        <div class="meta">
                            <span>${post.author?.name || 'iGeeksBlog'}</span>
                            <time datetime="${post.date}">${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
                        </div>
                    </article>
                `).join('')}
            </div>
        </main>
    </div>
    
    <script>
        window.__INITIAL_DATA__ = ${JSON.stringify({ type: 'home', data: { posts: recentPosts } })};
    </script>
    ${jsTag}
</body>
</html>`;
}

generateStaticHTML();
