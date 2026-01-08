import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { usePosts } from '@/hooks/useWordPress';
import { SEO } from '@/components/SEO';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFeaturedImageUrl } from '@/lib/wordpress';

const Index = () => {
  const { data, isLoading, error, refetch } = usePosts({ perPage: 12 });
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
      />
      <div className="container mx-auto px-4">
        {error && posts.length === 0 ? (
          <section className="py-8">
            <div className="flex flex-col items-center justify-center text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load articles</h2>
              <p className="text-muted-foreground mb-4">Please check your connection and try again.</p>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          </section>
        ) : (
          <PostGrid 
            posts={posts} 
            isLoading={showLoading}
            title="Latest Articles"
          />
        )}
      </div>
    </Layout>
  );
};

export default Index;
