import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PostGrid } from '@/components/PostGrid';
import { useCategory, useCategoryPosts } from '@/hooks/useWordPress';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoryArchive() {
  const { slug } = useParams<{ slug: string }>();
  const { data: category, isLoading: categoryLoading } = useCategory(slug);
  const { data: postsData, isLoading: postsLoading } = useCategoryPosts(slug);

  if (categoryLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-2 h-10 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Category not found</h1>
          <p className="mt-2 text-muted-foreground">The category you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Category Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            {category.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {category.count} {category.count === 1 ? 'article' : 'articles'}
          </p>
        </header>

        {/* Posts Grid */}
        <PostGrid
          posts={postsData?.posts || []}
          isLoading={postsLoading}
        />
      </div>
    </Layout>
  );
}
