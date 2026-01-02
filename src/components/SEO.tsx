import { Helmet } from 'react-helmet-async';
import { WPPost } from '@/lib/wordpress';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  post?: WPPost;
}

const SITE_NAME = 'iGeeksBlog';
const DEFAULT_DESCRIPTION = 'Your daily source for Apple news, how-to guides, tips, and app reviews.';
const DEFAULT_IMAGE = 'https://dev.igeeksblog.com/wp-content/uploads/2020/12/igeeksblog-logo.png';
const SITE_URL = 'https://dev.igeeksblog.com';

export function SEO({ title, description, image, url, type = 'website', post }: SEOProps) {
  // Extract SEO data from WordPress post if available (AIOSEO/Yoast)
  const seoData = post?.yoast_head_json;
  
  const finalTitle = seoData?.title || title 
    ? `${title} | ${SITE_NAME}` 
    : SITE_NAME;
  
  const finalDescription = seoData?.description || description || DEFAULT_DESCRIPTION;
  
  const finalImage = seoData?.og_image?.[0]?.url || image || DEFAULT_IMAGE;
  
  const finalUrl = url || SITE_URL;

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalUrl} />
    </Helmet>
  );
}
