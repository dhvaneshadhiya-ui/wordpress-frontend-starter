import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTagBySlug, WPTag } from '@/lib/wordpress';
import { usePosts } from '@/hooks/useWordPress';
import Layout from '@/components/Layout';
import PostGrid from '@/components/PostGrid';
import PaginationNav from '@/components/PaginationNav';
import SEO from '@/components/SEO';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TagArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);

  const { data: tag, isLoading: tagLoading } = useQuery({
    queryKey: ['tag', slug],
    queryFn: () => fetchTagBySlug(slug!),
    enabled: !!slug,
  });

  const { data: postsData, isLoading: postsLoading } = usePosts(
    { page, perPage: 9, tags: tag ? [tag.id] : [] },
    { enabled: !!tag }
  );

  if (tagLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96 mb-8" />
        </div>
      </Layout>
    );
  }

  if (!tag) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Tag Not Found</h1>
          <p className="text-muted-foreground mb-6">The tag you're looking for doesn't exist.</p>
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
        title={`#${tag.name} - iGeeksBlog`}
        description={tag.description || `Browse all posts tagged with ${tag.name}`}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">#{tag.name}</h1>
          {tag.description && (
            <p className="text-muted-foreground">{tag.description}</p>
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
