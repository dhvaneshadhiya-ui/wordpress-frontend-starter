import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { usePosts } from '@/hooks/useWordPress';
import { SEO } from '@/components/SEO';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFeaturedImageUrl } from '@/lib/wordpress';
import { FRONTEND_URL } from '@/lib/constants';
import { OfflineBanner } from '@/components/OfflineBanner';
import { usePrerenderReady } from '@/hooks/usePrerenderReady';
import demoPosts from '@/data/demo-posts.json';
import type { WPPost } from '@/lib/wordpress';

// Cast demo posts for comparison
const typedDemoPosts = demoPosts as unknown as WPPost[];

const Index = () => {
  const { data, isLoading, isFetching, error, refetch } = usePosts({ perPage: 12 });
  const posts = data?.posts ?? [];
  const showLoading = isLoading && posts.length === 0;
  
  // Signal prerender ready when posts are loaded
  usePrerenderReady(!isLoading && posts.length > 0);
  
  // Hide "updating" indicator after timeout if API keeps failing
  const [showUpdating, setShowUpdating] = useState(true);
  
  useEffect(() => {
    if (isFetching) {
      setShowUpdating(true);
      // Hide updating indicator after 10 seconds if still fetching
      const timeout = setTimeout(() => {
        setShowUpdating(false);
      }, 10000);
      return () => clearTimeout(timeout);
    } else {
      setShowUpdating(false);
    }
  }, [isFetching]);
  
  // Detect if we're showing demo/cached data due to API failure
  const isOffline = useMemo(() => {
    if (!error) return false;
    // Check if posts match demo posts (API failed, showing fallback)
    if (posts.length > 0 && posts.length === typedDemoPosts.length) {
      return posts[0]?.id === typedDemoPosts[0]?.id;
    }
    return false;
  }, [error, posts]);
  
  // Check if showing cached data (not demo) during API failure
  const isShowingCached = error && posts.length > 0 && !isOffline;

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
      
      {/* Offline/cached content banner */}
      <OfflineBanner isVisible={isOffline || isShowingCached} isUsingDemoData={isOffline} />
      
      <div className="container mx-auto px-4">
        {/* Screen reader only H1 for SEO */}
        <h1 className="sr-only">iGeeksBlog - Apple News, Tips & Reviews</h1>
        
        {/* Background refresh indicator - with timeout to prevent infinite display */}
        {isFetching && !isLoading && showUpdating && (
          <div className="fixed top-20 right-4 z-50">
            <div className="bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
              <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              Updating...
            </div>
          </div>
        )}
        
        {/* Retry button when showing offline content */}
        {(isOffline || isShowingCached) && !isFetching && (
          <div className="flex justify-center py-4">
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </Button>
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
