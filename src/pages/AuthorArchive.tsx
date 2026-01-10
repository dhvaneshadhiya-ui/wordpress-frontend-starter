import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { ArticleContent } from '@/components/ArticleContent';
import { useAuthor, useAuthorPosts } from '@/hooks/useWordPress';
import { usePrefetchNextPage } from '@/hooks/usePrefetchNextPage';
import { fetchPosts } from '@/lib/wordpress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FRONTEND_URL } from '@/lib/constants';
import { RefreshCw } from 'lucide-react';
import { usePrerenderReady } from '@/hooks/usePrerenderReady';

export default function AuthorArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const { data: author, isLoading: authorLoading, refetch } = useAuthor(slug);
  const { data: postsData, isLoading: postsLoading, isFetching } = useAuthorPosts(slug, page);
  
  // Signal prerender ready when author and posts are loaded
  usePrerenderReady(!authorLoading && !postsLoading && !!author);

  // Loading timeout - show error after 15 seconds
  useEffect(() => {
    if (authorLoading) {
      setLoadingTimeout(false);
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000);
      return () => clearTimeout(timeout);
    }
  }, [authorLoading]);

  // Prefetch next page when user scrolls near pagination
  const prefetchRef = usePrefetchNextPage({
    currentPage: page,
    totalPages: postsData?.totalPages || 1,
    queryKey: ['authorPosts', slug, page + 1],
    queryFn: () => fetchPosts({ 
      author: author!.id, 
      page: page + 1, 
      perPage: 12 
    }),
    enabled: !!author && !!postsData,
  });

  if (authorLoading && !loadingTimeout) {
    return (
      <Layout>
        <SEO 
          title="Loading..."
          url={`${FRONTEND_URL}/author/${slug}`}
        />
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

  if (!author || loadingTimeout) {
    return (
      <Layout>
        <SEO title="Author Not Found" url={`${FRONTEND_URL}/author/${slug}`} />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {loadingTimeout ? 'Unable to load author' : 'Author not found'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {loadingTimeout 
              ? 'The server is taking too long to respond. Please try again.' 
              : "The author you're looking for doesn't exist."
            }
          </p>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title={`${author.name} - Author`}
        description={author.description || `Articles written by ${author.name} on iGeeksBlog`}
        url={`${FRONTEND_URL}/author/${author.slug}`}
        image={author.avatar_urls?.['96']}
        author={author}
        posts={postsData?.posts}
      />
      
      {/* Background refresh indicator */}
      {isFetching && !postsLoading && (
        <div className="fixed top-20 right-4 z-50">
          <div className="bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
            Updating...
          </div>
        </div>
      )}

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
              <ArticleContent html={author.description} size="sm" className="mt-2 text-muted-foreground max-w-2xl" />
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

        {/* Prefetch trigger */}
        <div ref={prefetchRef} className="h-1" aria-hidden="true" />

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
