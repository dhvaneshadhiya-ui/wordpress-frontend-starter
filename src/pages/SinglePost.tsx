import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPostBySlug, WPPost } from '@/lib/wordpress';
import Layout from '@/components/Layout';
import SEO from '@/components/SEO';
import { Calendar, User, Clock, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function getReadingTime(content: string): number {
  const text = stripHtml(content);
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export default function SinglePost() {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => fetchPostBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <Layout>
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </article>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The post you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="text-primary hover:underline inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </Layout>
    );
  }

  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const author = post._embedded?.author?.[0];
  const categories = post._embedded?.['wp:term']?.[0] || [];
  const readingTime = getReadingTime(post.content.rendered);

  return (
    <Layout>
      <SEO 
        title={stripHtml(post.title.rendered)}
        description={stripHtml(post.excerpt.rendered).slice(0, 160)}
        image={featuredImage}
        type="article"
      />
      
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link to="/" className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </nav>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat: any) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 
          className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
          {author && (
            <Link 
              to={`/author/${author.slug}`}
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <User className="w-4 h-4" />
              {author.name}
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(new Date(post.date), 'MMMM d, yyyy')}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {readingTime} min read
          </div>
        </div>

        {/* Featured Image */}
        {featuredImage && (
          <figure className="mb-8 rounded-lg overflow-hidden">
            <img
              src={featuredImage}
              alt={stripHtml(post.title.rendered)}
              className="w-full h-auto"
            />
          </figure>
        )}

        {/* Content */}
        <div 
          className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-lg prose-img:mx-auto
            prose-pre:bg-muted prose-pre:text-foreground
            prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          "
          dangerouslySetInnerHTML={{ __html: post.content.rendered }}
        />

        {/* Tags */}
        {post._embedded?.['wp:term']?.[1]?.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post._embedded['wp:term'][1].map((tag: any) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="text-sm px-3 py-1 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </Layout>
  );
}
