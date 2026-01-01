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
  const imageUrl = getFeaturedImageUrl(post, 'large');
  const author = getAuthor(post);
  const categories = getCategories(post);
  const readingTime = getReadingTime(post.content.rendered);
  const primaryCategory = categories[0];

  return (
    <Link
      to={`/${post.slug}`}
      className="group relative block overflow-hidden rounded-lg bg-card aspect-[4/3]"
    >
      {/* Background Image */}
      <img
        src={imageUrl}
        alt={stripHtml(post.title.rendered)}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 post-card-gradient" />

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
          {stripHtml(post.title.rendered)}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-white/80">
          <Avatar className="h-6 w-6 border border-white/20">
            <AvatarImage src={author.avatar} alt={author.name} />
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
