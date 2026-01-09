import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const links = container.querySelectorAll('a[href]');
    
    const frontendDomain = FRONTEND_URL.replace(/^https?:\/\//, '');

    // Helper to extract internal path from href
    const getInternalPath = (href: string): string | null => {
      if (href.startsWith('/') && !href.startsWith('//')) {
        return href;
      } else if (href.includes(frontendDomain)) {
        try {
          const url = new URL(href);
          return url.pathname;
        } catch {
          return null;
        }
      }
      return null;
    };

    const handlePrefetch = (e: Event) => {
      const link = e.currentTarget as HTMLAnchorElement;
      const href = link.getAttribute('href');
      if (!href) return;
      
      const path = getInternalPath(href);
      if (!path) return;
      
      const slug = path.replace(/^\//, '').replace(/\/$/, '');
      
      // Only prefetch posts (no slashes in slug)
      if (slug && !slug.includes('/') && slug.length > 0) {
        prefetchPost(slug);
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Don't intercept if modifier keys are pressed
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      
      const link = e.currentTarget as HTMLAnchorElement;
      const href = link.getAttribute('href');
      if (!href) return;
      
      const path = getInternalPath(href);
      if (!path) return;
      
      // Prevent default navigation and use React Router
      e.preventDefault();
      navigate(path);
    };

    links.forEach(link => {
      link.addEventListener('mouseenter', handlePrefetch);
      link.addEventListener('focus', handlePrefetch);
      link.addEventListener('click', handleClick);
    });

    return () => {
      links.forEach(link => {
        link.removeEventListener('mouseenter', handlePrefetch);
        link.removeEventListener('focus', handlePrefetch);
        link.removeEventListener('click', handleClick);
      });
    };
  }, [html, prefetchPost, navigate]);

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
