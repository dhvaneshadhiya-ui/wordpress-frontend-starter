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

// Parse meta tags from raw AIOSEO HTML
function parseAioseoHead(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  
  // Extract title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) meta.title = titleMatch[1];
  
  // Extract meta description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if (descMatch) meta.description = descMatch[1];
  
  // Extract OG tags
  const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
  if (ogTitleMatch) meta['og:title'] = ogTitleMatch[1];
  
  const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
  if (ogDescMatch) meta['og:description'] = ogDescMatch[1];
  
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (ogImageMatch) meta['og:image'] = ogImageMatch[1];
  
  // Extract Twitter tags
  const twitterImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/);
  if (twitterImageMatch) meta['twitter:image'] = twitterImageMatch[1];
  
  // Extract canonical
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  if (canonicalMatch) meta.canonical = canonicalMatch[1];
  
  return meta;
}

export function SEO({ title, description, image, url, type = 'website', post }: SEOProps) {
  // Parse AIOSEO data from raw HTML or JSON
  const aioseoJson = post?.aioseo_head_json;
  const aioseoParsed = post?.aioseo_head ? parseAioseoHead(post.aioseo_head) : {};
  const yoastData = post?.yoast_head_json;
  
  // Priority: AIOSEO JSON > AIOSEO Parsed HTML > Yoast > Props > Defaults
  const finalTitle = 
    aioseoJson?.title || 
    aioseoParsed.title ||
    yoastData?.title || 
    (title ? `${title} | ${SITE_NAME}` : SITE_NAME);
  
  const finalDescription = 
    aioseoJson?.description || 
    aioseoParsed.description ||
    yoastData?.description || 
    description || 
    DEFAULT_DESCRIPTION;
  
  const finalImage = 
    aioseoJson?.['og:image'] || 
    aioseoParsed['og:image'] ||
    yoastData?.og_image?.[0]?.url || 
    image || 
    DEFAULT_IMAGE;
  
  const finalUrl = aioseoParsed.canonical || url || SITE_URL;

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
      <meta name="twitter:image" content={aioseoParsed['twitter:image'] || finalImage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalUrl} />
    </Helmet>
  );
}
