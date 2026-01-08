import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchPosts,
  fetchPostBySlug,
  fetchCategories,
  fetchCategoryBySlug,
  fetchTags,
  fetchTagBySlug,
  fetchAuthors,
  fetchAuthorBySlug,
  fetchPreviewPost,
  WPPost,
} from '@/lib/wordpress';
import {
  getLocalCategories,
  getLocalCategoryBySlug,
  getLocalTags,
  getLocalTagBySlug,
  getLocalAuthors,
  getLocalAuthorBySlug,
} from '@/lib/local-data';
import { getCachedData, setCachedData, generateCacheKey } from '@/lib/local-cache';
import demoPosts from '@/data/demo-posts.json';

// Query config - stale-while-revalidate strategy
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const LONG_STALE_TIME = 30 * 60 * 1000; // 30 minutes
const GC_TIME = 60 * 60 * 1000; // 1 hour

// Cast demo posts to WPPost type for placeholder
const typedDemoPosts = demoPosts as unknown as WPPost[];

// Fetch posts with pagination - stale-while-revalidate with localStorage caching
export function usePosts(params: {
  page?: number;
  perPage?: number;
  categories?: number[];
  tags?: number[];
  author?: number;
  search?: string;
} = {}) {
  const cacheKey = generateCacheKey('posts', params);
  
  type PostsResult = { posts: WPPost[]; totalPages: number; total: number };
  
  return useQuery({
    queryKey: ['posts', params],
    queryFn: async () => {
      const result = await fetchPosts(params);
      // Cache successful result to localStorage
      setCachedData(cacheKey, result);
      return result;
    },
    // Show cached data immediately while fetching fresh
    placeholderData: () => getCachedData<PostsResult>(cacheKey) ?? undefined,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
    retryDelay: 1000,
    refetchOnMount: 'always', // Always check for fresh data
    refetchOnWindowFocus: false, // Don't refetch on tab switch
  });
}

// Fetch single post by slug - always from API
export function usePost(slug: string | undefined) {
  return useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPostBySlug(slug!),
    enabled: !!slug,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
  });
}

// Fetch all categories - with local fallback
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories({ perPage: 100 }),
    placeholderData: () => getLocalCategories(),
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
  });
}

// Fetch category by slug - with local fallback
export function useCategory(slug: string | undefined) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => fetchCategoryBySlug(slug!),
    enabled: !!slug,
    placeholderData: () => slug ? getLocalCategoryBySlug(slug) : undefined,
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
  });
}

// Fetch posts by category slug - with keepPreviousData for smooth pagination
export function useCategoryPosts(categorySlug: string | undefined, page: number = 1) {
  const { data: category } = useCategory(categorySlug);
  
  return useQuery({
    queryKey: ['categoryPosts', categorySlug, page],
    queryFn: () => fetchPosts({ categories: [category!.id], page, perPage: 12 }),
    enabled: !!category,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
    placeholderData: keepPreviousData, // Show previous page while loading new
  });
}

// Fetch all tags - with local fallback
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => fetchTags({ perPage: 100 }),
    placeholderData: () => getLocalTags(),
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
  });
}

// Fetch tag by slug - with local fallback
export function useTag(slug: string | undefined) {
  return useQuery({
    queryKey: ['tag', slug],
    queryFn: () => fetchTagBySlug(slug!),
    enabled: !!slug,
    placeholderData: () => slug ? getLocalTagBySlug(slug) : undefined,
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
  });
}

// Fetch posts by tag slug - with keepPreviousData for smooth pagination
export function useTagPosts(tagSlug: string | undefined, page: number = 1) {
  const { data: tag } = useTag(tagSlug);
  
  return useQuery({
    queryKey: ['tagPosts', tagSlug, page],
    queryFn: () => fetchPosts({ tags: [tag!.id], page, perPage: 12 }),
    enabled: !!tag,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
    placeholderData: keepPreviousData, // Show previous page while loading new
  });
}

// Fetch all authors - with local fallback
export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: () => fetchAuthors({ perPage: 100 }),
    placeholderData: () => getLocalAuthors(),
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
  });
}

// Fetch author by slug - with local fallback
export function useAuthor(slug: string | undefined) {
  return useQuery({
    queryKey: ['author', slug],
    queryFn: () => fetchAuthorBySlug(slug!),
    enabled: !!slug,
    placeholderData: () => slug ? getLocalAuthorBySlug(slug) : undefined,
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
  });
}

// Fetch posts by author slug - with keepPreviousData for smooth pagination
export function useAuthorPosts(authorSlug: string | undefined, page: number = 1) {
  const { data: author } = useAuthor(authorSlug);
  
  return useQuery({
    queryKey: ['authorPosts', authorSlug, page],
    queryFn: () => fetchPosts({ author: author!.id, page, perPage: 12 }),
    enabled: !!author,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
    placeholderData: keepPreviousData, // Show previous page while loading new
  });
}

// Fetch preview post with token
export function usePreviewPost(postId: number | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ['preview', postId, token],
    queryFn: () => fetchPreviewPost(postId!, token!),
    enabled: !!postId && !!token,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
