import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { SEO } from '@/components/SEO';
import { usePosts } from '@/hooks/useWordPress';
import { fetchAuthorBySlug, WPAuthor } from '@/lib/wordpress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';

export default function AuthorArchive() {
  const { slug } = useParams<{ slug: string }>();
  const [currentPage, setCurrentPage] = useState(1);
  const [author, setAuthor] = useState<WPAuthor | null>(null);
  const [authorLoading, setAuthorLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      setAuthorLoading(true);
      fetchAuthorBySlug(slug)
        .then(setAuthor)
        .catch(() => setAuthor(null))
        .finally(() => setAuthorLoading(false));
    }
  }, [slug]);

  const { data: postsData, isLoading: postsLoading } = usePosts({
    page: currentPage,
    perPage: 9,
    author: author?.id,
  }, {
    enabled: !!author,
  });

  if (authorLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
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
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Author not found</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title={`${author.name} - iGeeksBlog`}
        description={author.description || `Articles by ${author.name} on iGeeksBlog`}
        image={author.avatar_urls?.['96']}
      />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={author.avatar_urls?.['96']} alt={author.name} />
              <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{author.name}</h1>
              <p className="text-muted-foreground">
                {postsData?.total || 0} articles
              </p>
            </div>
          </div>
          {author.description && (
            <p className="text-muted-foreground max-w-2xl" dangerouslySetInnerHTML={{ __html: author.description }} />
          )}
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
