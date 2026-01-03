'use client';

import { useState } from 'react';
import { WPPost } from '@/lib/wordpress';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { usePosts } from '@/hooks/useWordPress';

interface TagContentProps {
  tagId: number;
  initialPosts: WPPost[];
  initialTotalPages: number;
}

export function TagContent({ tagId, initialPosts, initialTotalPages }: TagContentProps) {
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = usePosts(
    { tags: [tagId], page, perPage: 12 },
    {
      initialData: page === 1 ? { posts: initialPosts, totalPages: initialTotalPages, total: 0 } : undefined,
    }
  );

  const posts = data?.posts || initialPosts;
  const totalPages = data?.totalPages || initialTotalPages;

  return (
    <>
      <PostGrid
        posts={posts}
        isLoading={isLoading && page !== 1}
      />

      <PaginationNav
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  );
}
