import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Direct imports - no lazy loading for reliability
import Index from './pages/Index';
import SinglePost from './pages/SinglePost';
import CategoryArchive from './pages/CategoryArchive';
import TagArchive from './pages/TagArchive';
import AuthorArchive from './pages/AuthorArchive';
import PreviewPost from './pages/PreviewPost';
import NotFound from './pages/NotFound';

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
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/preview" element={<PreviewPost />} />
            <Route path="/category/:slug" element={<CategoryArchive />} />
            <Route path="/tag/:slug" element={<TagArchive />} />
            <Route path="/author/:slug" element={<AuthorArchive />} />
            <Route path="/:slug" element={<SinglePost />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
