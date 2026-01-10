import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { clearStaleVersionCaches } from "./lib/local-cache";

// Unregister any stale service workers that might be caching old content
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('[SW] Unregistered stale service worker');
    }
  });
}

// Handle manual cache clearing via URL parameter ?clearCache=1
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('clearCache') === '1') {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('igb_cache_')) {
        localStorage.removeItem(key);
      }
    }
    console.log('[Cache] Manually cleared all caches');
    urlParams.delete('clearCache');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }
}

// Clean up old version caches on app init
clearStaleVersionCaches();


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1, // Reduced for faster fallback
      refetchOnWindowFocus: false,
      throwOnError: false, // Never throw - handle via error state
    },
  },
});

const rootElement = document.getElementById("root");

if (rootElement) {
  const app = (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );

  // Always use createRoot - SSG pre-rendering is not available in Lovable deployment
  createRoot(rootElement).render(app);
} else {
  document.body.innerHTML = '<div style="padding: 40px; color: red;">Root element not found</div>';
}
