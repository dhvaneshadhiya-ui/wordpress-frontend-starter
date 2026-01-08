import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { usePosts } from '@/hooks/useWordPress';
import { SEO } from '@/components/SEO';

const Index = () => {
  const { data, isLoading } = usePosts({ perPage: 12 });
  const posts = data?.posts ?? [];
  const showLoading = isLoading && posts.length === 0;

  return (
    <Layout>
      <SEO 
        title="iGeeksBlog - Apple News, Tips & Reviews"
        description="Your daily source for Apple news, how-to guides, tips, and app reviews."
      />
      <div className="container mx-auto px-4">
        <PostGrid 
          posts={posts} 
          isLoading={showLoading}
          title="Latest Articles"
        />
      </div>
    </Layout>
  );
};

export default Index;
