import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

export default function SEO({
  title = 'iGeeksBlog - Apple News, iPhone, iPad, Mac, How-To',
  description = 'Your daily source for Apple news, reviews, tips and how-to guides for iPhone, iPad, Mac, Apple Watch and more.',
  image,
  url,
  type = 'website',
}: SEOProps) {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dev.igeeksblog.com';
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : siteUrl);
  const ogImage = image || `${siteUrl}/og-image.png`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="iGeeksBlog" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
