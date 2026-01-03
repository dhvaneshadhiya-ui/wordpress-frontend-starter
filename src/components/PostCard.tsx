import { Link } from 'react-router-dom';
import { WPPost, getFeaturedImageUrl, getAuthor, getCategories, getReadingTime, formatDate } from '@/lib/wordpress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface PostCardProps {
  post: WPPost;
  variant?: 'default' | 'featured';
}

const getCategoryColor = (slug: string): string => {
  const colors: Record<string, string> = {
    'iphone': 'bg-blue-500',
    'mac': 'bg-gray-700',
    'ipad': 'bg-purple-500',
    'apps': 'bg-green-500',
    'how-to': 'bg-orange-500',
  };
  return colors[slug] || 'bg-primary';
};

export function PostCard({ post, variant = 'default' }: PostCardProps) {
  const featuredImage = getFeaturedImageUrl(post, 'medium_large');
  const author = getAuthor(post);
  const categories = getCategories(post);
  const readingTime = getReadingTime(post.content.rendered);
  const formattedDate = formatDate(post.date);
  const primaryCategory = categories[0];

  return (
    <Link
      to={`/${post.slug}`}
      className="group relative block overflow-hidden rounded-xl aspect-[4/3]"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={{
          backgroundImage: featuredImage
            ? `url(${featuredImage})`
            : 'linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted-foreground)) 100%)',
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        {/* Category Badge */}
        {primaryCategory && (
          <Badge className={`${getCategoryColor(primaryCategory.slug)} text-white mb-2 w-fit`}>
            {primaryCategory.name}
          </Badge>
        )}

        {/* Title */}
        <h3
          className="text-white font-bold text-lg line-clamp-2 mb-2"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />

        {/* Meta */}
        <div className="flex items-center gap-3 text-white/80 text-sm">
          {author && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
              </Avatar>
              <span>{author.name}</span>
            </div>
          )}
          <span>•</span>
          <span>{formattedDate}</span>
          <span>•</span>
          <span>{readingTime} min</span>
        </div>
      </div>
    </Link>
  );
}
