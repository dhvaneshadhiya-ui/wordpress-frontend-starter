import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { WPPost, WPCategory } from '@/lib/wordpress';

const API_BASE = import.meta.env.VITE_WORDPRESS_API_URL || 'https://dev.igeeksblog.com/wp-json/wp/v2';

// Client-side fetch functions
async function clientFetchPosts(params: {
  page?: number;
  perPage?: number;
  categories?: number[];
  tags?: number[];
  author?: number;
  search?: string;
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

  const response = await fetch(`${API_BASE}/posts?${searchParams}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }

  const posts = await response.json();
  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
  const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);

  return { posts, totalPages, total };
}

async function clientFetchCategories(): Promise<WPCategory[]> {
  const response = await fetch(`${API_BASE}/categories?per_page=100&hide_empty=true`);
  if (!response.ok) throw new Error(`Failed to fetch categories: ${response.status}`);
  return response.json();
}

// React Query hooks
export function usePosts(
  params: {
    page?: number;
    perPage?: number;
    categories?: number[];
    tags?: number[];
    author?: number;
    search?: string;
  } = {},
  options?: Partial<UseQueryOptions<{ posts: WPPost[]; totalPages: number; total: number }>>
) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => clientFetchPosts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: clientFetchCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
