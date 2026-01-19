import { WPPost } from '@/lib/wordpress';
import { PostCard } from './PostCard';

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

  // Use semantic <section> when title is provided (standalone content block)
  const Wrapper = title ? 'section' : 'div';
  const wrapperProps = title ? { 'aria-labelledby': headingId } : {};

  if (isLoading) {
    return (
      <Wrapper className="py-8" {...wrapperProps}>
        {title && <HeadingContent />}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <article 
              key={i} 
              className="bg-card rounded-lg overflow-hidden border border-border"
              aria-hidden="true"
            >
              {/* Image skeleton with shimmer */}
              <div className="aspect-video bg-muted skeleton-shimmer" />
              <div className="p-4 space-y-3">
                {/* Category badge */}
                <div className="h-5 w-16 rounded bg-muted skeleton-shimmer" />
                {/* Title (2 lines) */}
                <div className="space-y-2">
                  <div className="h-5 w-full rounded bg-muted skeleton-shimmer" />
                  <div className="h-5 w-3/4 rounded bg-muted skeleton-shimmer" />
                </div>
                {/* Excerpt */}
                <div className="h-4 w-full rounded bg-muted skeleton-shimmer" />
                {/* Author + date */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-8 w-8 rounded-full bg-muted skeleton-shimmer" />
                  <div className="h-4 w-24 rounded bg-muted skeleton-shimmer" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </Wrapper>
    );
  }

  if (!posts.length) {
    return (
      <Wrapper className="py-8" {...wrapperProps}>
        {title && <HeadingContent />}
        <p className="text-muted-foreground">No posts found.</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper className="py-8" {...wrapperProps}>
      {title && <HeadingContent />}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </Wrapper>
  );
}
