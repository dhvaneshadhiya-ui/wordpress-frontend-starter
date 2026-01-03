import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { usePosts } from '@/hooks/useWordPress';

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export default function TrendingBar() {
  const { data } = usePosts({ perPage: 5 });
  const trendingPosts = data?.posts || [];

  if (trendingPosts.length === 0) return null;

  return (
    <div className="bg-muted/50 border-b overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 py-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 text-primary shrink-0">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-semibold">Trending</span>
          </div>
          <div className="flex items-center gap-4">
            {trendingPosts.map((post, index) => (
              <Link
                key={post.id}
                to={`/${post.slug}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap shrink-0"
              >
                <span className="text-primary font-medium mr-2">{index + 1}.</span>
                {stripHtml(post.title.rendered).slice(0, 50)}
                {stripHtml(post.title.rendered).length > 50 ? '...' : ''}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
