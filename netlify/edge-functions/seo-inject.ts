const WP_API_URL = 'https://dev.igeeksblog.com/wp-json/wp/v2';

const BOT_USER_AGENTS = [
  'googlebot', 'bingbot', 'yandex', 'baiduspider', 'facebookexternalhit',
  'twitterbot', 'rogerbot', 'linkedinbot', 'embedly', 'quora link preview',
  'showyoubot', 'outbrain', 'pinterest', 'slackbot', 'vkShare', 'W3C_Validator',
  'whatsapp', 'flipboard', 'tumblr', 'bitlybot', 'skypeuripreview', 'nuzzel',
  'discordbot', 'qwantify', 'pinterestbot', 'bitrix', 'xing-contenttabreceiver',
  'chrome-lighthouse', 'telegrambot', 'integration', 'chatgpt', 'perplexity',
  'claudebot', 'anthropic', 'cohere-ai', 'gptbot'
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

interface WPPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  slug: string;
  date: string;
  modified: string;
  _embedded?: {
    author?: Array<{ name: string; slug: string; avatar_urls?: { '96'?: string } }>;
    'wp:featuredmedia'?: Array<{ source_url: string; alt_text?: string }>;
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>;
  };
  aioseo_head_json?: {
    title?: string;
    description?: string;
    og_title?: string;
    og_description?: string;
    twitter_title?: string;
    twitter_description?: string;
  };
  yoast_head_json?: {
    title?: string;
    description?: string;
    og_title?: string;
    og_description?: string;
  };
}

interface WPCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

interface WPAuthor {
  id: number;
  name: string;
  slug: string;
  description: string;
  avatar_urls?: { '96'?: string };
}

