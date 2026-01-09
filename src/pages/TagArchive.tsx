import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { useTag, useTagPosts } from '@/hooks/useWordPress';
import { usePrefetchNextPage } from '@/hooks/usePrefetchNextPage';
import { fetchPosts } from '@/lib/wordpress';
import { Skeleton } from '@/components/ui/skeleton';
import { FRONTEND_URL } from '@/lib/constants';

export default function TagArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const { data: tag, isLoading: tagLoading } = useTag(slug);
  const { data: postsData, isLoading: postsLoading, isFetching } = useTagPosts(slug, page);

  // Prefetch next page when user scrolls near pagination
  const prefetchRef = usePrefetchNextPage({
    currentPage: page,
    totalPages: postsData?.totalPages || 1,
    queryKey: ['tagPosts', slug, page + 1],
    queryFn: () => fetchPosts({ 
      tags: [tag!.id], 
      page: page + 1, 
      perPage: 12 
    }),
    enabled: !!tag && !!postsData,
  });

  if (tagLoading) {
    return (
      <Layout>
        <SEO 
          title="Loading..."
          url={`${FRONTEND_URL}/tag/${slug}`}
        />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-2 h-10 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Layout>
    );
  }

  if (!tag) {
    return (
      <Layout>
        <SEO title="Tag Not Found" />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Tag not found</h1>
          <p className="mt-2 text-muted-foreground">The tag you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title={`${tag.name} Articles`}
        description={`Browse all articles tagged with ${tag.name} on iGeeksBlog`}
        url={`${FRONTEND_URL}/tag/${tag.slug}`}
      />
      
      {/* Background refresh indicator */}
      {isFetching && !postsLoading && (
        <div className="fixed top-20 right-4 z-50">
          <div className="bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
            Updating...
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Tag Header */}
        <header className="mb-8">
          <span className="text-sm font-medium text-primary uppercase tracking-wide">Tag</span>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl mt-1">
            {tag.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {tag.count} {tag.count === 1 ? 'article' : 'articles'}
          </p>
        </header>

        {/* Posts Grid */}
        <PostGrid
          posts={postsData?.posts || []}
          isLoading={postsLoading}
        />

        {/* Prefetch trigger */}
        <div ref={prefetchRef} className="h-1" aria-hidden="true" />

        {/* Pagination */}
        {postsData && (
          <PaginationNav
            currentPage={page}
            totalPages={postsData.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </Layout>
  );
}
