import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { usePosts } from '@/hooks/useWordPress';

const Index = () => {
  const { data: latestData, isLoading: latestLoading } = usePosts({ perPage: 6 });
  const { data: featuredData, isLoading: featuredLoading } = usePosts({ perPage: 3 });

  return (
    <Layout>
      <div className="container mx-auto px-4">
        {/* Latest News Section */}
        <PostGrid
          posts={latestData?.posts || []}
          isLoading={latestLoading}
          title="Latest News"
        />

        {/* Featured Section */}
        <PostGrid
          posts={featuredData?.posts.slice(0, 3) || []}
          isLoading={featuredLoading}
          title="Featured"
        />
      </div>
    </Layout>
  );
};

export default Index;
