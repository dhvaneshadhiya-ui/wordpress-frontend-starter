// WordPress REST API service layer for dev.igeeksblog.com
// CORS is configured on WordPress side via WPCode plugin
// Uses local data fallback when API is unavailable

import { fetchWithRetry, ApiError, shouldUseLocalDataFirst } from './api-utils';
import {
  getLocalPosts,
  getLocalPostBySlug,
  getLocalCategories,
  getLocalCategoryBySlug,
  getLocalTags,
  getLocalTagBySlug,
  getLocalAuthors,
  getLocalAuthorBySlug,
  hasLocalData,
} from './local-data';

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
  aioseo_head?: string; // Raw HTML meta tags
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
  // Yoast fallback for backwards compatibility
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
  count: number;
  description?: string;
}

export interface WPTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WPAuthor {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatar_urls?: { [key: string]: string };
}

// Fetch posts with embedded data (with retry and timeout)
export async function fetchPosts(params: {
  page?: number;
  perPage?: number;
  categories?: number[];
  tags?: number[];
  author?: number;
  search?: string;
  slug?: string;
} = {}): Promise<{ posts: WPPost[]; totalPages: number; total: number }> {
  // Use local data in preview environments or if API is unreachable
  if (shouldUseLocalDataFirst() && hasLocalData()) {
    console.log('Using local data for posts');
    const result = getLocalPosts({
      page: params.page,
      perPage: params.perPage,
      categoryId: params.categories?.[0],
      tagId: params.tags?.[0],
      authorId: params.author,
      search: params.search,
    });
    return { posts: result.posts as WPPost[], totalPages: result.totalPages, total: result.total };
  }

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
    const response = await fetchWithRetry(`${API_BASE}/posts?${searchParams}`);
    
    if (!response.ok) {
      throw new ApiError(`Failed to fetch posts: ${response.status}`, response.status);
    }

    const posts = await response.json();
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
    const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);

    return { posts, totalPages, total };
  } catch (error) {
    console.warn('API failed, falling back to local data:', error);
    // Fallback to local data
    if (hasLocalData()) {
      const result = getLocalPosts({
        page: params.page,
        perPage: params.perPage,
        categoryId: params.categories?.[0],
        tagId: params.tags?.[0],
        authorId: params.author,
        search: params.search,
      });
      return { posts: result.posts as WPPost[], totalPages: result.totalPages, total: result.total };
    }
    throw error;
  }
}

// Fetch single post by slug
export async function fetchPostBySlug(slug: string): Promise<WPPost | null> {
  // Use local data in preview environments
  if (shouldUseLocalDataFirst() && hasLocalData()) {
    console.log('Using local data for post:', slug);
    return getLocalPostBySlug(slug) as WPPost | null;
  }

  try {
    const { posts } = await fetchPosts({ slug, perPage: 1 });
    return posts[0] || null;
  } catch (error) {
    console.warn('API failed, falling back to local data:', error);
    if (hasLocalData()) {
      return getLocalPostBySlug(slug) as WPPost | null;
    }
    throw error;
  }
}

// Fetch categories (with retry and timeout)
export async function fetchCategories(params: {
  perPage?: number;
  hideEmpty?: boolean;
} = {}): Promise<WPCategory[]> {
  // Use local data in preview environments
  if (shouldUseLocalDataFirst() && hasLocalData()) {
    console.log('Using local data for categories');
    return getLocalCategories() as WPCategory[];
  }

  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(params.perPage || 100));
  if (params.hideEmpty !== false) {
    searchParams.set('hide_empty', 'true');
  }

  try {
    const response = await fetchWithRetry(`${API_BASE}/categories?${searchParams}`);
    
    if (!response.ok) {
      throw new ApiError(`Failed to fetch categories: ${response.status}`, response.status);
    }

    return response.json();
  } catch (error) {
    console.warn('API failed, falling back to local data:', error);
    if (hasLocalData()) {
      return getLocalCategories() as WPCategory[];
    }
    throw error;
  }
}

// Fetch single category by slug
export async function fetchCategoryBySlug(slug: string): Promise<WPCategory | null> {
  // Use local data in preview environments
  if (shouldUseLocalDataFirst() && hasLocalData()) {
    console.log('Using local data for category:', slug);
    return getLocalCategoryBySlug(slug) as WPCategory | null;
  }

  try {
    const response = await fetchWithRetry(`${API_BASE}/categories?slug=${slug}`);
    
    if (!response.ok) {
      throw new ApiError(`Failed to fetch category: ${response.status}`, response.status);
    }

    const categories = await response.json();
    return categories[0] || null;
  } catch (error) {
    console.warn('API failed, falling back to local data:', error);
    if (hasLocalData()) {
      return getLocalCategoryBySlug(slug) as WPCategory | null;
    }
    throw error;
  }
}

// Fetch tags (with retry and timeout)
export async function fetchTags(params: {
  perPage?: number;
  hideEmpty?: boolean;
} = {}): Promise<WPTag[]> {
  // Use local data in preview environments
  if (shouldUseLocalDataFirst() && hasLocalData()) {
    console.log('Using local data for tags');
    return getLocalTags() as WPTag[];
  }

  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(params.perPage || 100));
  if (params.hideEmpty !== false) {
    searchParams.set('hide_empty', 'true');
  }

  try {
    const response = await fetchWithRetry(`${API_BASE}/tags?${searchParams}`);
    
    if (!response.ok) {
      throw new ApiError(`Failed to fetch tags: ${response.status}`, response.status);
    }

    return response.json();
  } catch (error) {
    console.warn('API failed, falling back to local data:', error);
    if (hasLocalData()) {
      return getLocalTags() as WPTag[];
    }
    throw error;
  }
}

