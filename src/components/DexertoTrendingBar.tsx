import { Link } from 'react-router-dom';
import { useTrendingData } from '@/hooks/useSiteConfig';
import { Skeleton } from '@/components/ui/skeleton';

export const DexertoTrendingBar = () => {
  const { data: trendingTopics, isLoading } = useTrendingData();

  if (isLoading) {
    return (
      <div className="w-full border-b border-border bg-background">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 py-3 sm:py-4">
            <span className="font-heading text-xs sm:text-sm font-black uppercase tracking-wider text-foreground whitespace-nowrap flex-shrink-0">
              🔥 TRENDING
            </span>
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-5 w-24" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trendingTopics || trendingTopics.length === 0) {
    return null;
  }

  return (
    <div className="w-full border-b border-border bg-background">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 py-3 sm:py-4 overflow-x-auto scrollbar-hide">
          <span className="font-heading text-xs sm:text-sm font-black uppercase tracking-wider text-foreground whitespace-nowrap flex-shrink-0">
            🔥 TRENDING
          </span>
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
            {trendingTopics.map((topic) => (
              <Link
                key={topic.slug}
                to={topic.href}
                className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-opacity hover:opacity-80 flex-shrink-0"
              >
                <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${topic.color}`} />
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  {topic.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
