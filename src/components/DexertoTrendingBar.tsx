interface TrendingTopic {
  name: string;
  color: string;
  href: string;
}

const TRENDING_TOPICS: TrendingTopic[] = [
  {
    name: 'Arknights Endfield',
    color: 'bg-pink-500',
    href: '#'
  },
  {
    name: 'Call Of Duty',
    color: 'bg-pink-500',
    href: '#'
  },
  {
    name: 'Fallout Season 2',
    color: 'bg-purple-600',
    href: '#'
  },
  {
    name: 'Twitch',
    color: 'bg-emerald-500',
    href: '#'
  },
  {
    name: 'Overwatch',
    color: 'bg-pink-500',
    href: '#'
  },
  {
    name: 'A Knight Of The Seven Kingdoms',
    color: 'bg-purple-600',
    href: '#'
  }
];

export const DexertoTrendingBar = () => {
  return (
    <div className="w-full border-b border-border bg-background">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 py-3 sm:py-4 overflow-x-auto scrollbar-hide">
          <span className="font-heading text-xs sm:text-sm font-black uppercase tracking-wider text-foreground whitespace-nowrap flex-shrink-0">
            🔥 TRENDING
          </span>
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
            {TRENDING_TOPICS.map((topic, index) => (
              <a
                key={index}
                href={topic.href}
                className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-opacity hover:opacity-80 flex-shrink-0"
              >
                <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${topic.color}`} />
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  {topic.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
