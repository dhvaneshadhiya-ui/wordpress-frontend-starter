// WordPress REST API service layer for dev.igeeksblog.com
// Always fetches from API - no local data fallback for posts

import { fetchWithRetry, ApiError } from './api-utils';

const API_BASE = import.meta.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2';

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
  // AIOSEO fields (All in One SEO plugin)
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
  // Yoast fallback
  yoast_head_json?: {
    title?: string;
    description?: string;
    og_image?: Array<{ url: string }>;
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
  // Social links (if exposed by WordPress via custom REST field)
  social_links?: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
}

// Fetch posts with embedded data
export async function fetchPosts(params: {
  page?: number;
  perPage?: number;
  categories?: number[];
  tags?: number[];
  author?: number;
  search?: string;
  slug?: string;
} = {}): Promise<{ posts: WPPost[]; totalPages: number; total: number }> {
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

  const response = await fetchWithRetry(`${API_BASE}/posts?${searchParams}`);
  
  if (!response.ok) {
    throw new ApiError(`Failed to fetch posts: ${response.status}`, response.status);
  }

  const posts = await response.json();
  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
  const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);

  return { posts, totalPages, total };
}

// Fetch single post by slug
export async function fetchPostBySlug(slug: string): Promise<WPPost | null> {
  const { posts } = await fetchPosts({ slug, perPage: 1 });
  return posts[0] || null;
}

// Fetch categories
export async function fetchCategories(params: {
  perPage?: number;
  hideEmpty?: boolean;
} = {}): Promise<WPCategory[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(params.perPage || 100));
  if (params.hideEmpty !== false) {
    searchParams.set('hide_empty', 'true');
  }

  const response = await fetchWithRetry(`${API_BASE}/categories?${searchParams}`);
  
  if (!response.ok) {
    throw new ApiError(`Failed to fetch categories: ${response.status}`, response.status);
  }

  return response.json();
}

// Fetch single category by slug
export async function fetchCategoryBySlug(slug: string): Promise<WPCategory | null> {
  const response = await fetchWithRetry(`${API_BASE}/categories?slug=${slug}`);
  
  if (!response.ok) {
    throw new ApiError(`Failed to fetch category: ${response.status}`, response.status);
  }

  const categories = await response.json();
  return categories[0] || null;
}

// Fetch tags
export async function fetchTags(params: {
  perPage?: number;
  hideEmpty?: boolean;
} = {}): Promise<WPTag[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(params.perPage || 100));
  if (params.hideEmpty !== false) {
    searchParams.set('hide_empty', 'true');
  }

  const response = await fetchWithRetry(`${API_BASE}/tags?${searchParams}`);
  
  if (!response.ok) {
    throw new ApiError(`Failed to fetch tags: ${response.status}`, response.status);
  }

  return response.json();
}

// Fetch single tag by slug
export async function fetchTagBySlug(slug: string): Promise<WPTag | null> {
  const response = await fetchWithRetry(`${API_BASE}/tags?slug=${slug}`);
  
  if (!response.ok) {
    throw new ApiError(`Failed to fetch tag: ${response.status}`, response.status);
  }

  const tags = await response.json();
  return tags[0] || null;
}

// Fetch authors/users
export async function fetchAuthors(params: {
  perPage?: number;
} = {}): Promise<WPAuthor[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(params.perPage || 100));

  const response = await fetchWithRetry(`${API_BASE}/users?${searchParams}`);
  
  if (!response.ok) {
    throw new ApiError(`Failed to fetch authors: ${response.status}`, response.status);
  }

  return response.json();
}

// Fetch single author by slug
export async function fetchAuthorBySlug(slug: string): Promise<WPAuthor | null> {
  const response = await fetchWithRetry(`${API_BASE}/users?slug=${slug}`);
  
  if (!response.ok) {
    throw new ApiError(`Failed to fetch author: ${response.status}`, response.status);
  }

  const authors = await response.json();
  return authors[0] || null;
}

// Helper functions
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

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Custom API base for iGeeksBlog endpoints
const CUSTOM_API_BASE = import.meta.env.VITE_WORDPRESS_API_URL?.replace('/wp/v2', '') || 'https://dev.igeeksblog.com/wp-json';

// Redirect info interface
export interface RedirectInfo {
  found: boolean;
  url: string;
  target?: string;
  code?: number;  // 301, 302, 410, 404
  type?: string;  // 'url', 'error', etc.
  error?: string;
}

// Check for redirect rules from WordPress Redirection plugin
export async function checkRedirect(slug: string): Promise<RedirectInfo> {
  try {
    const response = await fetchWithRetry(
      `${CUSTOM_API_BASE}/igeeksblog/v1/redirect?url=/${encodeURIComponent(slug)}`,
      undefined,
      5000, // 5 second timeout for redirect checks
      1     // Only 1 retry
    );
    
    if (!response.ok) {
      return { found: false, url: `/${slug}` };
    }
    
    return response.json();
  } catch {
    // Fail silently - if redirect check fails, just show the post
    return { found: false, url: `/${slug}` };
  }
}

// Preview API - fetch draft posts with token validation
export async function fetchPreviewPost(postId: number, token: string): Promise<WPPost> {
  const response = await fetchWithRetry(
    `${CUSTOM_API_BASE}/igeeksblog/v1/preview?id=${postId}&token=${encodeURIComponent(token)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `Failed to fetch preview: ${response.status}`);
  }

  return response.json();
}
