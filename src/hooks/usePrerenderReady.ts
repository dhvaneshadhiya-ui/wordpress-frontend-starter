import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    __PRERENDER_COMPLETE?: boolean;
  }
}

const MAX_WAIT_TIME = 10000; // 10 seconds max wait for prerender services

/**
 * Sets window.__PRERENDER_COMPLETE = true when content is ready.
 * Used by pre-rendering services (LovableHTML) to detect when
 * the SPA has finished loading async data.
 * 
 * Includes a timeout fallback to prevent infinite waits.
 */
export function usePrerenderReady(ready: boolean) {
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Set signal immediately if ready
    if (ready && !window.__PRERENDER_COMPLETE) {
      window.__PRERENDER_COMPLETE = true;
      console.log('[Prerender] Content ready signal set');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    
    // Set fallback timeout if not already complete and no timeout pending
    if (!window.__PRERENDER_COMPLETE && !timeoutRef.current) {
      timeoutRef.current = window.setTimeout(() => {
        if (!window.__PRERENDER_COMPLETE) {
          window.__PRERENDER_COMPLETE = true;
          console.log('[Prerender] Timeout fallback - signal set after max wait');
        }
        timeoutRef.current = null;
      }, MAX_WAIT_TIME);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [ready]);
}
