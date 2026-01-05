import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WPPost, getFeaturedImageUrl, getAuthor, getCategories, getReadingTime, formatDate, stripHtml } from '@/lib/wordpress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface PostCardProps {
  post: WPPost;
  variant?: 'default' | 'featured';
}

// Map category slugs to color classes
function getCategoryColor(slug: string): string {
  const colorMap: Record<string, string> = {
    'how-to': 'bg-[hsl(var(--category-howto))]',
    'news': 'bg-[hsl(var(--category-news))]',
    'apps': 'bg-[hsl(var(--category-apps))]',
    'iphone': 'bg-[hsl(var(--category-iphone))]',
  };
  return colorMap[slug] || 'bg-[hsl(var(--category-default))]';
}

export function PostCard({ post, variant = 'default' }: PostCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // Defensive checks for missing data
  if (!post || !post.id) {
    console.warn('[PostCard] Invalid post data received:', post);
    return null;
  }
  
  const title = post?.title?.rendered ? stripHtml(post.title.rendered) : 'Untitled Post';
  const content = post?.content?.rendered || '';
  const imageUrl = getFeaturedImageUrl(post, 'large');
  const author = getAuthor(post);
  const categories = getCategories(post);
  const readingTime = getReadingTime(content);
  const primaryCategory = categories[0];
  
  // Detect if we need to show fallback (no image or image failed)
  const showFallback = imageError || !imageUrl;

  return (
    <Link
      to={`/${post.slug}`}
      className="group relative block overflow-hidden rounded-lg bg-slate-900 aspect-[4/3]"
    >
      {/* Background Image with error handling */}
      {!showFallback && (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          fetchPriority="auto"
          onError={() => setImageError(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      
      {/* Dark fallback when image fails - ensures white text is visible */}
      {showFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl opacity-20">📰</span>
          </div>
        </div>
      )}
      
      {/* Gradient Overlay - only needed when image loads */}
      {!showFallback && <div className="absolute inset-0 post-card-gradient" />}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
        {/* Category Badge */}
        {primaryCategory && (
          <span
            className={`mb-2 inline-block self-start rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${getCategoryColor(primaryCategory.slug)}`}
          >
            {primaryCategory.name}
          </span>
        )}

        {/* Title */}
        <h3 className="mb-2 text-lg font-bold leading-tight text-white line-clamp-2 sm:text-xl">
          {title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-white/80">
          <Avatar className="h-6 w-6 border border-white/20">
            <AvatarImage src={author.avatar} alt={author.name} loading="lazy" />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span>{formatDate(post.date)}</span>
          <span>•</span>
          <span>{readingTime} min read</span>
        </div>
      </div>
    </Link>
  );
}
