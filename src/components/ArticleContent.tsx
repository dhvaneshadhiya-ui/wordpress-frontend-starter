import { cn } from '@/lib/utils';
import { transformContentLinks } from '@/lib/content-utils';

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
  if (!html) return null;

  return (
    <div
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
