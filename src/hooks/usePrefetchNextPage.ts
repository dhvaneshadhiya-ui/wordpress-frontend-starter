import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PrefetchConfig {
  currentPage: number;
  totalPages: number;
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
}

export function usePrefetchNextPage({
  currentPage,
  totalPages,
  queryKey,
  queryFn,
  enabled = true,
}: PrefetchConfig) {
  const queryClient = useQueryClient();
  const triggerRef = useRef<HTMLDivElement>(null);
  const hasPrefetched = useRef(false);

  const prefetchNextPage = useCallback(() => {
    if (currentPage >= totalPages || hasPrefetched.current) return;
    
    hasPrefetched.current = true;
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [currentPage, totalPages, queryKey, queryFn, queryClient]);

  // Reset prefetch flag when page changes
  useEffect(() => {
    hasPrefetched.current = false;
  }, [currentPage]);

  // Intersection Observer to trigger prefetch
  useEffect(() => {
    if (!enabled || !triggerRef.current || currentPage >= totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          prefetchNextPage();
        }
      },
      { rootMargin: '300px' } // Trigger 300px before element is visible
    );

    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [enabled, currentPage, totalPages, prefetchNextPage]);

  return triggerRef;
}
