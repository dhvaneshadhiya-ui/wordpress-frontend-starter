interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

const CACHE_PREFIX = 'igb_cache_';
const CACHE_VERSION = '5'; // Bumped for new caching strategy
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour default
export const POSTS_TTL = 24 * 60 * 60 * 1000; // 24 hours for posts
export const TAXONOMY_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for categories/tags

// Get raw cache entry for metadata access
function getCacheEntry<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    
    // Invalidate if version mismatch
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    
    return entry;
  } catch {
    return null;
  }
}

export function getCachedData<T>(key: string): T | null {
  const entry = getCacheEntry<T>(key);
  // Return data even if expired (stale-while-revalidate)
  return entry?.data ?? null;
}

// Check if cache is still fresh (not expired)
export function isCacheFresh(key: string): boolean {
  const entry = getCacheEntry<unknown>(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < entry.ttl;
}

// Get cache age in milliseconds (for staleTime calculation)
export function getCacheAge(key: string): number | null {
  const entry = getCacheEntry<unknown>(key);
  if (!entry) return null;
  return Date.now() - entry.timestamp;
}

export function setCachedData<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: CACHE_VERSION,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable - fail silently
  }
}

export function clearStaleVersionCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}');
          if (entry.version !== CACHE_VERSION) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    // Fail silently
  }
}

export function generateCacheKey(prefix: string, params: object): string {
  return `${prefix}_${JSON.stringify(params)}`;
}
