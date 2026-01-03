'use client';

import { useState } from 'react';
import { WPPost } from '@/lib/wordpress';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { usePosts } from '@/hooks/useWordPress';

interface AuthorContentProps {
  authorId: number;
  initialPosts: WPPost[];
  initialTotalPages: number;
}

export function AuthorContent({ authorId, initialPosts, initialTotalPages }: AuthorContentProps) {
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = usePosts(
    { author: authorId, page, perPage: 12 },
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
        title="Articles"
      />

      <PaginationNav
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  );
}
