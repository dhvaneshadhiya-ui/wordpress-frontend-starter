import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { usePosts } from '@/hooks/useWordPress';
import { getFeaturedImageUrl, getAuthor, getCategories, getTags, getReadingTime, formatDate } from '@/lib/wordpress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SinglePost() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = usePosts({ search: slug, perPage: 1 });
  
  const post = data?.posts?.find(p => p.slug === slug);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-96 w-full mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link to="/" className="text-primary hover:underline">
            Return to homepage
          </Link>
        </div>
      </Layout>
    );
  }

  const featuredImage = getFeaturedImageUrl(post, 'full');
  const author = getAuthor(post);
  const categories = getCategories(post);
  const tags = getTags(post);
  const readingTime = getReadingTime(post.content.rendered);
  const formattedDate = formatDate(post.date);

  return (
    <Layout>
      <SEO 
        title={post.title.rendered}
        description={post.excerpt.rendered.replace(/<[^>]*>/g, '').slice(0, 160)}
        image={featuredImage}
        type="article"
      />
      
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((category) => (
            <Link key={category.id} to={`/category/${category.slug}`}>
              <Badge variant="secondary">{category.name}</Badge>
            </Link>
          ))}
        </div>

        {/* Title */}
        <h1 
          className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 mb-8 text-muted-foreground">
          {author && (
            <Link to={`/author/${author.slug}`} className="flex items-center gap-2 hover:text-foreground">
              <Avatar className="h-10 w-10">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <span className="font-medium">{author.name}</span>
            </Link>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{readingTime} min read</span>
          </div>
        </div>

        {/* Featured Image */}
        {featuredImage && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img 
              src={featuredImage} 
              alt={post.title.rendered.replace(/<[^>]*>/g, '')}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Content */}
        <div 
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content.rendered }}
        />

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <h3 className="text-sm font-medium mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link key={tag.id} to={`/tag/${tag.slug}`}>
                  <Badge variant="outline">{tag.name}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Author Box */}
        {author && (
          <div className="mt-8 p-6 bg-muted rounded-xl">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
              </Avatar>
              <div>
                <Link to={`/author/${author.slug}`} className="font-bold text-lg hover:text-primary">
                  {author.name}
                </Link>
                <p className="text-muted-foreground mt-1">
                  Author at iGeeksBlog
                </p>
              </div>
            </div>
          </div>
        )}
      </article>
    </Layout>
  );
}
