import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchPostBySlug, fetchPosts, getFeaturedImageUrl, getAuthor, getCategories, getTags, getReadingTime, formatDate, stripHtml } from '@/lib/wordpress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PostGrid } from '@/components/PostGrid';

export const revalidate = 60; // ISR: revalidate every 60 seconds

interface PageProps {
  params: { slug: string };
}

// Generate static paths for recent posts at build time
export async function generateStaticParams() {
  try {
    const { posts } = await fetchPosts({ perPage: 100 });
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await fetchPostBySlug(params.slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const imageUrl = getFeaturedImageUrl(post, 'full');
  const description = post.aioseo_head_json?.description || 
    post.yoast_head_json?.description || 
    stripHtml(post.excerpt.rendered).substring(0, 160);
  const title = post.aioseo_head_json?.title || 
    post.yoast_head_json?.title || 
    stripHtml(post.title.rendered);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.modified,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const [post, relatedData] = await Promise.all([
    fetchPostBySlug(params.slug),
    fetchPosts({ perPage: 4 }),
  ]);

  if (!post) {
    notFound();
  }

  const imageUrl = getFeaturedImageUrl(post, 'full');
  const author = getAuthor(post);
  const categories = getCategories(post);
  const tags = getTags(post);
  const readingTime = getReadingTime(post.content.rendered);
  const primaryCategory = categories[0];

  // Filter out current post from related
  const relatedPosts = relatedData.posts.filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <article className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <header className="mb-8">
        {primaryCategory && (
          <Link 
            href={`/category/${primaryCategory.slug}`}
            className="mb-3 inline-block rounded bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {primaryCategory.name}
          </Link>
        )}
        <h1 className="mb-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
          {stripHtml(post.title.rendered)}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <Link href={author.slug ? `/author/${author.slug}` : '#'} className="flex items-center gap-2 hover:text-primary transition-colors">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{author.name}</span>
          </Link>
          <span>{formatDate(post.date)}</span>
          <span>•</span>
          <span>{readingTime} min read</span>
        </div>
      </header>

      {/* Featured Image */}
      <div className="mb-8 overflow-hidden rounded-lg">
        <img
          src={imageUrl}
          alt={stripHtml(post.title.rendered)}
          className="w-full object-cover"
        />
      </div>

      {/* Content */}
      <div
        className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary prose-strong:text-foreground"
        dangerouslySetInnerHTML={{ __html: post.content.rendered }}
      />

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="px-3 py-1 text-sm rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      )}

      {/* Author Box */}
      <div className="mt-12 rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <Link href={author.slug ? `/author/${author.slug}` : '#'}>
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={author.slug ? `/author/${author.slug}` : '#'} className="hover:text-primary transition-colors">
              <h3 className="text-lg font-bold text-foreground">{author.name}</h3>
            </Link>
            <p className="mt-1 text-muted-foreground">
              Author at iGeeksBlog
            </p>
          </div>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <PostGrid posts={relatedPosts} title="Related Articles" />
      )}
    </article>
  );
}
