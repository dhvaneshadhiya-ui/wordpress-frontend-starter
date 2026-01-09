import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { transformContentLinks } from '@/lib/content-utils';
import { usePrefetchPost } from '@/hooks/usePrefetch';
import { FRONTEND_URL } from '@/lib/constants';

interface ArticleContentProps {
  html: string;
  size?: 'sm' | 'base' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'prose-sm',
  base: 'prose-base',
  lg: 'prose-lg',
};

export function ArticleContent({ 
  html, 
  size = 'base', 
  className 
}: ArticleContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefetchPost = usePrefetchPost();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const links = container.querySelectorAll('a[href]');
    
    const frontendDomain = FRONTEND_URL.replace(/^https?:\/\//, '');

    const handlePrefetch = (e: Event) => {
      const link = e.currentTarget as HTMLAnchorElement;
      const href = link.getAttribute('href');
      
      if (!href) return;
      
      let slug: string | null = null;
      
      if (href.startsWith('/') && !href.startsWith('//')) {
        slug = href.replace(/^\//, '').replace(/\/$/, '');
      } else if (href.includes(frontendDomain)) {
        const url = new URL(href);
        slug = url.pathname.replace(/^\//, '').replace(/\/$/, '');
      }
      
      // Only prefetch posts (no slashes in slug)
      if (slug && !slug.includes('/') && slug.length > 0) {
        prefetchPost(slug);
      }
    };

    links.forEach(link => {
      link.addEventListener('mouseenter', handlePrefetch);
      link.addEventListener('focus', handlePrefetch);
    });

    return () => {
      links.forEach(link => {
        link.removeEventListener('mouseenter', handlePrefetch);
        link.removeEventListener('focus', handlePrefetch);
      });
    };
  }, [html, prefetchPost]);

  if (!html) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'prose max-w-none dark:prose-invert',
        'prose-headings:text-foreground',
        'prose-p:text-foreground/90',
        'prose-a:text-primary',
        'prose-strong:text-foreground',
        sizeClasses[size],
        className
      )}
      dangerouslySetInnerHTML={{ 
        __html: transformContentLinks(html) 
      }}
    />
  );
}
