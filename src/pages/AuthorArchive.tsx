import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAuthorBySlug, WPAuthor } from '@/lib/wordpress';
import { usePosts } from '@/hooks/useWordPress';
import Layout from '@/components/Layout';
import PostGrid from '@/components/PostGrid';
import PaginationNav from '@/components/PaginationNav';
import SEO from '@/components/SEO';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AuthorArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);

  const { data: author, isLoading: authorLoading } = useQuery({
    queryKey: ['author', slug],
    queryFn: () => fetchAuthorBySlug(slug!),
    enabled: !!slug,
  });

  const { data: postsData, isLoading: postsLoading } = usePosts(
    { page, perPage: 9, author: author?.id },
    { enabled: !!author }
  );

  if (authorLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!author) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Author Not Found</h1>
          <p className="text-muted-foreground mb-6">The author you're looking for doesn't exist.</p>
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
        title={`${author.name} - iGeeksBlog`}
        description={author.description || `Articles written by ${author.name}`}
        image={author.avatar_urls?.['96']}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm mb-6">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={author.avatar_urls?.['96']} alt={author.name} />
              <AvatarFallback className="text-2xl">
                {author.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{author.name}</h1>
              {author.description && (
                <p className="text-muted-foreground max-w-2xl">{author.description}</p>
              )}
              {postsData && (
                <p className="text-sm text-muted-foreground mt-2">
                  {postsData.total} {postsData.total === 1 ? 'article' : 'articles'}
                </p>
              )}
            </div>
          </div>
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
