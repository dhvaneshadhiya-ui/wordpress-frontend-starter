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
} from '@/lib/wordpress';

// Fetch posts with pagination
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch single post by slug
export function usePost(slug: string | undefined) {
  return useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPostBySlug(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch all categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories({ perPage: 100 }),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Fetch category by slug
export function useCategory(slug: string | undefined) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => fetchCategoryBySlug(slug!),
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
  });
}

// Fetch posts by category slug
export function useCategoryPosts(categorySlug: string | undefined, page: number = 1) {
  const { data: category } = useCategory(categorySlug);
  
  return useQuery({
    queryKey: ['categoryPosts', categorySlug, page],
    queryFn: () => fetchPosts({ categories: [category!.id], page, perPage: 12 }),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch all tags
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => fetchTags({ perPage: 100 }),
    staleTime: 30 * 60 * 1000,
  });
}

// Fetch tag by slug
export function useTag(slug: string | undefined) {
  return useQuery({
    queryKey: ['tag', slug],
    queryFn: () => fetchTagBySlug(slug!),
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
  });
}

// Fetch posts by tag slug
export function useTagPosts(tagSlug: string | undefined, page: number = 1) {
  const { data: tag } = useTag(tagSlug);
  
  return useQuery({
    queryKey: ['tagPosts', tagSlug, page],
    queryFn: () => fetchPosts({ tags: [tag!.id], page, perPage: 12 }),
    enabled: !!tag,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch all authors
export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: () => fetchAuthors({ perPage: 100 }),
    staleTime: 30 * 60 * 1000,
  });
}

// Fetch author by slug
export function useAuthor(slug: string | undefined) {
  return useQuery({
    queryKey: ['author', slug],
    queryFn: () => fetchAuthorBySlug(slug!),
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
  });
}

// Fetch posts by author slug
export function useAuthorPosts(authorSlug: string | undefined, page: number = 1) {
  const { data: author } = useAuthor(authorSlug);
  
  return useQuery({
    queryKey: ['authorPosts', authorSlug, page],
    queryFn: () => fetchPosts({ author: author!.id, page, perPage: 12 }),
    enabled: !!author,
    staleTime: 5 * 60 * 1000,
  });
}
