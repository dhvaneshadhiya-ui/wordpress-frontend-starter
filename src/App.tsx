import { Suspense, lazy, useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { initLocalData, isLocalDataLoaded } from '@/lib/local-data';

// Lazy load pages for better code splitting
const Index = lazy(() => import('./pages/Index'));
const SinglePost = lazy(() => import('./pages/SinglePost'));
const CategoryArchive = lazy(() => import('./pages/CategoryArchive'));
const TagArchive = lazy(() => import('./pages/TagArchive'));
const AuthorArchive = lazy(() => import('./pages/AuthorArchive'));
const PreviewPost = lazy(() => import('./pages/PreviewPost'));
const BuildDashboard = lazy(() => import('./pages/BuildDashboard'));
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

function AppContent() {
  const [dataReady, setDataReady] = useState(isLocalDataLoaded());

  useEffect(() => {
    // Wait for local data to load before rendering routes
    initLocalData().then(() => {
      setDataReady(true);
    });
  }, []);

  if (!dataReady) {
    return <LoadingSkeleton />;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/preview" element={<PreviewPost />} />
      <Route path="/admin/builds" element={<BuildDashboard />} />
      <Route path="/category/:slug" element={<CategoryArchive />} />
      <Route path="/tag/:slug" element={<TagArchive />} />
      <Route path="/author/:slug" element={<AuthorArchive />} />
      <Route path="/:slug" element={<SinglePost />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingSkeleton />}>
            <AppContent />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
