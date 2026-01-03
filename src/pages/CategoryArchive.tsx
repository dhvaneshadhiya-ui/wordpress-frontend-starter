import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCategoryBySlug, WPCategory } from '@/lib/wordpress';
import { usePosts } from '@/hooks/useWordPress';
import Layout from '@/components/Layout';
import PostGrid from '@/components/PostGrid';
import PaginationNav from '@/components/PaginationNav';
import SEO from '@/components/SEO';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoryArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => fetchCategoryBySlug(slug!),
    enabled: !!slug,
  });

  const { data: postsData, isLoading: postsLoading } = usePosts(
    { page, perPage: 9, categories: category ? [category.id] : [] },
    { enabled: !!category }
  );

  if (categoryLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96 mb-8" />
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-6">The category you're looking for doesn't exist.</p>
          <Link to="/" className="text-primary hover:underline inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title={`${category.name} - iGeeksBlog`}
        description={category.description || `Browse all posts in ${category.name}`}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground">{category.description}</p>
          )}
          {postsData && (
            <p className="text-sm text-muted-foreground mt-2">
              {postsData.total} {postsData.total === 1 ? 'post' : 'posts'}
            </p>
          )}
        </div>

        <PostGrid posts={postsData?.posts || []} isLoading={postsLoading} />
        
        {postsData && postsData.totalPages > 1 && (
          <PaginationNav
            currentPage={page}
            totalPages={postsData.totalPages}
            onPageChange={setPage}
          />
        )}
      </main>
    </Layout>
  );
}
