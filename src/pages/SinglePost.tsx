import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { ArticleContent } from '@/components/ArticleContent';
import { GonePage } from '@/components/GonePage';
import { usePost, usePosts } from '@/hooks/useWordPress';
import { useRedirect } from '@/hooks/useRedirect';
import { getFeaturedImageUrl, getAuthor, getCategories, getTags, getReadingTime, formatDate, stripHtml } from '@/lib/wordpress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PostGrid } from '@/components/PostGrid';
import { FRONTEND_URL } from '@/lib/constants';

export default function SinglePost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error, isError } = usePost(slug);
  const { data: redirect, isLoading: redirectLoading } = useRedirect(slug);
  
  // Get primary category for related posts
  const categories = post ? getCategories(post) : [];
  const primaryCategory = categories[0];
  
  // Fetch related posts by same category
  const { data: relatedData } = usePosts({ 
    categories: primaryCategory ? [primaryCategory.id] : undefined,
    perPage: 4 
  });

  // Handle redirect before showing post
  if (redirect?.found && redirect.code) {
    // 301/302: Redirect to new URL
    if (redirect.code === 301 || redirect.code === 302) {
      const target = redirect.target || '/';
      // Handle internal vs external redirects
      const frontendDomain = FRONTEND_URL.replace(/^https?:\/\//, '');
      if (target.startsWith('/') || target.includes(frontendDomain)) {
        const internalPath = target.replace(/^https?:\/\/[^/]+/, '');
        return <Navigate to={internalPath} replace />;
      } else {
        // External redirect - use window.location
        window.location.href = target;
        return null;
      }
    }
    
    // 410: Content is gone
    if (redirect.code === 410) {
      return <GonePage slug={slug || ''} />;
    }
  }

  // Show loading while checking redirect AND fetching post
  if (isLoading || redirectLoading) {
    return (
      <Layout>
        <SEO 
          title="Loading..."
          type="article"
          url={`${FRONTEND_URL}/${slug}`}
        />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="mb-8 h-4 w-1/2" />
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !post) {
    return (
      <Layout>
        <SEO 
          title="Post Not Found" 
          type="article"
          url={`${FRONTEND_URL}/${slug}`}
        />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Post not found</h1>
          <p className="mt-2 text-muted-foreground">The article you're looking for doesn't exist.</p>
          <Link 
            to="/" 
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Go to Homepage
          </Link>
        </div>
      </Layout>
    );
  }

  const imageUrl = getFeaturedImageUrl(post, 'full');
  const author = getAuthor(post);
  const tags = getTags(post);
  const readingTime = getReadingTime(post.content.rendered);

  // Filter related posts: same category, exclude current post
  const relatedPosts = relatedData?.posts
    .filter((p) => p.id !== post.id)
    .slice(0, 3) || [];

  return (
    <Layout>
      <SEO 
        title={stripHtml(post.title.rendered)}
        description={stripHtml(post.excerpt.rendered).substring(0, 160)}
        post={post}
        type="article"
        image={imageUrl}
        url={`${FRONTEND_URL}/${post.slug}`}
      />
      <article className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <header className="mb-8">
          {primaryCategory && (
            <Link 
              to={`/category/${primaryCategory.slug}`}
              className="mb-3 inline-block rounded bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {primaryCategory.name}
            </Link>
          )}
          <h1 className="mb-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            {stripHtml(post.title.rendered)}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <Link to={author.slug ? `/author/${author.slug}` : '#'} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={author.avatar} alt={author.name} loading="lazy" />
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
        <figure className="mb-8 overflow-hidden rounded-lg">
          <img
            src={imageUrl}
            alt={stripHtml(post.title.rendered)}
            width={1200}
            height={675}
            loading="lazy"
            decoding="async"
            className="w-full h-auto object-cover"
          />
        </figure>

        {/* Content */}
        <ArticleContent html={post.content.rendered} size="lg" />

        {/* Tags */}
        {tags.length > 0 && (
          <section aria-label="Article tags" className="mt-8">
            <nav className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="px-3 py-1 text-sm rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </nav>
          </section>
        )}

        {/* Author Box */}
        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <Link to={author.slug ? `/author/${author.slug}` : '#'}>
              <Avatar className="h-16 w-16 border border-border">
                <AvatarImage src={author.avatar} alt={author.name} loading="lazy" />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link to={author.slug ? `/author/${author.slug}` : '#'} className="hover:text-primary transition-colors">
                <h3 className="text-lg font-bold text-foreground">{author.name}</h3>
              </Link>
              {author.description ? (
                <ArticleContent html={author.description} size="sm" className="mt-1 text-muted-foreground" />
              ) : (
                <p className="mt-1 text-muted-foreground">
                  Author at iGeeksBlog
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section aria-labelledby="related-articles" className="mt-12">
            <PostGrid
              posts={relatedPosts}
              title="Related Articles"
              headingId="related-articles"
            />
          </section>
        )}
      </article>
    </Layout>
  );
}
