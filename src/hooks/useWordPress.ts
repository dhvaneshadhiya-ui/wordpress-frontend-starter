import { useQuery } from '@tanstack/react-query';
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
} from '@/lib/wordpress';
import {
  getInitialPostData,
  getInitialCategoryData,
  getInitialTagData,
  getInitialAuthorData,
  getInitialHomeData,
  transformToWPPost,
  transformToWPCategory,
  transformToWPTag,
  transformToWPAuthor,
  transformPostsArray,
} from '@/utils/hydration';

// Shared query config for better caching and retry behavior
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const LONG_STALE_TIME = 30 * 60 * 1000; // 30 minutes
const GC_TIME = 60 * 60 * 1000; // 1 hour - keep in cache

// Retry config - be patient with slow API
const RETRY_CONFIG = {
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
};

// Fetch posts with pagination
export function usePosts(params: {
  page?: number;
  perPage?: number;
  categories?: number[];
  tags?: number[];
  author?: number;
  search?: string;
} = {}) {
  // Check for home page hydration data (page 1, no filters)
  const isHomePage = !params.categories?.length && 
                     !params.tags?.length && 
                     !params.author && 
                     !params.search && 
                     (params.page || 1) === 1;
  
  const homeData = isHomePage ? getInitialHomeData() : null;

  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => fetchPosts(params),
    // Use SSG data as initial data, but still allow refetch
    initialData: homeData ? {
      posts: transformPostsArray(homeData.posts),
      totalPages: 1,
      total: homeData.posts.length,
    } : undefined,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch single post by slug with SSG hydration support
export function usePost(slug: string | undefined) {
  const initialData = slug ? getInitialPostData(slug) : null;

  return useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPostBySlug(slug!),
    enabled: !!slug,
    // Use SSG data as initial data
    initialData: initialData ? transformToWPPost(initialData) : undefined,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch all categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories({ perPage: 100 }),
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch category by slug with SSG hydration support
export function useCategory(slug: string | undefined) {
  const initialData = slug ? getInitialCategoryData(slug) : null;

  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => fetchCategoryBySlug(slug!),
    enabled: !!slug,
    initialData: initialData ? transformToWPCategory(initialData.category) : undefined,
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch posts by category slug with SSG hydration support
export function useCategoryPosts(categorySlug: string | undefined, page: number = 1) {
  const { data: category } = useCategory(categorySlug);
  const initialData = categorySlug ? getInitialCategoryData(categorySlug) : null;
  const hasInitialData = !!initialData && page === 1;
  
  return useQuery({
    queryKey: ['categoryPosts', categorySlug, page],
    queryFn: () => fetchPosts({ categories: [category!.id], page, perPage: 12 }),
    enabled: !!category,
    initialData: hasInitialData && initialData ? {
      posts: transformPostsArray(initialData.posts),
      totalPages: 1,
      total: initialData.posts.length,
    } : undefined,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch all tags
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => fetchTags({ perPage: 100 }),
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch tag by slug with SSG hydration support
export function useTag(slug: string | undefined) {
  const initialData = slug ? getInitialTagData(slug) : null;

  return useQuery({
    queryKey: ['tag', slug],
    queryFn: () => fetchTagBySlug(slug!),
    enabled: !!slug,
    initialData: initialData ? transformToWPTag(initialData.tag) : undefined,
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch posts by tag slug with SSG hydration support
export function useTagPosts(tagSlug: string | undefined, page: number = 1) {
  const { data: tag } = useTag(tagSlug);
  const initialData = tagSlug ? getInitialTagData(tagSlug) : null;
  const hasInitialData = !!initialData && page === 1;
  
  return useQuery({
    queryKey: ['tagPosts', tagSlug, page],
    queryFn: () => fetchPosts({ tags: [tag!.id], page, perPage: 12 }),
    enabled: !!tag,
    initialData: hasInitialData && initialData ? {
      posts: transformPostsArray(initialData.posts),
      totalPages: 1,
      total: initialData.posts.length,
    } : undefined,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch all authors
export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: () => fetchAuthors({ perPage: 100 }),
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch author by slug with SSG hydration support
export function useAuthor(slug: string | undefined) {
  const initialData = slug ? getInitialAuthorData(slug) : null;

  return useQuery({
    queryKey: ['author', slug],
    queryFn: () => fetchAuthorBySlug(slug!),
    enabled: !!slug,
    initialData: initialData ? transformToWPAuthor(initialData.author) : undefined,
    staleTime: LONG_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch posts by author slug with SSG hydration support
export function useAuthorPosts(authorSlug: string | undefined, page: number = 1) {
  const { data: author } = useAuthor(authorSlug);
  const initialData = authorSlug ? getInitialAuthorData(authorSlug) : null;
  const hasInitialData = !!initialData && page === 1;
  
  return useQuery({
    queryKey: ['authorPosts', authorSlug, page],
    queryFn: () => fetchPosts({ author: author!.id, page, perPage: 12 }),
    enabled: !!author,
    initialData: hasInitialData && initialData ? {
      posts: transformPostsArray(initialData.posts),
      totalPages: 1,
      total: initialData.posts.length,
    } : undefined,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    ...RETRY_CONFIG,
  });
}

// Fetch preview post with token
export function usePreviewPost(postId: number | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ['preview', postId, token],
    queryFn: () => fetchPreviewPost(postId!, token!),
    enabled: !!postId && !!token,
    staleTime: 0, // Never cache previews
    gcTime: 0,
    retry: false, // Don't retry on invalid tokens
  });
}
