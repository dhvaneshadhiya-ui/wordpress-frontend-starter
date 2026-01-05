import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WPPost, getFeaturedImageUrl, getAuthor, getCategories, getReadingTime, formatDate, stripHtml } from '@/lib/wordpress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface PostCardProps {
  post: WPPost;
  variant?: 'default' | 'featured';
}

// Category colors with inline fallbacks
const CATEGORY_COLORS: Record<string, string> = {
  'how-to': '#22c55e',
  'news': '#ef4444',
  'apps': '#8b5cf6',
  'iphone': '#3b82f6',
};

export function PostCard({ post, variant = 'default' }: PostCardProps) {
  const [imageError, setImageError] = useState(false);
  
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
  
  const showFallback = imageError || !imageUrl;
  const categoryColor = primaryCategory ? (CATEGORY_COLORS[primaryCategory.slug] || '#6b7280') : '#6b7280';

  return (
    <Link
      to={`/${post.slug}`}
      className="group relative block overflow-hidden rounded-lg aspect-[4/3]"
      style={{ backgroundColor: '#1e293b' }}
    >
      {/* Background Image */}
      {!showFallback && (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      
      {/* Dark fallback with gradient */}
      {showFallback && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)' }}
        >
          <span style={{ fontSize: '4rem', opacity: 0.2 }}>📰</span>
        </div>
      )}
      
      {/* Gradient Overlay for image */}
      {!showFallback && (
        <div 
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }}
        />
      )}

      {/* Content - always visible */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
        {/* Category Badge */}
        {primaryCategory && (
          <span
            className="mb-2 inline-block self-start rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: categoryColor, color: '#ffffff' }}
          >
            {primaryCategory.name}
          </span>
        )}

        {/* Title */}
        <h3 
          className="mb-2 text-lg font-bold leading-tight line-clamp-2 sm:text-xl"
          style={{ color: '#ffffff' }}
        >
          {title}
        </h3>

        {/* Meta */}
        <div 
          className="flex items-center gap-3 text-sm"
          style={{ color: 'rgba(255,255,255,0.8)' }}
        >
          <Avatar className="h-6 w-6" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
            <AvatarImage src={author.avatar} alt={author.name} loading="lazy" />
            <AvatarFallback 
              className="text-xs"
              style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
            >
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
