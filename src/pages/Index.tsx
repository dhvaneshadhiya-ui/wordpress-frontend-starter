import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { usePosts } from '@/hooks/useWordPress';
import { SEO } from '@/components/SEO';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFeaturedImageUrl } from '@/lib/wordpress';
import { FRONTEND_URL } from '@/lib/constants';

const Index = () => {
  const { data, isLoading, isFetching, error, refetch } = usePosts({ perPage: 12 });
  const posts = data?.posts ?? [];
  const showLoading = isLoading && posts.length === 0;

  // Preload first 4 post images for faster perceived loading
  useEffect(() => {
    if (posts.length > 0) {
      posts.slice(0, 4).forEach((post) => {
        const img = new Image();
        img.src = getFeaturedImageUrl(post, 'large');
      });
    }
  }, [posts]);

  return (
    <Layout posts={posts}>
      <SEO 
        title="iGeeksBlog - Apple News, Tips & Reviews"
        description="Your daily source for Apple news, how-to guides, tips, and app reviews."
        isHomePage={true}
        url={FRONTEND_URL}
      />
      <div className="container mx-auto px-4">
        {/* Screen reader only H1 for SEO */}
        <h1 className="sr-only">iGeeksBlog - Apple News, Tips & Reviews</h1>
        
        {/* Background refresh indicator */}
        {isFetching && !isLoading && (
          <div className="fixed top-20 right-4 z-50">
            <div className="bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
              <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              Updating...
            </div>
          </div>
        )}
        
        {error && posts.length === 0 ? (
          <section className="py-8" aria-labelledby="error-heading">
            <div className="flex flex-col items-center justify-center text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 id="error-heading" className="text-xl font-semibold text-foreground mb-2">Unable to load articles</h2>
              <p className="text-muted-foreground mb-4">Please check your connection and try again.</p>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          </section>
        ) : (
          <section aria-labelledby="latest-articles">
            <PostGrid 
              posts={posts} 
              isLoading={showLoading}
              title="Latest Articles"
              headingId="latest-articles"
            />
          </section>
        )}
      </div>
    </Layout>
  );
};

export default Index;
