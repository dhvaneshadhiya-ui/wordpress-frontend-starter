// SSR entry point - renders full article content for SEO
// This generates static HTML at build time via prerender.js

interface RouteInfo {
  type: 'post' | 'category' | 'tag' | 'author';
  data: any;
}

// Decode HTML entities (SSR-compatible, no DOM required)
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#8211;': '–',
    '&#8212;': '—',
    '&#8216;': '\u2018',
    '&#8217;': '\u2019',
    '&#8220;': '\u201C',
    '&#8221;': '\u201D',
    '&#038;': '&',
    '&nbsp;': ' ',
  };
  
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.split(entity).join(char);
  }
  
  result = result.replace(/&#(\d+);/g, (_, code) => 
    String.fromCharCode(parseInt(code, 10))
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => 
    String.fromCharCode(parseInt(code, 16))
  );
  
  return result;
}

// Strip HTML tags
function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, '').trim() || '';
}

// Format date for display
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Get featured image URL from embedded post data
function getFeaturedImage(post: any): string {
  try {
    const media = post._embedded?.['wp:featuredmedia']?.[0];
    return media?.source_url || media?.media_details?.sizes?.large?.source_url || '';
  } catch {
    return '';
  }
}

// Get author info from embedded post data
function getAuthor(post: any): { name: string; avatar: string; slug: string } {
  try {
    const author = post._embedded?.author?.[0];
    return {
      name: author?.name || 'iGeeksBlog',
      avatar: author?.avatar_urls?.['96'] || '',
      slug: author?.slug || 'igeeksblog'
    };
  } catch {
    return { name: 'iGeeksBlog', avatar: '', slug: 'igeeksblog' };
  }
}

// Get categories from embedded post data
function getCategories(post: any): Array<{ name: string; slug: string }> {
  try {
    return post._embedded?.['wp:term']?.[0]?.map((c: any) => ({
      name: c.name,
      slug: c.slug
    })) || [];
  } catch {
    return [];
  }
}

