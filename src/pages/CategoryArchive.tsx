import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { useCategory, useCategoryPosts } from '@/hooks/useWordPress';
import { usePrefetchNextPage } from '@/hooks/usePrefetchNextPage';
import { fetchPosts } from '@/lib/wordpress';
import { transformContentLinks } from '@/lib/content-utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoryArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const { data: category, isLoading: categoryLoading } = useCategory(slug);
  const { data: postsData, isLoading: postsLoading, isFetching } = useCategoryPosts(slug, page);

  // Prefetch next page when user scrolls near pagination
  const prefetchRef = usePrefetchNextPage({
    currentPage: page,
    totalPages: postsData?.totalPages || 1,
    queryKey: ['categoryPosts', slug, page + 1],
    queryFn: () => fetchPosts({ 
      categories: [category!.id], 
      page: page + 1, 
      perPage: 12 
    }),
    enabled: !!category && !!postsData,
  });

  if (categoryLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-2 h-10 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <SEO title="Category Not Found" />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Category not found</h1>
          <p className="mt-2 text-muted-foreground">The category you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title={category.name}
        description={category.description || `Browse all ${category.name} articles on iGeeksBlog`}
        url={`https://wp.dev.igeeksblog.com/category/${category.slug}`}
        category={category}
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
        {/* Category Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            {category.name}
          </h1>
          {category.description && (
            <div 
              className="mt-2 text-muted-foreground prose prose-sm dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: transformContentLinks(category.description) }}
            />
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {category.count} {category.count === 1 ? 'article' : 'articles'}
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
