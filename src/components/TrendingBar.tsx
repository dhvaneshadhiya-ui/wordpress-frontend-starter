import { Link } from 'react-router-dom';
import { usePosts } from '@/hooks/useWordPress';
import { TrendingUp } from 'lucide-react';

export function TrendingBar() {
  const { data } = usePosts({ perPage: 5 });
  const posts = data?.posts || [];

  if (posts.length === 0) return null;

  return (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 text-sm font-medium text-primary shrink-0">
            <TrendingUp className="h-4 w-4" />
            <span>Trending</span>
          </div>
          <div className="flex items-center gap-4">
            {posts.map((post, index) => (
              <Link
                key={post.id}
                to={`/${post.slug}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                <span className="text-primary font-medium mr-2">{index + 1}</span>
                <span dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
