import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { usePreviewPost } from '@/hooks/useWordPress';
import { getFeaturedImageUrl, getAuthor, getCategories, getTags, getReadingTime, formatDate, stripHtml } from '@/lib/wordpress';
import { transformContentLinks } from '@/lib/content-utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Eye, ExternalLink } from 'lucide-react';

export default function PreviewPost() {
  const [searchParams] = useSearchParams();
  const postId = searchParams.get('id');
  const token = searchParams.get('token');

  const { data: post, isLoading, error } = usePreviewPost(
    postId ? parseInt(postId, 10) : undefined,
    token || undefined
  );

  if (!postId || !token) {
    return (
      <Layout>
        <SEO title="Invalid Preview Link" noindex />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Invalid Preview Link</h1>
          <p className="mt-2 text-muted-foreground">
            This preview link is missing required parameters.
          </p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <SEO title="Loading Preview..." noindex />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-4 rounded-lg border-2 border-dashed border-yellow-500 bg-yellow-500/10 p-4">
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="mb-8 h-4 w-1/2" />
          <Skeleton className="aspect-video w-full rounded-lg" />
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isExpired = errorMessage.includes('expired') || errorMessage.includes('invalid');
    
    return (
      <Layout>
        <SEO title="Preview Error" noindex />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            {isExpired ? 'Preview Link Expired' : 'Preview Error'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isExpired 
              ? 'This preview link has expired. Please generate a new one from WordPress.'
              : `Failed to load preview: ${errorMessage}`}
          </p>
          <a 
            href="https://dev.igeeksblog.com/wp-admin/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Go to WordPress Admin
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </Layout>
    );
  }

  const imageUrl = getFeaturedImageUrl(post, 'full');
  const author = getAuthor(post);
  const categories = getCategories(post);
  const tags = getTags(post);
  const readingTime = getReadingTime(post.content.rendered);
  const primaryCategory = categories[0];

  return (
    <Layout>
      <SEO 
        title={`[PREVIEW] ${stripHtml(post.title.rendered)}`}
        noindex
      />
      
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 border-b-2 border-yellow-500 bg-yellow-500 px-4 py-3 text-yellow-950">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <span className="font-semibold">Draft Preview</span>
            <span className="hidden sm:inline">— This content is not published</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-75">
              Status: <span className="font-medium uppercase">{post.status || 'draft'}</span>
            </span>
            <a 
              href={`https://dev.igeeksblog.com/wp-admin/post.php?post=${post.id}&action=edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded bg-yellow-950 px-3 py-1 text-sm font-medium text-yellow-50 hover:bg-yellow-900 transition-colors"
            >
              Edit in WordPress
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

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
        {imageUrl && imageUrl !== '/placeholder.svg' && (
          <div className="mb-8 overflow-hidden rounded-lg">
            <img
              src={imageUrl}
              alt={stripHtml(post.title.rendered)}
              className="w-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary prose-strong:text-foreground"
          dangerouslySetInnerHTML={{ __html: transformContentLinks(post.content.rendered) }}
        />

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 text-sm rounded-full bg-secondary text-secondary-foreground"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

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
      </article>
    </Layout>
  );
}
