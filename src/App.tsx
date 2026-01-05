import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

// Lazy load pages for better code splitting
const Index = lazy(() => import('./pages/Index'));
const SinglePost = lazy(() => import('./pages/SinglePost'));
const CategoryArchive = lazy(() => import('./pages/CategoryArchive'));
const TagArchive = lazy(() => import('./pages/TagArchive'));
const AuthorArchive = lazy(() => import('./pages/AuthorArchive'));
const PreviewPost = lazy(() => import('./pages/PreviewPost'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
