// WordPress REST API service layer for dev.igeeksblog.com

const API_BASE = 'https://dev.igeeksblog.com/wp-json/wp/v2';

export interface WPPost {
  id: number;
  slug: string;
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

// Fetch posts with embedded data
export async function fetchPosts(params: {
  page?: number;
  perPage?: number;
  categories?: number[];
  tags?: number[];
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
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.slug) {
    searchParams.set('slug', params.slug);
  }

  const response = await fetch(`${API_BASE}/posts?${searchParams}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
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

  const response = await fetch(`${API_BASE}/categories?${searchParams}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status}`);
  }

  return response.json();
}

// Fetch single category by slug
export async function fetchCategoryBySlug(slug: string): Promise<WPCategory | null> {
  const response = await fetch(`${API_BASE}/categories?slug=${slug}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch category: ${response.status}`);
  }

  const categories = await response.json();
  return categories[0] || null;
}

// Helper functions
export function getFeaturedImageUrl(post: WPPost, size: 'full' | 'large' | 'medium' = 'large'): string {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return '/placeholder.svg';
  
  const sizes = media.media_details?.sizes;
  return sizes?.[size]?.source_url || sizes?.full?.source_url || media.source_url || '/placeholder.svg';
}

export function getAuthor(post: WPPost): { name: string; avatar: string } {
  const author = post._embedded?.author?.[0];
  return {
    name: author?.name || 'Unknown',
    avatar: author?.avatar_urls?.['48'] || author?.avatar_urls?.['96'] || '/placeholder.svg',
  };
}

export function getCategories(post: WPPost): Array<{ id: number; name: string; slug: string }> {
  const terms = post._embedded?.['wp:term']?.[0] || [];
  return terms.filter(term => term.taxonomy === 'category').map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
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
