import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Direct imports - no lazy loading for reliability
import Index from './pages/Index';
import SinglePost from './pages/SinglePost';
import CategoryArchive from './pages/CategoryArchive';
import TagArchive from './pages/TagArchive';
import AuthorArchive from './pages/AuthorArchive';
import PreviewPost from './pages/PreviewPost';
import StaticPage from './pages/StaticPage';
import NotFound from './pages/NotFound';
import { ScrollToTop } from '@/components/ScrollToTop';

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/preview" element={<PreviewPost />} />
        <Route path="/category/:slug" element={<CategoryArchive />} />
        <Route path="/tag/:slug" element={<TagArchive />} />
        <Route path="/author/:slug" element={<AuthorArchive />} />
        {/* Static pages */}
        <Route path="/about" element={<StaticPage slug="about" />} />
        <Route path="/contact-us" element={<StaticPage slug="contact-us" />} />
        <Route path="/privacy-policy" element={<StaticPage slug="privacy-policy" />} />
        {/* Dynamic post route - must come after specific routes */}
        <Route path="/:slug" element={<SinglePost />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
