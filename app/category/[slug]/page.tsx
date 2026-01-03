import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchCategoryBySlug, fetchCategories, fetchPosts } from '@/lib/wordpress';
import { CategoryContent } from './CategoryContent';

export const revalidate = 300; // ISR: revalidate every 5 minutes

interface PageProps {
  params: { slug: string };
}

// Generate static paths for all categories at build time
export async function generateStaticParams() {
  try {
    const categories = await fetchCategories({ perPage: 100 });
    return categories.map((cat) => ({ slug: cat.slug }));
  } catch {
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = await fetchCategoryBySlug(params.slug);
  
  if (!category) {
    return {
      title: 'Category Not Found',
    };
  }

  const title = `${category.name} - iGeeksBlog`;
  const description = category.description || `Browse all ${category.name} articles on iGeeksBlog`;

  return {
    title: category.name,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const category = await fetchCategoryBySlug(params.slug);

  if (!category) {
    notFound();
  }

  // Fetch initial posts
  const postsData = await fetchPosts({ 
    categories: [category.id], 
    perPage: 12 
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Category Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {category.count} {category.count === 1 ? 'article' : 'articles'}
        </p>
      </header>

      {/* Posts Grid with Client-Side Pagination */}
      <CategoryContent 
        categoryId={category.id}
        initialPosts={postsData.posts}
        initialTotalPages={postsData.totalPages}
      />
    </div>
  );
}
