import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { FRONTEND_URL } from '@/lib/constants';

interface GonePageProps {
  slug: string;
}

export function GonePage({ slug }: GonePageProps) {
  return (
    <Layout>
      <SEO 
        title="Content Removed"
        description="This content has been permanently removed."
        type="website"
        url={`${FRONTEND_URL}/${slug}`}
      />
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-6xl font-bold text-muted-foreground mb-4">410</h1>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Content Removed
        </h2>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          This article has been permanently removed and is no longer available.
        </p>
        <Link 
          to="/" 
          className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Browse Latest Articles
        </Link>
      </div>
    </Layout>
  );
}
