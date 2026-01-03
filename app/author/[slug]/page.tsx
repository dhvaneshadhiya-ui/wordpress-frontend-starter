import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchAuthorBySlug, fetchAuthors, fetchPosts } from '@/lib/wordpress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AuthorContent } from './AuthorContent';

export const revalidate = 300; // ISR: revalidate every 5 minutes

interface PageProps {
  params: { slug: string };
}

// Generate static paths for all authors at build time
export async function generateStaticParams() {
  try {
    const authors = await fetchAuthors({ perPage: 100 });
    return authors.map((author) => ({ slug: author.slug }));
  } catch {
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const author = await fetchAuthorBySlug(params.slug);
  
  if (!author) {
    return {
      title: 'Author Not Found',
    };
  }

  const title = `${author.name} - Author`;
  const description = author.description || `Articles written by ${author.name} on iGeeksBlog`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | iGeeksBlog`,
      description,
      images: author.avatar_urls?.['96'] ? [{ url: author.avatar_urls['96'] }] : undefined,
    },
  };
}

export default async function AuthorPage({ params }: PageProps) {
  const author = await fetchAuthorBySlug(params.slug);

  if (!author) {
    notFound();
  }

  // Fetch initial posts
  const postsData = await fetchPosts({ 
    author: author.id, 
    perPage: 12 
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Author Header */}
      <header className="mb-8 flex items-start gap-6">
        <Avatar className="h-20 w-20 border-2 border-border">
          <AvatarImage src={author.avatar_urls?.['96']} alt={author.name} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {author.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {author.name}
          </h1>
          {author.description && (
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {author.description}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {postsData.total} {postsData.total === 1 ? 'article' : 'articles'}
          </p>
        </div>
      </header>

      {/* Posts Grid with Client-Side Pagination */}
      <AuthorContent 
        authorId={author.id}
        initialPosts={postsData.posts}
        initialTotalPages={postsData.totalPages}
      />
    </div>
  );
}
