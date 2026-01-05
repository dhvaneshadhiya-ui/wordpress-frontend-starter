import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { useCategory, useCategoryPosts } from '@/hooks/useWordPress';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitialCategoryData, clearInitialData } from '@/utils/hydration';

export default function CategoryArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const { data: category, isLoading: categoryLoading } = useCategory(slug);
  const { data: postsData, isLoading: postsLoading } = useCategoryPosts(slug, page);

  // Check if we have SSG data (instant render, no loading)
  const hasInitialData = !!getInitialCategoryData(slug || '');

  // Clear initial data after hydration
  useEffect(() => {
    if (hasInitialData && category && postsData) {
      const timer = setTimeout(() => clearInitialData(), 100);
      return () => clearTimeout(timer);
    }
  }, [hasInitialData, category, postsData]);

  // Skip loading state if we have SSG data
  if (categoryLoading && !hasInitialData) {
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

  const showPostsLoading = postsLoading && !hasInitialData;

  return (
    <Layout>
      <SEO 
        title={category.name}
        description={category.description || `Browse all ${category.name} articles on iGeeksBlog`}
        url={`https://dev.igeeksblog.com/category/${category.slug}`}
        category={category}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Category Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-2 text-muted-foreground">{category.description}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {category.count} {category.count === 1 ? 'article' : 'articles'}
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
