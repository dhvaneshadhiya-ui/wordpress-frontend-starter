import Link from 'next/link';
import { fetchPosts, fetchCategories } from '@/lib/wordpress';
import { PostGrid } from '@/components/PostGrid';
import { HomeContent } from '@/components/HomeContent';

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function Home() {
  const [postsData, categories] = await Promise.all([
    fetchPosts({ perPage: 9 }),
    fetchCategories({ perPage: 100 }),
  ]);

  const topCategories = categories.slice(0, 8);

  return (
    <div className="container mx-auto px-4">
      {/* Category Quick Links */}
      {topCategories.length > 0 && (
        <section className="py-6 border-b border-border">
          <div className="flex flex-wrap gap-2">
            {topCategories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="px-4 py-2 text-sm font-medium rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest News Section with Client-Side Pagination */}
      <HomeContent 
        initialPosts={postsData.posts} 
        initialTotalPages={postsData.totalPages} 
      />
    </div>
  );
}
