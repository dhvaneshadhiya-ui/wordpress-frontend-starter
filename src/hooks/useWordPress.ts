import { useQuery } from '@tanstack/react-query';
import {
  fetchPosts,
  fetchPostBySlug,
  fetchCategories,
  fetchCategoryBySlug,
  WPPost,
  WPCategory,
} from '@/lib/wordpress';

// Fetch posts with pagination
export function usePosts(params: {
  page?: number;
  perPage?: number;
  categories?: number[];
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
