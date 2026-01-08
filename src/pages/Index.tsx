import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { usePosts } from '@/hooks/useWordPress';
import { SEO } from '@/components/SEO';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { data, isLoading, error, refetch } = usePosts({ perPage: 12 });
  const posts = data?.posts ?? [];
  const showLoading = isLoading && posts.length === 0;

  return (
    <Layout>
      <SEO 
        title="iGeeksBlog - Apple News, Tips & Reviews"
        description="Your daily source for Apple news, how-to guides, tips, and app reviews."
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
