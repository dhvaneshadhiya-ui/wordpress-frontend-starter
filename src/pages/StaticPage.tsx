import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { fetchPage, stripHtml } from '@/lib/wordpress';
import { FRONTEND_URL } from '@/lib/constants';
import { RefreshCw } from 'lucide-react';
import { usePrerenderReady } from '@/hooks/usePrerenderReady';
import staticPages from '@/data/static-pages.json';

interface StaticPageProps {
  slug?: string;
}

// Static page component for About, Contact, Privacy Policy, etc.
export default function StaticPage({ slug: propSlug }: StaticPageProps) {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const slug = propSlug || paramSlug;
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  const { data: page, isLoading, error, refetch } = useQuery({
    queryKey: ['page', slug],
    queryFn: () => fetchPage(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });
  
  // Signal prerender ready when page is loaded
  usePrerenderReady(!isLoading && !!page);

  // Loading timeout - show error after 15 seconds
  useEffect(() => {
    if (isLoading) {
      setLoadingTimeout(false);
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // Get fallback content for this page
  const fallbackPage = slug ? staticPages[slug as keyof typeof staticPages] : null;

  if (isLoading && !loadingTimeout) {
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

  // Use API data, or fallback if error/timeout, or show not found
  const displayPage = page || (error || loadingTimeout ? fallbackPage : null);

  if (!displayPage) {
    return (
      <Layout>
        <SEO title="Page Not Found" url={`${FRONTEND_URL}/${slug}`} />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist.</p>
          {(error || loadingTimeout) && (
            <Button onClick={() => refetch()} className="mt-4" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </Layout>
    );
  }

  const title = stripHtml(displayPage.title.rendered);
  const canonicalUrl = `${FRONTEND_URL}/${slug}`;
  const isFallback = !page && !!fallbackPage;

  return (
    <Layout>
      <SEO 
        title={title}
        description={stripHtml(displayPage.excerpt?.rendered || displayPage.content.rendered).slice(0, 160)}
        url={canonicalUrl}
      />
      
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {isFallback && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <p>Showing cached content. Some information may be outdated.</p>
            <Button onClick={() => refetch()} variant="link" className="p-0 h-auto text-amber-700 dark:text-amber-300">
              <RefreshCw className="mr-1 h-3 w-3" />
              Refresh
            </Button>
          </div>
        )}
        
        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              {title}
            </h1>
          </header>
          
          <div 
            className="prose prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: displayPage.content.rendered }}
          />
        </article>
      </div>
    </Layout>
  );
}
