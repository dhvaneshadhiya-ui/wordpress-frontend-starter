interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

const CACHE_PREFIX = 'igb_cache_';
const CACHE_VERSION = '1'; // Bump to invalidate all caches on app update
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    
    // Invalidate if version mismatch
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    
    // Return data even if expired (stale-while-revalidate)
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
