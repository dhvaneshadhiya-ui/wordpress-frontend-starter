import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { usePosts } from '@/hooks/useWordPress';

export default function Index() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading } = usePosts({ page: currentPage, perPage: 9 });

  return (
    <Layout>
      <SEO 
        title="iGeeksBlog - Apple News, Tips & Reviews"
        description="Get the latest Apple news, iPhone tips, Mac tutorials, and expert reviews from iGeeksBlog."
      />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Latest Articles</h1>
          <p className="text-muted-foreground">
            Stay updated with the latest Apple news, tips, and reviews
          </p>
        </section>

        <PostGrid posts={data?.posts || []} isLoading={isLoading} />
        
        {data && (
          <PaginationNav
            currentPage={currentPage}
            totalPages={data.totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </main>
    </Layout>
  );
}
