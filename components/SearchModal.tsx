'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePosts } from '@/hooks/useWordPress';
import { getFeaturedImageUrl, stripHtml, formatDate } from '@/lib/wordpress';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();

  const { data, isLoading } = usePosts({
    search: debouncedQuery,
    perPage: 5,
  });

  const handleSelect = useCallback((slug: string) => {
    onOpenChange(false);
    setQuery('');
    router.push(`/${slug}`);
  }, [router, onOpenChange]);

  // Reset query when modal closes
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  const results = debouncedQuery.length >= 2 ? data?.posts || [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-lg h-14"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading && debouncedQuery.length >= 2 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && debouncedQuery.length >= 2 && results.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No articles found for "{debouncedQuery}"
            </div>
          )}

          {results.length > 0 && (
            <ul className="py-2">
              {results.map((post) => (
                <li key={post.id}>
                  <button
                    onClick={() => handleSelect(post.slug)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-accent transition-colors"
                  >
                    <img
                      src={getFeaturedImageUrl(post, 'medium')}
                      alt=""
                      className="h-16 w-24 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground line-clamp-1">
                        {stripHtml(post.title.rendered)}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {stripHtml(post.excerpt.rendered)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(post.date)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {debouncedQuery.length < 2 && (
            <div className="py-8 text-center text-muted-foreground">
              <p>Type at least 2 characters to search</p>
              <p className="text-xs mt-2">
                Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">⌘K</kbd> to open search
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
