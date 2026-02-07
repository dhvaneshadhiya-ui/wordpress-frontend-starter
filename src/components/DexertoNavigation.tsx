import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Settings, Menu, X, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigationData, useNavigationPopularPosts } from '@/hooks/useSiteConfig';
import { SearchModal } from '@/components/SearchModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';

// iGeeksBlog Logo Component
const IGeeksBlogLogo = ({
  className
}: {
  className?: string;
}) => <img src="/logo.png" alt="iGeeksBlog" className={className} />;

// Component to fetch and display popular items for a category
const PopularItemsGrid = ({ categorySlug }: { categorySlug: string }) => {
  const { data: popularItems, isLoading } = useNavigationPopularPosts(categorySlug);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-video rounded-lg" />
        ))}
      </div>
    );
  }

  if (!popularItems || popularItems.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {popularItems.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className="group relative rounded-lg overflow-hidden aspect-video"
        >
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <span className="absolute bottom-2 left-2 text-sm font-semibold text-white">
            {item.name}
          </span>
        </Link>
      ))}
    </div>
  );
};

// Mobile popular items list
const MobilePopularItems = ({ categorySlug, onItemClick }: { categorySlug: string; onItemClick: () => void }) => {
  const { data: popularItems, isLoading } = useNavigationPopularPosts(categorySlug);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 pt-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="w-10 h-10 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!popularItems || popularItems.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 pt-1">
      {popularItems.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          onClick={onItemClick}
          className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <img
            src={item.image}
            alt={item.name}
            className="w-10 h-10 rounded object-cover"
          />
          {item.name}
        </Link>
      ))}
    </div>
  );
};

export const DexertoNavigation = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedMobileItem, setExpandedMobileItem] = useState<string | null>(null);
  
  const { data: navItems } = useNavigationData();

  // Extract category slug from href
  const getCategorySlug = (href: string) => {
    const match = href.match(/\/category\/(.+)/);
    return match ? match[1] : '';
  };

  return <>
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          {/* Left Side: Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center">
              <IGeeksBlogLogo className="h-7 sm:h-8 w-auto" />
            </Link>

            {/* Desktop Nav Items */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems?.map(item => {
                const categorySlug = getCategorySlug(item.href);
                return (
                  <div
                    key={item.title}
                    className="relative"
                    onMouseEnter={() => setActiveMenu(item.title)}
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    <Link
                      to={item.href}
                      className="px-3 py-2 text-sm text-foreground hover:text-primary transition-colors font-extrabold"
                    >
                      {item.title}
                    </Link>

                    {/* Desktop Dropdown Mega Menu */}
                    <AnimatePresence>
                      {activeMenu === item.title && categorySlug && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="absolute left-0 top-full pt-2 z-50"
                        >
                          <div className="bg-card border border-border rounded-lg shadow-xl p-6 min-w-[500px]">
                            <div className="flex gap-8">
                              {/* Popular Section */}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Popular
                                  </h3>
                                  <Link
                                    to={item.href}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    {item.viewAllLabel}
                                    <ChevronRight className="h-3 w-3" />
                                  </Link>
                                </div>
                                <PopularItemsGrid categorySlug={categorySlug} />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Log in
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Sign up
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Search className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-foreground">
              <Settings className="h-5 w-5" />
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="default"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </header>

    {/* Mobile Sidebar Menu */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-14 sm:top-16 right-0 bottom-0 z-50 w-full max-w-sm bg-card border-l border-border lg:hidden overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <IGeeksBlogLogo className="h-6 w-auto" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="flex flex-col gap-1 mb-6">
                {navItems?.map(item => {
                  const categorySlug = getCategorySlug(item.href);
                  return (
                    <Collapsible
                      key={item.title}
                      open={expandedMobileItem === item.title}
                      onOpenChange={(open) => setExpandedMobileItem(open ? item.title : null)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-3 text-base font-medium text-foreground hover:bg-muted rounded-lg transition-colors">
                        {item.title}
                        {categorySlug && (
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                              expandedMobileItem === item.title ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </CollapsibleTrigger>
                      {categorySlug && (
                        <CollapsibleContent className="pl-4 pb-2">
                          <MobilePopularItems
                            categorySlug={categorySlug}
                            onItemClick={() => setMobileMenuOpen(false)}
                          />
                          <Link
                            to={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:underline mt-2"
                          >
                            {item.viewAllLabel}
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  );
                })}
              </nav>

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button variant="outline" className="w-full justify-center">
                  Log in
                </Button>
                <Button className="w-full justify-center">
                  Sign up
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Search Modal */}
    <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
  </>;
};
