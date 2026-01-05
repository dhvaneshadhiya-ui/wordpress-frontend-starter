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
import demoPosts from '@/data/demo-posts.json';

// Query config
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const LONG_STALE_TIME = 30 * 60 * 1000; // 30 minutes
const GC_TIME = 60 * 60 * 1000; // 1 hour

// Cast demo posts to WPPost type for placeholder
const typedDemoPosts = demoPosts as unknown as WPPost[];

// Fetch posts with pagination - with demo fallback for preview
export function usePosts(params: {
  page?: number;
  perPage?: number;
  categories?: number[];
  tags?: number[];
  author?: number;
  search?: string;
} = {}) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => fetchPosts(params),
    placeholderData: () => ({
      posts: typedDemoPosts,
      totalPages: 1,
      total: typedDemoPosts.length,
    }),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
    retryDelay: 1000,
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

// Fetch posts by category slug
export function useCategoryPosts(categorySlug: string | undefined, page: number = 1) {
  const { data: category } = useCategory(categorySlug);
  
  return useQuery({
    queryKey: ['categoryPosts', categorySlug, page],
    queryFn: () => fetchPosts({ categories: [category!.id], page, perPage: 12 }),
    enabled: !!category,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
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

// Fetch posts by tag slug
export function useTagPosts(tagSlug: string | undefined, page: number = 1) {
  const { data: tag } = useTag(tagSlug);
  
  return useQuery({
    queryKey: ['tagPosts', tagSlug, page],
    queryFn: () => fetchPosts({ tags: [tag!.id], page, perPage: 12 }),
    enabled: !!tag,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
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

// Fetch posts by author slug
export function useAuthorPosts(authorSlug: string | undefined, page: number = 1) {
  const { data: author } = useAuthor(authorSlug);
  
  return useQuery({
    queryKey: ['authorPosts', authorSlug, page],
    queryFn: () => fetchPosts({ author: author!.id, page, perPage: 12 }),
    enabled: !!author,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
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
