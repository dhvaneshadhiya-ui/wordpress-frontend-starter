import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { WPPost, WPCategory, WPAuthor, stripHtml } from '@/lib/wordpress';

interface FAQ {
  question: string;
  answer: string;
}

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  post?: WPPost;
  category?: WPCategory;
  author?: WPAuthor;
  noindex?: boolean;
  isHomePage?: boolean;
  faqs?: FAQ[];
}

const SITE_NAME = 'iGeeksBlog';
const DEFAULT_DESCRIPTION = 'Your daily source for Apple news, how-to guides, tips, and app reviews.';
const DEFAULT_IMAGE = 'https://dev.igeeksblog.com/wp-content/uploads/2020/12/igeeksblog-logo.png';
const SITE_URL = 'https://dev.igeeksblog.com';
const TWITTER_HANDLE = '@igeeksblog';

// Environment-based indexing control
const ENABLE_INDEXING = import.meta.env.VITE_ENABLE_INDEXING === 'true';

// Organization Schema (site-wide)
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "iGeeksBlog",
  "url": SITE_URL,
  "logo": DEFAULT_IMAGE,
  "description": DEFAULT_DESCRIPTION,
  "foundingDate": "2012",
  "sameAs": [
    "https://twitter.com/igeeksblog",
    "https://www.facebook.com/iGeeksBlog",
    "https://www.youtube.com/igeeksblog"
  ]
};

// WebSite Schema with SearchAction (for homepage)
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "iGeeksBlog",
  "url": SITE_URL,
  "description": DEFAULT_DESCRIPTION,
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${SITE_URL}/?s={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
};

// Generate Article JSON-LD schema for blog posts with enhanced fields
function generateArticleSchema(post: WPPost, imageUrl: string, description: string, canonicalUrl: string) {
  const author = post._embedded?.author?.[0];
  const categories = post._embedded?.['wp:term']?.[0] || [];
  const tags = post._embedded?.['wp:term']?.[1] || [];
  const primaryCategory = categories[0];
  
  // Calculate word count from content
  const wordCount = post.content?.rendered 
    ? stripHtml(post.content.rendered).split(/\s+/).filter(Boolean).length 
    : undefined;
  
  // Extract keywords from tags
  const keywords = tags.map((tag: { name: string }) => tag.name);
  
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": stripHtml(post.title.rendered),
    "description": description,
    "image": imageUrl,
    "datePublished": post.date,
    "dateModified": post.modified,
    ...(wordCount && { "wordCount": wordCount }),
    ...(keywords.length > 0 && { "keywords": keywords.join(", ") }),
    "author": {
      "@type": "Person",
      "name": author?.name || "iGeeksBlog",
      "url": author?.slug ? `${SITE_URL}/author/${author.slug}` : SITE_URL
    },
    "publisher": {
      "@type": "Organization",
      "name": "iGeeksBlog",
      "logo": {
        "@type": "ImageObject",
        "url": DEFAULT_IMAGE
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    ...(primaryCategory && {
      "articleSection": primaryCategory.name
    }),
    // Speakable specification for voice search optimization
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".post-content p:first-of-type"]
    }
  };
}

// Generate BreadcrumbList JSON-LD schema
function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

// Generate Person JSON-LD schema for author pages
function generatePersonSchema(author: WPAuthor) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": author.name,
    "url": `${SITE_URL}/author/${author.slug}`,
    "description": author.description || undefined,
    "image": author.avatar_urls?.['96']
  };
}

