import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchTagBySlug, fetchTags, fetchPosts } from '@/lib/wordpress';
import { TagContent } from './TagContent';

export const revalidate = 300; // ISR: revalidate every 5 minutes

interface PageProps {
  params: { slug: string };
}

// Generate static paths for top tags at build time
export async function generateStaticParams() {
  try {
    const tags = await fetchTags({ perPage: 50 });
    // Sort by count and take top 50
    return tags
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
      .map((tag) => ({ slug: tag.slug }));
  } catch {
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tag = await fetchTagBySlug(params.slug);
  
  if (!tag) {
    return {
      title: 'Tag Not Found',
    };
  }

  const title = `${tag.name} Articles`;
  const description = `Browse all articles tagged with ${tag.name} on iGeeksBlog`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | iGeeksBlog`,
      description,
    },
  };
}

export default async function TagPage({ params }: PageProps) {
  const tag = await fetchTagBySlug(params.slug);

  if (!tag) {
    notFound();
  }

  // Fetch initial posts
  const postsData = await fetchPosts({ 
    tags: [tag.id], 
    perPage: 12 
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tag Header */}
      <header className="mb-8">
        <span className="text-sm font-medium text-primary uppercase tracking-wide">Tag</span>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl mt-1">
          {tag.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {tag.count} {tag.count === 1 ? 'article' : 'articles'}
        </p>
      </header>

      {/* Posts Grid with Client-Side Pagination */}
      <TagContent 
        tagId={tag.id}
        initialPosts={postsData.posts}
        initialTotalPages={postsData.totalPages}
      />
    </div>
  );
}
