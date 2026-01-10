import { useEffect } from 'react';

declare global {
  interface Window {
    __PRERENDER_COMPLETE?: boolean;
  }
}

/**
 * Sets window.__PRERENDER_COMPLETE = true when content is ready.
 * Used by pre-rendering services (LovableHTML) to detect when
 * the SPA has finished loading async data.
 */
export function usePrerenderReady(ready: boolean) {
  useEffect(() => {
    if (ready && !window.__PRERENDER_COMPLETE) {
      window.__PRERENDER_COMPLETE = true;
      console.log('[Prerender] Content ready signal set');
    }
  }, [ready]);
}
