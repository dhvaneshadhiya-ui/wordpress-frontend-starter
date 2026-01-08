interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const CACHE_PREFIX = 'igb_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Return data even if expired (stale-while-revalidate)
    // React Query will fetch fresh data in background
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable - fail silently
  }
}

export function generateCacheKey(prefix: string, params: object): string {
  return `${prefix}_${JSON.stringify(params)}`;
}
