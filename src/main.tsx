import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { clearStaleVersionCaches } from "./lib/local-cache";

// Clean up old version caches on app init
clearStaleVersionCaches();


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
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
