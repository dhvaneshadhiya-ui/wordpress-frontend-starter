'use client';

import { useState } from 'react';
import { WPPost } from '@/lib/wordpress';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { usePosts } from '@/hooks/useWordPress';

interface HomeContentProps {
  initialPosts: WPPost[];
  initialTotalPages: number;
}

export function HomeContent({ initialPosts, initialTotalPages }: HomeContentProps) {
  const [page, setPage] = useState(1);
  
  // Use React Query for client-side pagination, with initial data from server
  const { data, isLoading } = usePosts(
    { page, perPage: 9 },
    {
      initialData: page === 1 ? { posts: initialPosts, totalPages: initialTotalPages, total: 0 } : undefined,
    }
  );

  const posts = data?.posts || initialPosts;
  const totalPages = data?.totalPages || initialTotalPages;

  return (
    <>
      {/* Latest News Section */}
      <PostGrid
        posts={posts}
        isLoading={isLoading && page !== 1}
        title="Latest Articles"
      />

      {/* Pagination */}
      <PaginationNav
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Newsletter Section */}
      <section className="py-12">
        <NewsletterSignup />
      </section>
    </>
  );
}
