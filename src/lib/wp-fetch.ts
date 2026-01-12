/**
 * Server-side WordPress Fetch Utilities for Next.js
 * 
 * This file provides fetch functions compatible with Next.js App Router
 * and ISR (Incremental Static Regeneration). Uses process.env instead of
 * import.meta.env for server-side compatibility.
 * 
 * After NextLovable migration, these functions will be used in Server Components
 * with the `next: { revalidate }` option for ISR caching.
 * 
 * NOTE: The `next` option in fetch() is Next.js-specific and will only work
 * after migration. In the current Vite environment, it's safely ignored.
 */

// Use process.env for server-side compatibility (Next.js)
const WP_API_URL = typeof process !== 'undefined' && process.env?.WORDPRESS_API_URL
  ? process.env.WORDPRESS_API_URL
  : 'https://dev.igeeksblog.com/wp-json/wp/v2';

const CUSTOM_API_BASE = WP_API_URL.replace('/wp/v2', '');

// Default revalidation time in seconds (1 hour)
const DEFAULT_REVALIDATE = 3600;

/**
 * Wrapper for fetch that adds Next.js ISR options when available
 * Includes retry logic with exponential backoff for 5xx errors
 */
async function wpFetch(
  url: string, 
  revalidate: number = DEFAULT_REVALIDATE,
  retries: number = 3
): Promise<Response> {
  const options: RequestInit = {};
  
  // Add Next.js-specific options if running in Next.js environment
  if (typeof window === 'undefined') {
    (options as Record<string, unknown>).next = { revalidate };
  }
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Retry on 502, 503, 504 errors (server overload)
      if (response.status >= 500 && attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`[wp-fetch] ${response.status} error for ${url}, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[wp-fetch] Network error for ${url}, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error(`[wp-fetch] Max retries exceeded for ${url}`);
}

// ============= Types =============

export interface WPPost {
  id: number;
  slug: string;
  status?: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  modified: string;
  featured_media: number;
  categories: number[];
  tags: number[];
  author: number;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
      media_details?: {
        sizes?: {
          full?: { source_url: string };
          large?: { source_url: string };
          medium?: { source_url: string };
        };
      };
    }>;
    author?: Array<{
      id: number;
      name: string;
      slug: string;
      avatar_urls?: { [key: string]: string };
      description?: string;
    }>;
    'wp:term'?: Array<Array<{
      id: number;
      name: string;
      slug: string;
      taxonomy: string;
    }>>;
  };
  aioseo_head?: string;
  aioseo_head_json?: {
    title?: string;
    description?: string;
    'og:title'?: string;
    'og:description'?: string;
    'og:image'?: string;
    'twitter:title'?: string;
    'twitter:description'?: string;
    'twitter:image'?: string;
    canonical_url?: string;
  };
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count?: number;
  description?: string;
}

export interface WPTag {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

export interface WPAuthor {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatar_urls?: { [key: string]: string };
}

export interface WPPage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
}

// ============= Fetch Functions with ISR Support =============

/**
 * Fetch posts with ISR caching
 * @param params - Query parameters for filtering posts
 * @param revalidate - Revalidation time in seconds (default: 3600)
 */
export async function fetchPosts(
  params: {
    page?: number;
    perPage?: number;
    categories?: number[];
    tags?: number[];
    author?: number;
    search?: string;
    slug?: string;
  } = {},
  revalidate: number = DEFAULT_REVALIDATE
): Promise<{ posts: WPPost[]; totalPages: number; total: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('_embed', 'true');
  searchParams.set('per_page', String(params.perPage || 12));
  searchParams.set('page', String(params.page || 1));
  
  if (params.categories?.length) {
    searchParams.set('categories', params.categories.join(','));
  }
  if (params.tags?.length) {
    searchParams.set('tags', params.tags.join(','));
  }
  if (params.author) {
    searchParams.set('author', String(params.author));
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.slug) {
    searchParams.set('slug', params.slug);
  }

  try {
    const response = await wpFetch(`${WP_API_URL}/posts?${searchParams}`, revalidate);
    
    if (!response.ok) {
      console.error(`[wp-fetch] Failed to fetch posts: ${response.status}`);
      return { posts: [], totalPages: 0, total: 0 };
    }

    const posts = await response.json();
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
    const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);

    return { posts, totalPages, total };
  } catch (error) {
    console.error('[wp-fetch] Error fetching posts:', error);
    return { posts: [], totalPages: 0, total: 0 };
  }
}

/**
 * Fetch single post by slug with ISR caching
 */
export async function fetchPostBySlug(
  slug: string,
  revalidate: number = DEFAULT_REVALIDATE
): Promise<WPPost | null> {
  const { posts } = await fetchPosts({ slug, perPage: 1 }, revalidate);
  return posts[0] || null;
}

/**
 * Fetch all categories with ISR caching
 */
export async function fetchCategories(
  params: { perPage?: number; hideEmpty?: boolean } = {},
  revalidate: number = DEFAULT_REVALIDATE
): Promise<WPCategory[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(params.perPage || 100));
  if (params.hideEmpty !== false) {
    searchParams.set('hide_empty', 'true');
  }

  try {
    const response = await wpFetch(`${WP_API_URL}/categories?${searchParams}`, revalidate);
    
    if (!response.ok) {
      console.error(`[wp-fetch] Failed to fetch categories: ${response.status}`);
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('[wp-fetch] Error fetching categories:', error);
    return [];
  }
}

/**
 * Fetch single category by slug with ISR caching
 */
export async function fetchCategoryBySlug(
  slug: string,
  revalidate: number = DEFAULT_REVALIDATE
): Promise<WPCategory | null> {
  try {
    const response = await wpFetch(`${WP_API_URL}/categories?slug=${slug}`, revalidate);
    
    if (!response.ok) {
      console.error(`[wp-fetch] Failed to fetch category: ${response.status}`);
      return null;
    }

    const categories = await response.json();
    return categories[0] || null;
  } catch (error) {
    console.error('[wp-fetch] Error fetching category:', error);
    return null;
  }
}

/**
 * Fetch all tags with ISR caching
 */
export async function fetchTags(
  params: { perPage?: number; hideEmpty?: boolean } = {},
  revalidate: number = DEFAULT_REVALIDATE
): Promise<WPTag[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(params.perPage || 100));
  if (params.hideEmpty !== false) {
    searchParams.set('hide_empty', 'true');
  }

  try {
    const response = await wpFetch(`${WP_API_URL}/tags?${searchParams}`, revalidate);
    
    if (!response.ok) {
      console.error(`[wp-fetch] Failed to fetch tags: ${response.status}`);
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('[wp-fetch] Error fetching tags:', error);
    return [];
  }
}

/**
 * Fetch single tag by slug with ISR caching
 */
export async function fetchTagBySlug(
  slug: string,
  revalidate: number = DEFAULT_REVALIDATE
): Promise<WPTag | null> {
  try {
    const response = await wpFetch(`${WP_API_URL}/tags?slug=${slug}`, revalidate);
    
    if (!response.ok) {
      console.error(`[wp-fetch] Failed to fetch tag: ${response.status}`);
      return null;
    }

    const tags = await response.json();
    return tags[0] || null;
  } catch (error) {
    console.error('[wp-fetch] Error fetching tag:', error);
    return null;
  }
}

/**
 * Fetch all authors with ISR caching
 */
export async function fetchAuthors(
  params: { perPage?: number } = {},
  revalidate: number = DEFAULT_REVALIDATE
): Promise<WPAuthor[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(params.perPage || 100));

  try {
    const response = await wpFetch(`${WP_API_URL}/users?${searchParams}`, revalidate);
    
    if (!response.ok) {
      console.error(`[wp-fetch] Failed to fetch authors: ${response.status}`);
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('[wp-fetch] Error fetching authors:', error);
    return [];
  }
}

/**
 * Fetch single author by slug with ISR caching
 */
export async function fetchAuthorBySlug(
  slug: string,
  revalidate: number = DEFAULT_REVALIDATE
): Promise<WPAuthor | null> {
  try {
    const response = await wpFetch(`${WP_API_URL}/users?slug=${slug}`, revalidate);
    
    if (!response.ok) {
      console.error(`[wp-fetch] Failed to fetch author: ${response.status}`);
      return null;
    }

    const authors = await response.json();
    return authors[0] || null;
  } catch (error) {
    console.error('[wp-fetch] Error fetching author:', error);
    return null;
  }
}

/**
 * Fetch single page by slug with ISR caching
 */
export async function fetchPage(
  slug: string,
  revalidate: number = DEFAULT_REVALIDATE
): Promise<WPPage | null> {
  try {
    const response = await wpFetch(`${WP_API_URL}/pages?slug=${slug}&_embed`, revalidate);
    
    if (!response.ok) {
      console.warn(`Failed to fetch page ${slug}: ${response.status}`);
      return null;
    }

    const pages = await response.json();
    return pages[0] || null;
  } catch (error) {
    console.warn(`Error fetching page ${slug}:`, error);
    return null;
  }
}

// ============= Helper Functions =============

export function getFeaturedImageUrl(post: WPPost, size: 'full' | 'large' | 'medium' = 'large'): string {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return '/placeholder.svg';
  
  const sizes = media.media_details?.sizes;
  return sizes?.[size]?.source_url || sizes?.full?.source_url || media.source_url || '/placeholder.svg';
}

export function getAuthor(post: WPPost): { name: string; avatar: string; slug: string; description: string } {
  const author = post._embedded?.author?.[0];
  return {
    name: author?.name || 'Unknown',
    avatar: author?.avatar_urls?.['48'] || author?.avatar_urls?.['96'] || '/placeholder.svg',
    slug: author?.slug || '',
    description: author?.description || '',
  };
}

export function getCategories(post: WPPost): Array<{ id: number; name: string; slug: string }> {
  const terms = post._embedded?.['wp:term']?.[0] || [];
  return terms.filter((term) => term.taxonomy === 'category').map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
  }));
}

export function getTags(post: WPPost): Array<{ id: number; name: string; slug: string }> {
  const terms = post._embedded?.['wp:term']?.[1] || [];
  return terms.filter((term) => term.taxonomy === 'post_tag').map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  }));
}

export function getReadingTime(content: string): number {
  const text = content.replace(/<[^>]*>/g, '');
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

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

export function stripHtml(html: string): string {
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  return decodeHtmlEntities(stripped);
}

// ============= Redirect Check =============

export interface RedirectInfo {
  found: boolean;
  url: string;
  target?: string;
  code?: number;
  type?: string;
  error?: string;
}

export async function checkRedirect(slug: string): Promise<RedirectInfo> {
  try {
    const response = await wpFetch(
      `${CUSTOM_API_BASE}/igeeksblog/v1/redirect?url=/${encodeURIComponent(slug)}`,
      300 // Cache redirects for 5 minutes
    );
    
    if (!response.ok) {
      return { found: false, url: `/${slug}` };
    }
    
    const text = await response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}$/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { found: false, url: `/${slug}` };
      }
    }
    
    return { found: false, url: `/${slug}` };
  } catch {
    return { found: false, url: `/${slug}` };
  }
}