// Fetch single tag by slug
export async function fetchTagBySlug(slug: string): Promise<WPTag | null> {
  // Use local data in preview environments
  if (shouldUseLocalDataFirst() && hasLocalData()) {
    console.log('Using local data for tag:', slug);
    return getLocalTagBySlug(slug) as WPTag | null;
  }

  try {
    const response = await fetchWithRetry(`${API_BASE}/tags?slug=${slug}`);
    
    if (!response.ok) {
      throw new ApiError(`Failed to fetch tag: ${response.status}`, response.status);
    }

    const tags = await response.json();
    return tags[0] || null;
  } catch (error) {
    console.warn('API failed, falling back to local data:', error);
    if (hasLocalData()) {
      return getLocalTagBySlug(slug) as WPTag | null;
    }
    throw error;
  }
}

// Fetch authors/users (with retry and timeout)
export async function fetchAuthors(params: {
  perPage?: number;
} = {}): Promise<WPAuthor[]> {
  // Use local data in preview environments
  if (shouldUseLocalDataFirst() && hasLocalData()) {
    console.log('Using local data for authors');
    return getLocalAuthors() as WPAuthor[];
  }

  const searchParams = new URLSearchParams();
  searchParams.set('per_page', String(params.perPage || 100));

  try {
    const response = await fetchWithRetry(`${API_BASE}/users?${searchParams}`);
    
    if (!response.ok) {
      throw new ApiError(`Failed to fetch authors: ${response.status}`, response.status);
    }

    return response.json();
  } catch (error) {
    console.warn('API failed, falling back to local data:', error);
    if (hasLocalData()) {
      return getLocalAuthors() as WPAuthor[];
    }
    throw error;
  }
}

// Fetch single author by slug
export async function fetchAuthorBySlug(slug: string): Promise<WPAuthor | null> {
  // Use local data in preview environments
  if (shouldUseLocalDataFirst() && hasLocalData()) {
    console.log('Using local data for author:', slug);
    return getLocalAuthorBySlug(slug) as WPAuthor | null;
  }

  try {
    const response = await fetchWithRetry(`${API_BASE}/users?slug=${slug}`);
    
    if (!response.ok) {
      throw new ApiError(`Failed to fetch author: ${response.status}`, response.status);
    }

    const authors = await response.json();
    return authors[0] || null;
  } catch (error) {
    console.warn('API failed, falling back to local data:', error);
    if (hasLocalData()) {
      return getLocalAuthorBySlug(slug) as WPAuthor | null;
    }
    throw error;
  }
}

// Helper functions - handle both API format and local JSON format
export function getFeaturedImageUrl(post: WPPost | any, size: 'full' | 'large' | 'medium' = 'large'): string {
  // Local data format: featuredImage is a direct URL string
  if (post.featuredImage && typeof post.featuredImage === 'string') {
    return post.featuredImage;
  }
  
  // API format: _embedded['wp:featuredmedia']
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return '/placeholder.svg';
  
  const sizes = media.media_details?.sizes;
  return sizes?.[size]?.source_url || sizes?.full?.source_url || media.source_url || '/placeholder.svg';
}

export function getAuthor(post: WPPost | any): { name: string; avatar: string; slug: string } {
  // Local data format: author is an object with name, slug, avatar
  if (post.author && typeof post.author === 'object' && post.author.name) {
    return {
      name: post.author.name || 'Unknown',
      avatar: post.author.avatar || '/placeholder.svg',
      slug: post.author.slug || '',
    };
  }
  
  // API format: _embedded.author
  const author = post._embedded?.author?.[0];
  return {
    name: author?.name || 'Unknown',
    avatar: author?.avatar_urls?.['48'] || author?.avatar_urls?.['96'] || '/placeholder.svg',
    slug: author?.slug || '',
  };
}

export function getCategories(post: WPPost | any): Array<{ id: number; name: string; slug: string }> {
  // Local data format: categories is an array of objects
  if (Array.isArray(post.categories) && post.categories.length > 0 && typeof post.categories[0] === 'object') {
    return post.categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
    }));
  }
  
  // API format: _embedded['wp:term'][0]
  const terms = post._embedded?.['wp:term']?.[0] || [];
  return terms.filter((term: any) => term.taxonomy === 'category').map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
  }));
}

export function getTags(post: WPPost | any): Array<{ id: number; name: string; slug: string }> {
  // Local data format: tags is an array of objects
  if (Array.isArray(post.tags) && post.tags.length > 0 && typeof post.tags[0] === 'object') {
    return post.tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    }));
  }
  
  // API format: _embedded['wp:term'][1]
  const terms = post._embedded?.['wp:term']?.[1] || [];
  return terms.filter((term: any) => term.taxonomy === 'post_tag').map((tag: any) => ({
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

// Preview API - fetch draft posts with token validation
const PREVIEW_API_BASE = import.meta.env.VITE_WORDPRESS_API_URL?.replace('/wp/v2', '') || 'https://dev.igeeksblog.com/wp-json';

export async function fetchPreviewPost(postId: number, token: string): Promise<WPPost> {
  const response = await fetchWithRetry(
    `${PREVIEW_API_BASE}/igeeksblog/v1/preview?id=${postId}&token=${encodeURIComponent(token)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `Failed to fetch preview: ${response.status}`);
  }

  return response.json();
}
