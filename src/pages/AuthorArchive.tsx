import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { useAuthor, useAuthorPosts } from '@/hooks/useWordPress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthorArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const { data: author, isLoading: authorLoading } = useAuthor(slug);
  const { data: postsData, isLoading: postsLoading } = useAuthorPosts(slug, page);

  if (authorLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div>
              <Skeleton className="mb-2 h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!author) {
    return (
      <Layout>
        <SEO title="Author Not Found" />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Author not found</h1>
          <p className="mt-2 text-muted-foreground">The author you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title={`${author.name} - Author`}
        description={author.description || `Articles written by ${author.name} on iGeeksBlog`}
        url={`https://dev.igeeksblog.com/author/${author.slug}`}
        image={author.avatar_urls?.['96']}
        author={author}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Author Header */}
        <header className="mb-8 flex items-start gap-6">
          <Avatar className="h-20 w-20 border-2 border-border">
            <AvatarImage src={author.avatar_urls?.['96']} alt={author.name} loading="lazy" />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {author.name}
            </h1>
            {author.description && (
              <p className="mt-2 text-muted-foreground max-w-2xl">
                {author.description}
              </p>
            )}
            {postsData && (
              <p className="mt-2 text-sm text-muted-foreground">
                {postsData.total} {postsData.total === 1 ? 'article' : 'articles'}
              </p>
            )}
          </div>
        </header>

        {/* Posts Grid */}
        <PostGrid
          posts={postsData?.posts || []}
          isLoading={postsLoading}
          title="Articles"
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
