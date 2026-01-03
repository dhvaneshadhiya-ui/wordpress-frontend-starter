'use client';

import Link from 'next/link';
import { usePosts } from '@/hooks/useWordPress';
import { stripHtml } from '@/lib/wordpress';

export function TrendingBar() {
  const { data, isLoading } = usePosts({ perPage: 6 });

  if (isLoading || !data?.posts.length) return null;

  return (
    <div className="bg-secondary/50 border-b border-border py-2 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--trending))]">
            Trending
          </span>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {data.posts.map((post) => (
              <Link
                key={post.id}
                href={`/${post.slug}`}
                className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors line-clamp-1"
              >
                {stripHtml(post.title.rendered)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
