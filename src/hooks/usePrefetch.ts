import { useQueryClient } from '@tanstack/react-query';
import { fetchPostBySlug } from '@/lib/wordpress';

export function usePrefetchPost() {
  const queryClient = useQueryClient();

  const prefetchPost = (slug: string) => {
    queryClient.prefetchQuery({
      queryKey: ['post', slug],
      queryFn: () => fetchPostBySlug(slug),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  return prefetchPost;
}
