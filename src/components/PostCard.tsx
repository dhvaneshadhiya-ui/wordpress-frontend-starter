import { Link } from 'react-router-dom';
import { WPPost } from '@/lib/wordpress';
import { format } from 'date-fns';
import { Calendar, User } from 'lucide-react';

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

interface PostCardProps {
  post: WPPost;
}

export default function PostCard({ post }: PostCardProps) {
  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const author = post._embedded?.author?.[0];
  const categories = post._embedded?.['wp:term']?.[0] || [];

  return (
    <article className="group bg-card rounded-lg overflow-hidden border hover:shadow-lg transition-shadow">
      {/* Featured Image */}
      <Link to={`/${post.slug}`} className="block aspect-video overflow-hidden">
        {featuredImage ? (
          <img
            src={featuredImage}
            alt={stripHtml(post.title.rendered)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No image</span>
          </div>
        )}
      </Link>

      <div className="p-4">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {categories.slice(0, 2).map((cat: any) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          <Link to={`/${post.slug}`} dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
        </h2>

        {/* Excerpt */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {stripHtml(post.excerpt.rendered)}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {author && (
            <Link 
              to={`/author/${author.slug}`}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <User className="h-3 w-3" />
              {author.name}
            </Link>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(post.date), 'MMM d, yyyy')}
          </div>
        </div>
      </div>
    </article>
  );
}
