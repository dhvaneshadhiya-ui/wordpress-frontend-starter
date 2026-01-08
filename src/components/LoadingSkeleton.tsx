export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-40 rounded bg-muted skeleton-shimmer" />
            <div className="hidden md:flex gap-4">
              <div className="h-6 w-20 rounded bg-muted skeleton-shimmer" />
              <div className="h-6 w-20 rounded bg-muted skeleton-shimmer" />
              <div className="h-6 w-20 rounded bg-muted skeleton-shimmer" />
            </div>
            <div className="h-8 w-8 rounded-full bg-muted skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Trending bar skeleton */}
      <div className="border-b border-border bg-muted/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-4 overflow-hidden">
            <div className="h-5 w-24 flex-shrink-0 rounded bg-muted skeleton-shimmer" />
            <div className="h-5 w-48 flex-shrink-0 rounded bg-muted skeleton-shimmer" />
            <div className="h-5 w-36 flex-shrink-0 rounded bg-muted skeleton-shimmer" />
            <div className="h-5 w-52 flex-shrink-0 rounded bg-muted skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="container mx-auto px-4 py-8">
        {/* Section heading */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-6 w-1 rounded bg-primary" />
          <div className="h-7 w-40 rounded bg-muted skeleton-shimmer" />
        </div>

        {/* Post grid skeleton */}
        <PostGridSkeleton />
      </main>
    </div>
  );
}

export function PostGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  );
}
