import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPage, stripHtml } from '@/lib/wordpress';
import { FRONTEND_URL } from '@/lib/constants';

// Static page component for About, Contact, Privacy Policy, etc.
export default function StaticPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: page, isLoading, error } = useQuery({
    queryKey: ['page', slug],
    queryFn: () => fetchPage(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  if (isLoading) {
    return (
      <Layout>
        <SEO 
          title="Loading..."
          url={`${FRONTEND_URL}/${slug}`}
        />
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Skeleton className="mb-4 h-10 w-2/3" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-3/4" />
        </div>
      </Layout>
    );
  }

  if (error || !page) {
    return (
      <Layout>
        <SEO title="Page Not Found" />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  const title = stripHtml(page.title.rendered);
  const canonicalUrl = `${FRONTEND_URL}/${slug}`;

  return (
    <Layout>
      <SEO 
        title={title}
        description={stripHtml(page.excerpt?.rendered || page.content.rendered).slice(0, 160)}
        url={canonicalUrl}
      />
      
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              {title}
            </h1>
          </header>
          
          <div 
            className="prose prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: page.content.rendered }}
          />
        </article>
      </div>
    </Layout>
  );
}