// Calculate reading time
function getReadingTime(content: string): number {
  const text = stripHtml(content);
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Render static header for SSR
function renderHeader(): string {
  return `
    <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-14 items-center">
        <a href="/" class="flex items-center space-x-2">
          <img src="/logo.png" alt="iGeeksBlog" class="h-8 w-auto" width="32" height="32" />
        </a>
        <nav class="ml-auto flex items-center space-x-4">
          <a href="/" class="text-sm font-medium transition-colors hover:text-primary">Home</a>
        </nav>
      </div>
    </header>
  `.trim();
}

// Render static footer for SSR
function renderFooter(): string {
  const currentYear = new Date().getFullYear();
  return `
    <footer class="border-t border-border bg-card mt-16">
      <div class="container mx-auto px-4 py-12">
        <div class="grid gap-8 md:grid-cols-3">
          <div>
            <a href="/">
              <img src="/logo.png" alt="iGeeksBlog" class="h-8 w-auto" width="32" height="32" />
            </a>
            <p class="mt-4 text-sm text-muted-foreground">
              Your daily source for Apple news, how-to guides, tips, and app reviews.
            </p>
          </div>
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide">Categories</h3>
            <ul class="space-y-2">
              <li><a href="/category/how-to" class="text-sm text-muted-foreground hover:text-foreground">How To</a></li>
              <li><a href="/category/tips-tricks" class="text-sm text-muted-foreground hover:text-foreground">Tips & Tricks</a></li>
              <li><a href="/category/apps" class="text-sm text-muted-foreground hover:text-foreground">Apps</a></li>
            </ul>
          </div>
          <div>
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide">Quick Links</h3>
            <ul class="space-y-2">
              <li><a href="/" class="text-sm text-muted-foreground hover:text-foreground">Home</a></li>
              <li><a href="/about" class="text-sm text-muted-foreground hover:text-foreground">About Us</a></li>
              <li><a href="/contact-us" class="text-sm text-muted-foreground hover:text-foreground">Contact</a></li>
              <li><a href="/privacy-policy" class="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div class="mt-12 border-t border-border pt-8 text-center">
          <p class="text-sm text-muted-foreground">
            © ${currentYear} iGeeksBlog. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  `.trim();
}

// Render full post HTML for SSR
function renderPostHTML(post: any): string {
  const title = decodeHtmlEntities(stripHtml(post.title?.rendered || ''));
  const content = post.content?.rendered || '';
  const excerpt = decodeHtmlEntities(stripHtml(post.excerpt?.rendered || ''));
  const featuredImage = getFeaturedImage(post);
  const author = getAuthor(post);
  const categories = getCategories(post);
  const publishDate = formatDate(post.date);
  const readingTime = getReadingTime(content);

  return `
    ${renderHeader()}
    <div class="min-h-screen bg-background">
      <main class="max-w-4xl mx-auto px-4 py-8">
        <article class="post-content">
          <header class="mb-8">
            ${categories.length > 0 ? `
              <div class="flex flex-wrap gap-2 mb-4">
                ${categories.map(cat => `
                  <a href="/category/${cat.slug}" class="text-xs font-medium uppercase tracking-wider text-primary hover:text-primary/80">
                    ${decodeHtmlEntities(cat.name)}
                  </a>
                `).join('')}
              </div>
            ` : ''}
            
            <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              ${title}
            </h1>
            
            <p class="text-lg text-muted-foreground mb-6">
              ${excerpt}
            </p>
            
            <div class="flex items-center gap-4 text-sm text-muted-foreground">
              ${author.avatar ? `
                <img 
                  src="${author.avatar}" 
                  alt="${author.name}" 
                  class="w-10 h-10 rounded-full"
                  width="40"
                  height="40"
                />
              ` : ''}
              <div>
                <a href="/author/${author.slug}" class="font-medium text-foreground hover:text-primary">
                  ${author.name}
                </a>
                <div class="flex items-center gap-2">
                  <time datetime="${post.date}">${publishDate}</time>
                  <span>·</span>
                  <span>${readingTime} min read</span>
                </div>
              </div>
            </div>
          </header>
          
          ${featuredImage ? `
            <figure class="mb-8">
              <img 
                src="${featuredImage}" 
                alt="${title}"
                class="w-full rounded-lg"
                width="1200"
                height="675"
                loading="eager"
              />
            </figure>
          ` : ''}
          
          <div class="prose prose-lg max-w-none">
            ${content}
          </div>
        </article>
      </main>
    </div>
    ${renderFooter()}
  `.trim();
}

// Render category/tag archive HTML
function renderArchiveHTML(type: string, data: any): string {
  const title = decodeHtmlEntities(data.name || '');
  const description = decodeHtmlEntities(stripHtml(data.description || ''));
  const typeName = type === 'category' ? 'Category' : type === 'tag' ? 'Tag' : 'Author';

  return `
    ${renderHeader()}
    <div class="min-h-screen bg-background">
      <main class="max-w-6xl mx-auto px-4 py-8">
        <header class="mb-8">
          <p class="text-sm font-medium uppercase tracking-wider text-primary mb-2">
            ${typeName}
          </p>
          <h1 class="text-3xl md:text-4xl font-bold mb-4">
            ${title}
          </h1>
          ${description ? `
            <p class="text-lg text-muted-foreground">
              ${description}
            </p>
          ` : ''}
        </header>
        <section aria-label="${title} articles">
          <p class="text-muted-foreground">Loading articles...</p>
        </section>
      </main>
    </div>
    ${renderFooter()}
  `.trim();
}

// Render author archive HTML
function renderAuthorHTML(data: any): string {
  const name = decodeHtmlEntities(data.name || '');
  const description = decodeHtmlEntities(stripHtml(data.description || ''));
  const avatar = data.avatar_urls?.['96'] || '';

  return `
    ${renderHeader()}
    <div class="min-h-screen bg-background">
      <main class="max-w-6xl mx-auto px-4 py-8">
        <header class="mb-8">
          <div class="flex items-center gap-4 mb-4">
            ${avatar ? `
              <img 
                src="${avatar}" 
                alt="${name}" 
                class="w-20 h-20 rounded-full"
                width="80"
                height="80"
              />
            ` : ''}
            <div>
              <p class="text-sm font-medium uppercase tracking-wider text-primary mb-1">
                Author
              </p>
              <h1 class="text-3xl md:text-4xl font-bold">
                ${name}
              </h1>
            </div>
          </div>
          ${description ? `
            <p class="text-lg text-muted-foreground">
              ${description}
            </p>
          ` : ''}
        </header>
        <section aria-label="Articles by ${name}">
          <p class="text-muted-foreground">Loading articles...</p>
        </section>
      </main>
    </div>
    ${renderFooter()}
  `.trim();
}

// Main SSR render function
export function render(url: string, routeInfo?: RouteInfo): string {
  // For posts, render full article content
  if (routeInfo?.type === 'post') {
    return renderPostHTML(routeInfo.data);
  }
  
  // For category/tag archives
  if (routeInfo?.type === 'category' || routeInfo?.type === 'tag') {
    return renderArchiveHTML(routeInfo.type, routeInfo.data);
  }
  
  // For author archives
  if (routeInfo?.type === 'author') {
    return renderAuthorHTML(routeInfo.data);
  }
  
  // For homepage and other routes, return shell with header/footer
  return `
    ${renderHeader()}
    <div class="min-h-screen bg-background">
      <main class="container mx-auto px-4 py-8">
        <p class="text-muted-foreground">Loading...</p>
      </main>
    </div>
    ${renderFooter()}
  `.trim();
}
