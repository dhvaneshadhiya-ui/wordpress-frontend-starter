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
import { 
  getCachedData, 
  setCachedData, 
  generateCacheKey, 
  isCacheFresh, 
  getCacheAge,
  POSTS_TTL,
  TAXONOMY_TTL 
} from '@/lib/local-cache';
import demoPosts from '@/data/demo-posts.json';

// Query config - extended stale-while-revalidate strategy
// Cache is shown immediately, background fetch happens if stale
const FRESH_THRESHOLD = 5 * 60 * 1000; // Consider fresh for 5 minutes (no refetch)
const GC_TIME = 24 * 60 * 60 * 1000; // 24 hours garbage collection

// Cast demo posts to WPPost type for placeholder
const typedDemoPosts = demoPosts as unknown as WPPost[];

// Fetch posts with pagination - true stale-while-revalidate with extended caching
// Shows cached data INSTANTLY, fetches fresh in background only when stale
export function usePosts(params: {
  page?: number;
  perPage?: number;
  categories?: number[];
  tags?: number[];
  author?: number;
  search?: string;
} = {}) {
  const cacheKey = generateCacheKey('posts', params);
  const isHomepageRequest = !params.categories && !params.tags && !params.author && !params.search && (!params.page || params.page === 1);
  
  type PostsResult = { posts: WPPost[]; totalPages: number; total: number };
  
  // Get cached data and freshness status BEFORE query
  const cachedData = getCachedData<PostsResult>(cacheKey);
  const cacheIsFresh = isCacheFresh(cacheKey);
  const cacheAge = getCacheAge(cacheKey);
  
  // Build fallback: cached data > demo posts (homepage only)
  const fallbackData = cachedData || (isHomepageRequest ? {
    posts: typedDemoPosts,
    totalPages: 1,
    total: typedDemoPosts.length,
  } : undefined);
  
  return useQuery({
    queryKey: ['posts', params],
    queryFn: async () => {
      const result = await fetchPosts(params);
      // Cache successful result with extended TTL
      setCachedData(cacheKey, result, POSTS_TTL);
      return result;
    },
    // CRITICAL: Use initialData to show cached content INSTANTLY (no loading state)
    initialData: fallbackData,
    // Tell React Query when this data was last updated (for stale calculation)
    initialDataUpdatedAt: cacheAge !== null ? Date.now() - cacheAge : undefined,
    // If cache is fresh (<5 min), don't refetch at all
    staleTime: cacheIsFresh ? FRESH_THRESHOLD : 0,
    gcTime: GC_TIME,
    retry: 1,
    retryDelay: 1000,
    // Only refetch if cache is stale
    refetchOnMount: !cacheIsFresh,
    refetchOnWindowFocus: false,
    refetchInterval: false, // No polling
  });
}

// Fetch single post by slug - always from API
export function usePost(slug: string | undefined) {
  return useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPostBySlug(slug!),
    enabled: !!slug,
    staleTime: FRESH_THRESHOLD,
    gcTime: GC_TIME,
    retry: 2,
  });
}

// Fetch all categories - with local fallback and extended caching
export function useCategories() {
  const cacheKey = 'categories';
  const cachedData = getCachedData<Awaited<ReturnType<typeof fetchCategories>>>(cacheKey);
  const cacheIsFresh = isCacheFresh(cacheKey);
  
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await fetchCategories({ perPage: 100 });
      setCachedData(cacheKey, result, TAXONOMY_TTL);
      return result;
    },
    initialData: cachedData || getLocalCategories(),
    staleTime: cacheIsFresh ? FRESH_THRESHOLD : 0,
    gcTime: GC_TIME,
    retry: 1,
    refetchOnMount: !cacheIsFresh,
    refetchOnWindowFocus: false,
  });
}

// Fetch category by slug - with local fallback
export function useCategory(slug: string | undefined) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => fetchCategoryBySlug(slug!),
    enabled: !!slug,
    placeholderData: () => slug ? getLocalCategoryBySlug(slug) : undefined,
    staleTime: FRESH_THRESHOLD,
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
    staleTime: FRESH_THRESHOLD,
    gcTime: GC_TIME,
    retry: 2,
    placeholderData: keepPreviousData, // Show previous page while loading new
  });
}

// Fetch all tags - with local fallback and extended caching
export function useTags() {
  const cacheKey = 'tags';
  const cachedData = getCachedData<Awaited<ReturnType<typeof fetchTags>>>(cacheKey);
  const cacheIsFresh = isCacheFresh(cacheKey);
  
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const result = await fetchTags({ perPage: 100 });
      setCachedData(cacheKey, result, TAXONOMY_TTL);
      return result;
    },
    initialData: cachedData || getLocalTags(),
    staleTime: cacheIsFresh ? FRESH_THRESHOLD : 0,
    gcTime: GC_TIME,
    retry: 1,
    refetchOnMount: !cacheIsFresh,
    refetchOnWindowFocus: false,
  });
}

// Fetch tag by slug - with local fallback
export function useTag(slug: string | undefined) {
  return useQuery({
    queryKey: ['tag', slug],
    queryFn: () => fetchTagBySlug(slug!),
    enabled: !!slug,
    placeholderData: () => slug ? getLocalTagBySlug(slug) : undefined,
    staleTime: FRESH_THRESHOLD,
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
    staleTime: FRESH_THRESHOLD,
    gcTime: GC_TIME,
    retry: 2,
    placeholderData: keepPreviousData, // Show previous page while loading new
  });
}

// Fetch all authors - with local fallback and extended caching
export function useAuthors() {
  const cacheKey = 'authors';
  const cachedData = getCachedData<Awaited<ReturnType<typeof fetchAuthors>>>(cacheKey);
  const cacheIsFresh = isCacheFresh(cacheKey);
  
  return useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      const result = await fetchAuthors({ perPage: 100 });
      setCachedData(cacheKey, result, TAXONOMY_TTL);
      return result;
    },
    initialData: cachedData || getLocalAuthors(),
    staleTime: cacheIsFresh ? FRESH_THRESHOLD : 0,
    gcTime: GC_TIME,
    retry: 1,
    refetchOnMount: !cacheIsFresh,
    refetchOnWindowFocus: false,
  });
}

// Fetch author by slug - with local fallback
export function useAuthor(slug: string | undefined) {
  return useQuery({
    queryKey: ['author', slug],
    queryFn: () => fetchAuthorBySlug(slug!),
    enabled: !!slug,
    placeholderData: () => slug ? getLocalAuthorBySlug(slug) : undefined,
    staleTime: FRESH_THRESHOLD,
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
    staleTime: FRESH_THRESHOLD,
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
