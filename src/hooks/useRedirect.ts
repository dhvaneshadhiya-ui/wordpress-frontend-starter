import { useQuery } from '@tanstack/react-query';
import { checkRedirect, RedirectInfo } from '@/lib/wordpress';

export function useRedirect(slug: string | undefined) {
  return useQuery<RedirectInfo>({
    queryKey: ['redirect', slug],
    queryFn: () => checkRedirect(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false, // Don't retry redirect checks
  });
}
