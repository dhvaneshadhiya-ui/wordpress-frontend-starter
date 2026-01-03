import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import SEO from '@/components/SEO';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <Layout>
      <SEO title="Page Not Found - iGeeksBlog" description="The page you're looking for doesn't exist." />
      
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-6xl md:text-8xl font-bold text-muted-foreground/30 mb-4">404</h1>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </main>
    </Layout>
  );
}
