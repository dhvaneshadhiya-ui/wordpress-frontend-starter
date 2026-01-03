import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { usePosts, useCategories } from '@/hooks/useWordPress';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoryArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const category = categoriesData?.find(c => c.slug === slug);
  
  const { data: postsData, isLoading: postsLoading } = usePosts({
    page: currentPage,
    perPage: 9,
    categories: category ? [category.id] : undefined,
  }, {
    enabled: !!category,
  });

  if (categoriesLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-1/3 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title={`${category.name} - iGeeksBlog`}
        description={category.description || `Browse all ${category.name} articles on iGeeksBlog`}
      />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: category.description }} />
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {postsData?.total || 0} articles
          </p>
        </section>

        <PostGrid posts={postsData?.posts || []} isLoading={postsLoading} />
        
        {postsData && (
          <PaginationNav
            currentPage={currentPage}
            totalPages={postsData.totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </main>
    </Layout>
  );
}
