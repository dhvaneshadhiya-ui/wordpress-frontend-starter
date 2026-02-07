import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Settings, Menu, X, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DexertoLogo } from './DexertoLogo';
import { NAV_ITEMS } from '@/data/nav-items';
import { SearchModal } from '@/components/SearchModal';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export const DexertoNavigation = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedMobileItem, setExpandedMobileItem] = useState<string | null>(null);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container mx-auto px-4">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
            {/* Left Side: Logo */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center">
                <DexertoLogo className="h-7 sm:h-8 w-auto text-foreground" />
              </Link>

              {/* Desktop Nav Items */}
              <nav className="hidden lg:flex items-center gap-1">
                {NAV_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="relative"
                    onMouseEnter={() => setActiveMenu(item.title)}
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    <Link
                      to={item.href}
                      className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {item.title}
                    </Link>

                    {/* Desktop Dropdown Mega Menu */}
                    <AnimatePresence>
                      {activeMenu === item.title && item.popular.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="absolute left-0 top-full pt-2 z-50"
                        >
                          <div className="bg-card border border-border rounded-lg shadow-xl p-6 min-w-[600px]">
                            <div className="flex gap-8">
                              {/* Popular Section */}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Popular
                                  </h3>
                                  <Link
                                    to="#"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    {item.viewAllLabel}
                                    <ChevronRight className="h-3 w-3" />
                                  </Link>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  {item.popular.map((pop) => (
                                    <Link
                                      key={pop.name}
                                      to={pop.href}
                                      className="group relative rounded-lg overflow-hidden aspect-video"
                                    >
                                      <img
                                        src={pop.image}
                                        alt={pop.name}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                      <span className="absolute bottom-2 left-2 text-sm font-semibold text-white">
                                        {pop.name}
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              </div>

                              {/* More Section */}
                              <div className="w-48">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                                  More {item.title}
                                </h3>
                                <div className="flex flex-col gap-2">
                                  {item.more.map((m) => (
                                    <Link
                                      key={m}
                                      to="#"
                                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <ChevronRight className="h-3 w-3" />
                                      {m}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
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
              
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex text-muted-foreground hover:text-foreground"
              >
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
                  <DexertoLogo className="h-6 w-auto text-foreground" />
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
                  {NAV_ITEMS.map((item) => (
                    <Collapsible
                      key={item.title}
                      open={expandedMobileItem === item.title}
                      onOpenChange={(open) => setExpandedMobileItem(open ? item.title : null)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-3 text-base font-medium text-foreground hover:bg-muted rounded-lg transition-colors">
                        {item.title}
                        {item.popular.length > 0 && (
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                              expandedMobileItem === item.title ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </CollapsibleTrigger>
                      {item.popular.length > 0 && (
                        <CollapsibleContent className="pl-4 pb-2">
                          <div className="flex flex-col gap-1 pt-1">
                            {item.popular.map((pop) => (
                              <Link
                                key={pop.name}
                                to={pop.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                              >
                                <img
                                  src={pop.image}
                                  alt={pop.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                                {pop.name}
                              </Link>
                            ))}
                            {item.more.slice(0, 3).map((m) => (
                              <Link
                                key={m}
                                to="#"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                              >
                                <ChevronRight className="h-3 w-3" />
                                {m}
                              </Link>
                            ))}
                            <Link
                              to="#"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:underline"
                            >
                              {item.viewAllLabel}
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  ))}
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
    </>
  );
};
