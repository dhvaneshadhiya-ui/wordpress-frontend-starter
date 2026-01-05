import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { usePost, usePosts } from '@/hooks/useWordPress';
import { getFeaturedImageUrl, getAuthor, getCategories, getTags, getReadingTime, formatDate, stripHtml } from '@/lib/wordpress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PostGrid } from '@/components/PostGrid';
import { getInitialPostData } from '@/utils/hydration';
import { getLocalPostBySlug, hasLocalData } from '@/lib/local-data';

export default function SinglePost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isFetching, error, isError } = usePost(slug);
  
  // Check if we have SSG data or local data (instant render, no loading)
  const hasInitialData = !!getInitialPostData(slug || '') || (hasLocalData() && !!getLocalPostBySlug(slug || ''));
  
  // Get primary category for related posts
  const categories = post ? getCategories(post) : [];
  const primaryCategory = categories[0];
  
  // Fetch related posts by same category (improved logic)
  const { data: relatedData } = usePosts({ 
    categories: primaryCategory ? [primaryCategory.id] : undefined,
    perPage: 4 
  });

  // Show loading only if we're actually loading AND have no data yet
  const showLoading = (isLoading || isFetching) && !post && !hasInitialData;
  
  if (showLoading) {
    return (
      <Layout>
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

  // Only show "not found" if the query has completed with an error or null result
  // AND we've actually finished trying to load (not still loading)
  if ((isError || (!post && !isLoading && !isFetching)) && !hasInitialData) {
    return (
      <Layout>
        <SEO title="Post Not Found" />
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

  // If still no post data available, show minimal loading
  if (!post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
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
        url={`https://dev.igeeksblog.com/${post.slug}`}
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

        {/* Featured Image with lazy loading */}
        <div className="mb-8 overflow-hidden rounded-lg">
          <img
            src={imageUrl}
            alt={stripHtml(post.title.rendered)}
            loading="lazy"
            decoding="async"
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
                to={`/tag/${tag.slug}`}
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
              <p className="mt-1 text-muted-foreground">
                Author at iGeeksBlog
              </p>
            </div>
          </div>
        </div>

        {/* Related Posts - filtered by same category */}
        {relatedPosts.length > 0 && (
          <PostGrid
            posts={relatedPosts}
            title="Related Articles"
          />
        )}
      </article>
    </Layout>
  );
}
