/**
 * API utility functions for resilient fetching
 */

const DEFAULT_TIMEOUT = 10000; // 10 seconds (reduced for faster fallback)
const MAX_RETRIES = 1; // Reduced retries for faster fallback to local data
const RETRY_DELAYS = [1000]; // Single retry delay

/**
 * Check if running in Lovable preview environment
 */
export function isLovablePreview(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.includes('lovableproject.com') || hostname.includes('lovable.app');
}

/**
 * Always prefer local data first for instant content, then refresh from API
 */
export function shouldUseLocalDataFirst(): boolean {
  return true; // Always use local data first for instant rendering
}

/**
 * Check if we should attempt API refresh in background
 */
export function shouldAttemptApiRefresh(): boolean {
  if (typeof window === 'undefined') return false;
  // Don't attempt API in Lovable preview (CORS issues) or offline
  return !isLovablePreview() && navigator.onLine;
}

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
      
      // Retry on server errors (5xx)
      if (response.status >= 500 && attempt < maxRetries) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.warn(`Server error ${response.status}, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on non-timeout client errors
      if (error instanceof ApiError && !error.isTimeout) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.warn(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new ApiError('Request failed after retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