// Generate FAQPage JSON-LD schema
function generateFAQSchema(faqs: FAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

// Extract FAQs from WordPress post content
function extractFAQsFromContent(html: string): FAQ[] {
  const faqs: FAQ[] = [];
  
  // Look for FAQ-like patterns: headings followed by paragraphs
  // Pattern: <h3>Question?</h3> followed by <p>Answer</p>
  const questionAnswerRegex = /<h[34][^>]*>([^<]*\?[^<]*)<\/h[34]>\s*<p>([^<]+(?:<[^>]+>[^<]*)*)<\/p>/gi;
  
  let match;
  while ((match = questionAnswerRegex.exec(html)) !== null && faqs.length < 10) {
    const question = stripHtml(match[1]).trim();
    const answer = stripHtml(match[2]).trim();
    
    // Only include if both question and answer are meaningful
    if (question.length > 10 && question.length < 200 && answer.length > 20) {
      faqs.push({ question, answer });
    }
  }
  
  return faqs;
}

// Parse meta tags from raw AIOSEO HTML with improved regex
function parseAioseoHead(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  
  // Extract title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) meta.title = titleMatch[1];
  
  // Extract meta description (handle both quote styles)
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (descMatch) meta.description = descMatch[1];
  
  // Extract OG tags
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitleMatch) meta['og:title'] = ogTitleMatch[1];
  
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  if (ogDescMatch) meta['og:description'] = ogDescMatch[1];
  
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogImageMatch) meta['og:image'] = ogImageMatch[1];
  
  const ogUrlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
  if (ogUrlMatch) meta['og:url'] = ogUrlMatch[1];
  
  // Extract Twitter tags
  const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
  if (twitterImageMatch) meta['twitter:image'] = twitterImageMatch[1];
  
  // Extract canonical
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (canonicalMatch) meta.canonical = canonicalMatch[1];
  
  // Extract article-specific meta
  const publishedMatch = html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i);
  if (publishedMatch) meta['article:published_time'] = publishedMatch[1];
  
  const modifiedMatch = html.match(/<meta\s+property=["']article:modified_time["']\s+content=["']([^"']+)["']/i);
  if (modifiedMatch) meta['article:modified_time'] = modifiedMatch[1];
  
  return meta;
}

export function SEO({ 
  title, 
  description, 
  image, 
  url, 
  type = 'website', 
  post, 
  category,
  author,
  noindex = false,
  isHomePage = false,
  faqs
}: SEOProps) {
  const location = useLocation();
  
  // Parse AIOSEO data from raw HTML or JSON
  const aioseoJson = post?.aioseo_head_json;
  const aioseoParsed = post?.aioseo_head ? parseAioseoHead(post.aioseo_head) : {};
  const yoastData = post?.yoast_head_json;
  
  // Generate dynamic canonical URL from current path
  const dynamicUrl = `${SITE_URL}${location.pathname}`;
  
  // Priority: AIOSEO JSON > AIOSEO Parsed HTML > Yoast > Props > Defaults
  const finalTitle = 
    aioseoJson?.title || 
    aioseoParsed.title ||
    yoastData?.title || 
    (title ? `${title} | ${SITE_NAME}` : SITE_NAME);
  
  // For description, also try post excerpt as fallback
  const excerptFallback = post?.excerpt?.rendered 
    ? stripHtml(post.excerpt.rendered).substring(0, 160) 
    : undefined;
  
  const finalDescription = 
    aioseoJson?.description || 
    aioseoParsed.description ||
    yoastData?.description || 
    description || 
    excerptFallback ||
    DEFAULT_DESCRIPTION;
  
  const finalImage = 
    aioseoJson?.['og:image'] || 
    aioseoParsed['og:image'] ||
    yoastData?.og_image?.[0]?.url || 
    image || 
    DEFAULT_IMAGE;
  
  const finalUrl = 
    aioseoParsed.canonical || 
    aioseoParsed['og:url'] ||
    url || 
    dynamicUrl;

  // Article-specific metadata
  const postAuthor = post?._embedded?.author?.[0];
  const postCategories = post?._embedded?.['wp:term']?.[0] || [];
  const primaryCategory = postCategories[0];
  const authorUrl = postAuthor?.slug ? `${SITE_URL}/author/${postAuthor.slug}` : undefined;

  // Generate Article schema for blog posts
  const articleSchema = (type === 'article' && post) 
    ? generateArticleSchema(post, finalImage, finalDescription, finalUrl)
    : null;

  // Generate breadcrumb schema
  const breadcrumbs: { name: string; url: string }[] = [
    { name: 'Home', url: SITE_URL }
  ];
  
  if (type === 'article' && post) {
    if (primaryCategory) {
      breadcrumbs.push({ 
        name: primaryCategory.name, 
        url: `${SITE_URL}/category/${primaryCategory.slug}` 
      });
    }
    breadcrumbs.push({ 
      name: stripHtml(post.title.rendered), 
      url: finalUrl 
    });
  } else if (category) {
    breadcrumbs.push({ name: category.name, url: finalUrl });
  } else if (author) {
    breadcrumbs.push({ name: author.name, url: finalUrl });
  }

  const breadcrumbSchema = breadcrumbs.length > 1 ? generateBreadcrumbSchema(breadcrumbs) : null;
  
  // Generate Person schema for author pages
  const personSchema = author ? generatePersonSchema(author) : null;

  // Generate FAQ schema - use provided FAQs or extract from post content
  const detectedFaqs = post?.content?.rendered 
    ? extractFAQsFromContent(post.content.rendered) 
    : [];
  const finalFaqs = faqs || (detectedFaqs.length >= 2 ? detectedFaqs : null);
  const faqSchema = finalFaqs && finalFaqs.length >= 2 
    ? generateFAQSchema(finalFaqs) 
    : null;

  // Determine robots directive based on environment
  const robotsContent = ENABLE_INDEXING && !noindex ? "index, follow" : "noindex, nofollow";

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      
      {/* Robots - Environment-based indexing control */}
      <meta name="robots" content={robotsContent} />
      
      {/* Open Graph - Common */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      
      {/* Open Graph - Article specific */}
      {type === 'article' && post && (
        <>
          <meta property="article:published_time" content={aioseoParsed['article:published_time'] || post.date} />
          <meta property="article:modified_time" content={aioseoParsed['article:modified_time'] || post.modified} />
          {authorUrl && <meta property="article:author" content={authorUrl} />}
          {primaryCategory && <meta property="article:section" content={primaryCategory.name} />}
        </>
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={aioseoParsed['twitter:image'] || finalImage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalUrl} />
      
      {/* JSON-LD Schema for Organization (site-wide) */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      
      {/* JSON-LD Schema for WebSite with SearchAction (homepage only) */}
      {isHomePage && (
        <script type="application/ld+json">
          {JSON.stringify(websiteSchema)}
        </script>
      )}
      
      {/* JSON-LD Schema for Articles */}
      {articleSchema && (
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
      )}
      
      {/* JSON-LD Schema for Breadcrumbs */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
      
      {/* JSON-LD Schema for Person (Author pages) */}
      {personSchema && (
        <script type="application/ld+json">
          {JSON.stringify(personSchema)}
        </script>
      )}
      
      {/* JSON-LD Schema for FAQPage */}
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
    </Helmet>
  );
}
