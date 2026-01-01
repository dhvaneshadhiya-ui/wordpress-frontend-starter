import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { usePost, usePosts } from '@/hooks/useWordPress';
import { getFeaturedImageUrl, getAuthor, getCategories, getReadingTime, formatDate, stripHtml } from '@/lib/wordpress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PostGrid } from '@/components/PostGrid';

export default function SinglePost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = usePost(slug);
  const { data: relatedData } = usePosts({ perPage: 3 });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="mb-8 h-4 w-1/2" />
          <Skeleton className="aspect-video w-full rounded-lg" />
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Post not found</h1>
          <p className="mt-2 text-muted-foreground">The article you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  const imageUrl = getFeaturedImageUrl(post, 'full');
  const author = getAuthor(post);
  const categories = getCategories(post);
  const readingTime = getReadingTime(post.content.rendered);
  const primaryCategory = categories[0];

  return (
    <Layout>
      <article className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <header className="mb-8">
          {primaryCategory && (
            <span className="mb-3 inline-block rounded bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
              {primaryCategory.name}
            </span>
          )}
          <h1 className="mb-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            {stripHtml(post.title.rendered)}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{author.name}</span>
            </div>
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

        {/* Author Box */}
        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-bold text-foreground">{author.name}</h3>
              <p className="mt-1 text-muted-foreground">
                Author at iGeeksBlog
              </p>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        {relatedData?.posts && relatedData.posts.length > 0 && (
          <PostGrid
            posts={relatedData.posts.filter((p) => p.id !== post.id).slice(0, 3)}
            title="Related Articles"
          />
        )}
      </article>
    </Layout>
  );
}
