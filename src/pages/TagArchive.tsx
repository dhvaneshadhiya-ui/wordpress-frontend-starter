import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { useTag, useTagPosts } from '@/hooks/useWordPress';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitialTagData, clearInitialData } from '@/utils/hydration';

export default function TagArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const { data: tag, isLoading: tagLoading } = useTag(slug);
  const { data: postsData, isLoading: postsLoading } = useTagPosts(slug, page);

  // Check if we have SSG data (instant render, no loading)
  const hasInitialData = !!getInitialTagData(slug || '');

  // Clear initial data after hydration
  useEffect(() => {
    if (hasInitialData && tag && postsData) {
      const timer = setTimeout(() => clearInitialData(), 100);
      return () => clearTimeout(timer);
    }
  }, [hasInitialData, tag, postsData]);

  // Skip loading state if we have SSG data
  if (tagLoading && !hasInitialData) {
    return (
      <Layout>
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

  const showPostsLoading = postsLoading && !hasInitialData;

  return (
    <Layout>
      <SEO 
        title={`${tag.name} Articles`}
        description={`Browse all articles tagged with ${tag.name} on iGeeksBlog`}
        url={`https://dev.igeeksblog.com/tag/${tag.slug}`}
      />
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
          isLoading={showPostsLoading}
        />

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
