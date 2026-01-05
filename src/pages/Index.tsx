import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { PaginationNav } from '@/components/PaginationNav';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { SEO } from '@/components/SEO';
import { usePosts, useCategories } from '@/hooks/useWordPress';
import { Link } from 'react-router-dom';
import { getInitialHomeData } from '@/utils/hydration';

const Index = () => {
  const [page, setPage] = useState(1);
  const { data: latestData, isLoading } = usePosts({ page, perPage: 9 });
  const { data: categories } = useCategories();

  // Check if we have SSG data (instant render, no loading)
  const hasInitialData = !!getInitialHomeData();

  const topCategories = categories?.slice(0, 8) || [];

  // Skip loading state if we have SSG data or already have posts data
  const showLoading = isLoading && !hasInitialData && !latestData?.posts?.length;

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

        {/* Latest News Section */}
        <PostGrid
          posts={latestData?.posts || []}
          isLoading={showLoading}
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
