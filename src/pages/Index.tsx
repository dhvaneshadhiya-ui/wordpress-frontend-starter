import { useState } from 'react';
import { usePosts, useCategories } from '@/hooks/useWordPress';
import Layout from '@/components/Layout';
import PostGrid from '@/components/PostGrid';
import PaginationNav from '@/components/PaginationNav';
import SEO from '@/components/SEO';

export default function Index() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = usePosts({ page, perPage: 9 });
  const { data: categories } = useCategories();

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-destructive">Failed to load posts. Please try again later.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title="iGeeksBlog - Apple News, iPhone, iPad, Mac, How-To"
        description="Your daily source for Apple news, reviews, tips and how-to guides for iPhone, iPad, Mac, Apple Watch and more."
      />
      
      <main className="container mx-auto px-4 py-8">
        <PostGrid posts={data?.posts || []} isLoading={isLoading} />
        
        {data && data.totalPages > 1 && (
          <PaginationNav
            currentPage={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        )}
      </main>
    </Layout>
  );
}
