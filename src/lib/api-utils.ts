/**
 * API utility functions for resilient fetching
 */

const DEFAULT_TIMEOUT = 8000; // 8 seconds (reduced for faster fallback)
const MAX_RETRIES = 1; // Reduced for faster failure with fallback
const RETRY_DELAYS = [500, 1000]; // Faster backoff

// Request deduplication - prevent duplicate concurrent requests
const inflightRequests = new Map<string, Promise<Response>>();

export class ApiError extends Error {
  status?: number;
  isTimeout: boolean;
  
  constructor(message: string, status?: number, isTimeout = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isTimeout = isTimeout;
  }
}

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeout}ms`, undefined, true);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry logic and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT,
  maxRetries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      
      if (response.status >= 500 && attempt < maxRetries) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.warn(`[API] Server error ${response.status}, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (error instanceof ApiError && !error.isTimeout) {
        console.error(`[API] Error: ${url}`, error);
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.warn(`[API] Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      }
    }
  }
  
  console.error(`[API] Failed after retries: ${url}`, lastError);
  throw lastError || new ApiError('Request failed after retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with deduplication - prevents duplicate concurrent requests to the same URL
 * Useful for avoiding redundant API calls when multiple components request the same data
 */
export async function fetchWithDedup(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  // Create a cache key from URL and relevant options
  const cacheKey = `${url}|${options.method || 'GET'}`;
  
  // If there's already an in-flight request for this URL, return it
  const existing = inflightRequests.get(cacheKey);
  if (existing) {
    return existing.then(response => response.clone());
  }
  
  // Create new request and track it
  const promise = fetchWithRetry(url, options, timeout)
    .finally(() => {
      // Clean up after request completes
      inflightRequests.delete(cacheKey);
    });
  
  inflightRequests.set(cacheKey, promise);
  
  return promise;
}

/**
 * Check if API is reachable with a lightweight request
 */
export async function checkApiHealth(apiBaseUrl: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/posts?per_page=1&_fields=id`,
      { cache: 'no-store' },
      5000 // 5 second timeout for health check
    );
    return response.ok;
  } catch {
    return false;
  }
}
