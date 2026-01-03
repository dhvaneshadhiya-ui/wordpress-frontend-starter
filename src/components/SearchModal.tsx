import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { usePosts } from '@/hooks/useWordPress';
import { useDebounce } from '@/hooks/useDebounce';
import { FileText, Loader2 } from 'lucide-react';

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const navigate = useNavigate();

  const { data, isLoading } = usePosts(
    { search: debouncedSearch, perPage: 10 },
    { enabled: debouncedSearch.length >= 2 }
  );

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (slug: string) => {
    navigate(`/${slug}`);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search posts..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {!isLoading && debouncedSearch.length >= 2 && (
          <CommandEmpty>No posts found.</CommandEmpty>
        )}

        {!isLoading && data?.posts && data.posts.length > 0 && (
          <CommandGroup heading="Posts">
            {data.posts.map((post) => (
              <CommandItem
                key={post.id}
                value={post.slug}
                onSelect={() => handleSelect(post.slug)}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                <span className="truncate">{stripHtml(post.title.rendered)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!isLoading && debouncedSearch.length < 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search...
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
