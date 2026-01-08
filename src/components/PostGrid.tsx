import { WPPost } from '@/lib/wordpress';
import { PostCard } from './PostCard';
import { Skeleton } from '@/components/ui/skeleton';

interface PostGridProps {
  posts: WPPost[];
  isLoading?: boolean;
  title?: string;
  headingId?: string;
}

export function PostGrid({ posts, isLoading, title, headingId }: PostGridProps) {
  const HeadingContent = () => (
    <h2 
      id={headingId} 
      className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground"
    >
      <span className="h-6 w-1 rounded bg-primary" />
      {title}
    </h2>
  );

  if (isLoading) {
    return (
      <div className="py-8">
        {title && <HeadingContent />}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden">
              <Skeleton className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="py-8">
        {title && <HeadingContent />}
        <p className="text-muted-foreground">No posts found.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      {title && <HeadingContent />}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
