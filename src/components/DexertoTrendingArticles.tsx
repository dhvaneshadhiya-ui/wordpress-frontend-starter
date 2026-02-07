import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Flame } from 'lucide-react';
import { useFeaturedPosts, FeaturedArticle } from '@/hooks/useSiteConfig';
import { Skeleton } from '@/components/ui/skeleton';

// Category color mapping using semantic tokens
const CATEGORY_COLORS: Record<string, string> = {
  iphone: "bg-primary text-primary-foreground",
  mac: "bg-accent text-accent-foreground",
  ipad: "bg-chart-3 text-white",
  "how-to": "bg-chart-4 text-white",
  apps: "bg-chart-2 text-white",
  accessories: "bg-chart-5 text-white",
  news: "bg-destructive text-destructive-foreground",
};

function getCategoryColor(slug: string): string {
  return CATEGORY_COLORS[slug] || "bg-primary text-primary-foreground";
}

interface ArticleCardProps {
  article: FeaturedArticle;
  isHero?: boolean;
}

const ArticleCard = ({ article, isHero = false }: ArticleCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  if (isHero) {
    return (
      <motion.article
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="group relative h-full overflow-hidden rounded-lg sm:rounded-xl border border-border bg-card shadow-lg transition-all duration-300 hover:shadow-2xl"
      >
        <Link to={article.href} className="flex h-full flex-col">
          {/* Hero Image */}
          <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden bg-muted">
            <motion.img
              src={article.image}
              alt={article.title}
              className="h-full w-full object-cover"
              animate={{ scale: isHovered ? 1.08 : 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            
            {/* Category Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="absolute left-3 top-3 sm:left-6 sm:top-6"
            >
              <span className={`inline-flex items-center rounded-md px-2.5 py-1.5 sm:px-4 sm:py-2 font-heading text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg ${getCategoryColor(article.categorySlug)}`}>
                {article.category}
              </span>
            </motion.div>
          </div>
          
          {/* Hero Content */}
          <div className="flex flex-1 flex-col gap-3 sm:gap-4 p-4 sm:p-6 lg:p-8">
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black leading-tight text-foreground transition-colors group-hover:text-primary">
              {article.title}
            </h2>
            
            {article.excerpt && (
              <p className="line-clamp-2 text-sm sm:text-base text-muted-foreground">
                {article.excerpt}
              </p>
            )}
            
            <div className="mt-auto flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm text-muted-foreground">
              {article.author && (
                <span className="font-heading font-bold">
                  By {article.author}
                </span>
              )}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{article.timestamp}</span>
              </div>
              <span>{article.readTime}</span>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  return (
    <motion.article
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
      className="group flex gap-3 sm:gap-4 overflow-hidden rounded-lg border border-border bg-card p-3 sm:p-4 shadow-sm transition-all duration-300 hover:border-primary hover:shadow-lg"
    >
      <Link to={article.href} className="flex w-full gap-3 sm:gap-4">
        {/* Thumbnail */}
        <div className="relative h-20 w-28 sm:h-24 sm:w-32 flex-shrink-0 overflow-hidden rounded-md bg-muted">
          <motion.img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover"
            animate={{ scale: isHovered ? 1.15 : 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        
        {/* Content */}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div className="space-y-1.5 sm:space-y-2">
            <span className={`inline-flex items-center rounded px-1.5 py-0.5 sm:px-2 sm:py-1 font-heading text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${getCategoryColor(article.categorySlug)}`}>
              {article.category}
            </span>
            
            <h3 className="font-heading text-sm sm:text-base font-black leading-tight text-foreground transition-colors group-hover:text-primary line-clamp-2">
              {article.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{article.timestamp}</span>
            </div>
            <span className="hidden sm:inline">{article.readTime}</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
};

// Loading skeleton for hero article
const HeroSkeleton = () => (
  <div className="h-full overflow-hidden rounded-lg sm:rounded-xl border border-border bg-card">
    <Skeleton className="h-48 sm:h-64 md:h-80 w-full" />
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

// Loading skeleton for sidebar article
const SidebarSkeleton = () => (
  <div className="flex gap-3 sm:gap-4 rounded-lg border border-border bg-card p-3 sm:p-4">
    <Skeleton className="h-20 w-28 sm:h-24 sm:w-32 flex-shrink-0 rounded-md" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

export const DexertoTrendingArticles = () => {
  const { data, isLoading, error } = useFeaturedPosts();

  if (error) {
    console.error('Failed to load featured posts:', error);
  }

  return (
    <div className="w-full bg-background">
      {/* Main Content Grid */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Hero Article - Takes 2 columns on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            {isLoading || !data?.hero ? (
              <HeroSkeleton />
            ) : (
              <ArticleCard article={data.hero} isHero />
            )}
          </motion.div>

          {/* Trending Sidebar - Takes 1 column on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-3 sm:space-y-4"
          >
            <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 border-b border-border pb-3 sm:pb-4">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h2 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">
                Hot Topics
              </h2>
            </div>
            
            {isLoading || !data?.sidebar ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <SidebarSkeleton key={i} />
                ))}
              </>
            ) : (
              data.sidebar.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                >
                  <ArticleCard article={article} />
                </motion.div>
              ))
            )}
          </motion.div>
        </div>

        {/* Newsletter Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 sm:mt-12 rounded-lg sm:rounded-xl border border-border bg-card p-6 sm:p-8 text-center"
        >
          <h3 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">
            Never Miss a Story
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground px-4">
            Subscribe to our newsletter for the latest Apple news, tips, and reviews
          </p>
          <div className="mt-4 sm:mt-6 flex flex-col items-center justify-center gap-3 sm:gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="h-11 sm:h-12 w-full max-w-md rounded-md border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button className="h-11 sm:h-12 w-full sm:w-auto rounded-md bg-primary px-6 sm:px-8 font-heading text-sm font-black uppercase tracking-wider text-primary-foreground transition-all hover:scale-105 hover:bg-primary/90">
              Subscribe
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