interface WPTag {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

async function fetchPost(slug: string): Promise<WPPost | null> {
  try {
    const response = await fetch(`${WP_API_URL}/posts?slug=${slug}&_embed`);
    if (!response.ok) return null;
    const posts = await response.json();
    return posts.length > 0 ? posts[0] : null;
  } catch {
    return null;
  }
}

async function fetchCategory(slug: string): Promise<WPCategory | null> {
  try {
    const response = await fetch(`${WP_API_URL}/categories?slug=${slug}`);
    if (!response.ok) return null;
    const categories = await response.json();
    return categories.length > 0 ? categories[0] : null;
  } catch {
    return null;
  }
}

async function fetchAuthor(slug: string): Promise<WPAuthor | null> {
  try {
    const response = await fetch(`${WP_API_URL}/users?slug=${slug}`);
    if (!response.ok) return null;
    const authors = await response.json();
    return authors.length > 0 ? authors[0] : null;
  } catch {
    return null;
  }
}

async function fetchTag(slug: string): Promise<WPTag | null> {
  try {
    const response = await fetch(`${WP_API_URL}/tags?slug=${slug}`);
    if (!response.ok) return null;
    const tags = await response.json();
    return tags.length > 0 ? tags[0] : null;
  } catch {
    return null;
  }
}

interface MetaTags {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  ogUrl: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
}

const DEFAULT_META: MetaTags = {
  title: 'iGeeksBlog - Apple News, How-To Guides, Tips & App Reviews',
  description: 'Your daily source for Apple news, how-to guides, tips, and app reviews.',
  ogTitle: 'iGeeksBlog - Apple News, How-To Guides, Tips & App Reviews',
  ogDescription: 'Your daily source for Apple news, how-to guides, tips, and app reviews.',
  ogImage: 'https://dev.igeeksblog.com/wp-content/uploads/2020/12/igeeksblog-logo.png',
  ogType: 'website',
  ogUrl: '',
  twitterCard: 'summary_large_image',
  twitterTitle: 'iGeeksBlog - Apple News, How-To Guides, Tips & App Reviews',
  twitterDescription: 'Your daily source for Apple news, how-to guides, tips, and app reviews.',
  twitterImage: 'https://dev.igeeksblog.com/wp-content/uploads/2020/12/igeeksblog-logo.png',
};

function getPostMeta(post: WPPost, url: string): MetaTags {
  const aioseo = post.aioseo_head_json;
  const yoast = post.yoast_head_json;
  
  const rawTitle = aioseo?.title || yoast?.title || stripHtml(post.title.rendered);
  const rawDescription = aioseo?.description || yoast?.description || stripHtml(post.excerpt.rendered);
  
  const title = truncate(rawTitle, 60);
  const description = truncate(rawDescription, 160);
  
  const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
  const image = featuredMedia?.source_url || DEFAULT_META.ogImage;
  
  const author = post._embedded?.author?.[0]?.name;
  const categories = post._embedded?.['wp:term']?.[0];
  const section = categories?.[0]?.name;

  return {
    title,
    description,
    ogTitle: aioseo?.og_title || yoast?.og_title || title,
    ogDescription: aioseo?.og_description || yoast?.og_description || description,
    ogImage: image,
    ogType: 'article',
    ogUrl: url,
    twitterCard: 'summary_large_image',
    twitterTitle: aioseo?.twitter_title || title,
    twitterDescription: aioseo?.twitter_description || description,
    twitterImage: image,
    author,
    publishedTime: post.date,
    modifiedTime: post.modified,
    section,
  };
}

function getCategoryMeta(category: WPCategory, url: string): MetaTags {
  const title = `${category.name} - iGeeksBlog`;
  const description = category.description || `Browse all ${category.name} articles on iGeeksBlog`;
  
  return {
    ...DEFAULT_META,
    title: truncate(title, 60),
    description: truncate(description, 160),
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogUrl: url,
    twitterTitle: title,
    twitterDescription: description,
  };
}

function getAuthorMeta(author: WPAuthor, url: string): MetaTags {
  const title = `${author.name} - iGeeksBlog`;
  const description = author.description || `Articles by ${author.name} on iGeeksBlog`;
  const image = author.avatar_urls?.['96'] || DEFAULT_META.ogImage;
  
  return {
    ...DEFAULT_META,
    title: truncate(title, 60),
    description: truncate(description, 160),
    ogTitle: title,
    ogDescription: description,
    ogImage: image,
    ogType: 'profile',
    ogUrl: url,
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
  };
}

function getTagMeta(tag: WPTag, url: string): MetaTags {
  const title = `${tag.name} - iGeeksBlog`;
  const description = tag.description || `Browse all articles tagged with ${tag.name} on iGeeksBlog`;
  
  return {
    ...DEFAULT_META,
    title: truncate(title, 60),
    description: truncate(description, 160),
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogUrl: url,
    twitterTitle: title,
    twitterDescription: description,
  };
}

function injectMetaTags(html: string, meta: MetaTags): string {
  const metaTagsHtml = `
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="${meta.ogTitle}" />
    <meta property="og:description" content="${meta.ogDescription}" />
    <meta property="og:type" content="${meta.ogType}" />
    <meta property="og:url" content="${meta.ogUrl}" />
    <meta property="og:image" content="${meta.ogImage}" />
    <meta property="og:site_name" content="iGeeksBlog" />
    ${meta.publishedTime ? `<meta property="article:published_time" content="${meta.publishedTime}" />` : ''}
    ${meta.modifiedTime ? `<meta property="article:modified_time" content="${meta.modifiedTime}" />` : ''}
    ${meta.author ? `<meta property="article:author" content="${meta.author}" />` : ''}
    ${meta.section ? `<meta property="article:section" content="${meta.section}" />` : ''}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="${meta.twitterCard}" />
    <meta name="twitter:title" content="${meta.twitterTitle}" />
    <meta name="twitter:description" content="${meta.twitterDescription}" />
    <meta name="twitter:image" content="${meta.twitterImage}" />
    
    <!-- Canonical -->
    <link rel="canonical" href="${meta.ogUrl}" />
  `;

  // Remove existing meta tags that we're replacing
  let modifiedHtml = html
    .replace(/<title>.*?<\/title>/gi, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+property="article:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '');

  // Inject new meta tags after <head>
  modifiedHtml = modifiedHtml.replace(/<head>/i, `<head>${metaTagsHtml}`);

  return modifiedHtml;
}

export default async function handler(request: Request, context: { next: () => Promise<Response> }) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Only process for bots
  if (!isBot(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Get the original response
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  
  // Only modify HTML responses
  if (!contentType.includes('text/html')) {
    return response;
  }

  let html = await response.text();
  let meta: MetaTags = { ...DEFAULT_META, ogUrl: url.href };

  try {
    // Parse the URL to determine page type and fetch appropriate data
    if (pathname === '/' || pathname === '') {
      // Homepage - use default meta
      meta.ogUrl = url.href;
    } else if (pathname.startsWith('/category/')) {
      // Category page
      const slug = pathname.replace('/category/', '').replace(/\/$/, '');
      const category = await fetchCategory(slug);
      if (category) {
        meta = getCategoryMeta(category, url.href);
      }
    } else if (pathname.startsWith('/author/')) {
      // Author page
      const slug = pathname.replace('/author/', '').replace(/\/$/, '');
      const author = await fetchAuthor(slug);
      if (author) {
        meta = getAuthorMeta(author, url.href);
      }
    } else if (pathname.startsWith('/tag/')) {
      // Tag page
      const slug = pathname.replace('/tag/', '').replace(/\/$/, '');
      const tag = await fetchTag(slug);
      if (tag) {
        meta = getTagMeta(tag, url.href);
      }
    } else {
      // Assume it's a post - extract slug from path
      const slug = pathname.replace(/^\//, '').replace(/\/$/, '');
      if (slug && !slug.includes('/')) {
        const post = await fetchPost(slug);
        if (post) {
          meta = getPostMeta(post, url.href);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching meta data:', error);
  }

  // Inject meta tags into HTML
  const modifiedHtml = injectMetaTags(html, meta);

  return new Response(modifiedHtml, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'content-type': 'text/html; charset=utf-8',
    },
  });
}
