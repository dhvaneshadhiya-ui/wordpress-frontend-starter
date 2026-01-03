import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePosts } from '@/hooks/useWordPress';
import { useDebounce } from '@/hooks/useDebounce';
import { getFeaturedImageUrl, formatDate } from '@/lib/wordpress';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();

  const { data, isLoading } = usePosts(
    { search: debouncedQuery, perPage: 5 },
    { enabled: debouncedQuery.length >= 2 }
  );

  const handleSelect = (slug: string) => {
    navigate(`/${slug}`);
    onOpenChange(false);
    setQuery('');
  };

  // Reset query when modal closes
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0">
        <div className="flex items-center border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="shrink-0">
              <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && debouncedQuery.length >= 2 && data?.posts.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No results found for "{debouncedQuery}"
            </div>
          )}

          {!isLoading && data?.posts && data.posts.length > 0 && (
            <div className="py-2">
              {data.posts.map((post) => {
                const image = getFeaturedImageUrl(post, 'thumbnail');
                return (
                  <button
                    key={post.id}
                    onClick={() => handleSelect(post.slug)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                  >
                    {image && (
                      <img
                        src={image}
                        alt=""
                        className="h-12 w-12 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                      />
                      <p className="text-sm text-muted-foreground">
                        {formatDate(post.date)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {query.length < 2 && (
            <div className="py-8 text-center text-muted-foreground">
              <p>Type at least 2 characters to search</p>
              <p className="text-sm mt-2">Press ⌘K to open search</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
