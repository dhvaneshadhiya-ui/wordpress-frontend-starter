import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { usePosts } from '@/hooks/useWordPress';
import { fetchTagBySlug, WPTag } from '@/lib/wordpress';
import { Skeleton } from '@/components/ui/skeleton';

export default function TagArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [currentPage, setCurrentPage] = useState(1);
  const [tag, setTag] = useState<WPTag | null>(null);
  const [tagLoading, setTagLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      setTagLoading(true);
      fetchTagBySlug(slug)
        .then(setTag)
        .catch(() => setTag(null))
        .finally(() => setTagLoading(false));
    }
  }, [slug]);

  const { data: postsData, isLoading: postsLoading } = usePosts({
    page: currentPage,
    perPage: 9,
    tags: tag ? [tag.id] : undefined,
  }, {
    enabled: !!tag,
  });

  if (tagLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-1/3 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
        </div>
      </Layout>
    );
  }

  if (!tag) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Tag not found</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title={`${tag.name} - iGeeksBlog`}
        description={`Browse all articles tagged with ${tag.name} on iGeeksBlog`}
      />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <p className="text-sm text-muted-foreground mb-2">Tag</p>
          <h1 className="text-4xl font-bold mb-2">{tag.name}</h1>
          <p className="text-sm text-muted-foreground">
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
