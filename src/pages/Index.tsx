import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';

import { PaginationNav } from '@/components/PaginationNav';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { SEO } from '@/components/SEO';
import { usePosts, useCategories } from '@/hooks/useWordPress';
import { Link } from 'react-router-dom';

const Index = () => {
  const [page, setPage] = useState(1);
  const { data: latestData, isLoading, error } = usePosts({ page, perPage: 9 });
  const { data: categories } = useCategories();

  const topCategories = categories?.slice(0, 8) || [];

  return (
    <Layout>
      <SEO />
      <div className="container mx-auto px-4">
        {/* Category Quick Links */}
        {topCategories.length > 0 && (
          <section className="py-6 border-b border-border">
            <div className="flex flex-wrap gap-2">
              {topCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 my-6">
            <p className="font-medium">Unable to load posts</p>
            <p className="text-sm opacity-75 mt-1">
              {error.message || 'API request failed. This may be due to CORS restrictions in the preview environment.'}
            </p>
            <p className="text-xs opacity-50 mt-2">
              Posts will load correctly when deployed to production (dev.igeeksblog.com).
            </p>
          </div>
        )}

        {/* No posts state (after loading, no error, but empty) */}
        {!isLoading && !error && (!latestData?.posts || latestData.posts.length === 0) && (
          <div className="bg-muted border border-border rounded-lg p-6 my-6 text-center">
            <p className="text-muted-foreground">No posts available.</p>
            <p className="text-sm text-muted-foreground/75 mt-1">
              API may be blocked by CORS in preview. Deploy to production for full functionality.
            </p>
          </div>
        )}

        {/* Latest News Section */}
        <PostGrid
          posts={latestData?.posts || []}
          isLoading={isLoading}
          title="Latest Articles"
        />

        {/* Pagination */}
        {latestData && (
          <PaginationNav
            currentPage={page}
            totalPages={latestData.totalPages}
            onPageChange={setPage}
          />
        )}

        {/* Newsletter Section */}
        <section className="py-12">
          <NewsletterSignup />
        </section>
      </div>
    </Layout>
  );
};

export default Index;
