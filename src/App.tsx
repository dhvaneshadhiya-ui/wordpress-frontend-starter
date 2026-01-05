import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load pages with retry logic for cache issues
const lazyWithRetry = (importFn: () => Promise<{ default: React.ComponentType }>) =>
  lazy(() =>
    importFn().catch(() => {
      // On import failure, reload to clear stale cache
      window.location.reload();
      return { default: () => null };
    })
  );

const Index = lazyWithRetry(() => import('./pages/Index'));
const SinglePost = lazyWithRetry(() => import('./pages/SinglePost'));
const CategoryArchive = lazyWithRetry(() => import('./pages/CategoryArchive'));
const TagArchive = lazyWithRetry(() => import('./pages/TagArchive'));
const AuthorArchive = lazyWithRetry(() => import('./pages/AuthorArchive'));
const PreviewPost = lazyWithRetry(() => import('./pages/PreviewPost'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

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

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<LoadingSkeleton />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/preview" element={<PreviewPost />} />
                <Route path="/category/:slug" element={<CategoryArchive />} />
                <Route path="/tag/:slug" element={<TagArchive />} />
                <Route path="/author/:slug" element={<AuthorArchive />} />
                <Route path="/:slug" element={<SinglePost />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
