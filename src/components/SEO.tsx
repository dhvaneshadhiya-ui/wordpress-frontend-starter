import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { WPPost, WPCategory, WPAuthor, stripHtml } from '@/lib/wordpress';

interface FAQ {
  question: string;
  answer: string;
}

interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

interface HowToData {
  name: string;
  description?: string;
  totalTime?: string; // ISO 8601 duration (e.g., "PT30M")
  steps: HowToStep[];
}

interface VideoData {
  name: string;
  description?: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  embedUrl: string;
  contentUrl?: string;
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
  howTo?: HowToData;
  videos?: VideoData[];
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

// Generate HowTo JSON-LD schema
function generateHowToSchema(howTo: HowToData) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": howTo.name,
    ...(howTo.description && { "description": howTo.description }),
    ...(howTo.totalTime && { "totalTime": howTo.totalTime }),
    "step": howTo.steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      ...(step.image && { "image": step.image })
    }))
  };
}

// Extract HowTo steps from WordPress post content
function extractHowToFromContent(html: string, postTitle: string): HowToData | null {
  const steps: HowToStep[] = [];
  
  // Pattern 1: Numbered headings like "Step 1:", "1.", "Step 1 -"
  const numberedStepRegex = /<h[234][^>]*>(?:Step\s*)?(\d+)[.:\-–—]?\s*([^<]+)<\/h[234]>\s*(?:<p>([^<]+(?:<[^>]+>[^<]*)*)<\/p>)?/gi;
  
  let match;
  while ((match = numberedStepRegex.exec(html)) !== null && steps.length < 15) {
    const name = stripHtml(match[2]).trim();
    const text = match[3] ? stripHtml(match[3]).trim() : name;
    
    if (name.length > 5 && name.length < 200) {
      steps.push({ name, text });
    }
  }
  
  // Pattern 2: If no numbered headings, try ordered lists
  if (steps.length < 3) {
    steps.length = 0;
    const orderedListRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
    const listItemRegex = /<li[^>]*>([^<]+(?:<[^>]+>[^<]*)*)<\/li>/gi;
    
    const olMatch = orderedListRegex.exec(html);
    if (olMatch) {
      let liMatch;
      while ((liMatch = listItemRegex.exec(olMatch[1])) !== null && steps.length < 15) {
        const text = stripHtml(liMatch[1]).trim();
        if (text.length > 10) {
          steps.push({ name: text.substring(0, 80), text });
        }
      }
    }
  }
  
  // Only return if we have at least 3 steps
  if (steps.length >= 3) {
    return {
      name: stripHtml(postTitle),
      steps
    };
  }
  
  return null;
}

// Generate VideoObject JSON-LD schema
function generateVideoSchema(video: VideoData) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.name,
    "description": video.description || video.name,
    "thumbnailUrl": video.thumbnailUrl,
    "uploadDate": video.uploadDate,
    ...(video.duration && { "duration": video.duration }),
    ...(video.contentUrl && { "contentUrl": video.contentUrl }),
    "embedUrl": video.embedUrl
  };
}

// Extract videos from WordPress post content (YouTube embeds)
function extractVideosFromContent(html: string, postTitle: string, postDate: string): VideoData[] {
  const videos: VideoData[] = [];
  const videoIds = new Set<string>();
  
  // Pattern 1: YouTube iframes
  const youtubeIframeRegex = /<iframe[^>]*src=["'](?:https?:)?\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})[^"']*["'][^>]*>/gi;
  
  // Pattern 2: YouTube watch URLs
  const youtubeWatchRegex = /(?:https?:)?\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi;
  
  // Pattern 3: youtu.be short URLs
  const youtubeShortRegex = /(?:https?:)?\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/gi;
  
  let match;
  
  while ((match = youtubeIframeRegex.exec(html)) !== null) {
    videoIds.add(match[1]);
  }
  
  while ((match = youtubeWatchRegex.exec(html)) !== null) {
    videoIds.add(match[1]);
  }
  
  while ((match = youtubeShortRegex.exec(html)) !== null) {
    videoIds.add(match[1]);
  }
  
  // Convert to VideoData objects (limit to 5)
  let index = 0;
  for (const videoId of videoIds) {
    if (index >= 5) break;
    
    videos.push({
      name: index === 0 ? stripHtml(postTitle) : `${stripHtml(postTitle)} - Video ${index + 1}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      uploadDate: postDate,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      contentUrl: `https://www.youtube.com/watch?v=${videoId}`
    });
    index++;
  }
  
  return videos;
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
  faqs,
  howTo,
  videos
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
  
  // Canonical URL logic:
  // For articles: ALWAYS use explicit URL prop or construct from slug (AIOSEO returns incorrect homepage canonical)
  // For other pages: Try AIOSEO, then prop, then dynamic URL
  let finalUrl: string;
  if (type === 'article') {
    // Articles MUST use the explicit URL - never trust AIOSEO canonical for articles
    finalUrl = url || `${SITE_URL}/${post?.slug || location.pathname.slice(1)}`;
  } else {
    finalUrl = 
      aioseoParsed.canonical || 
      aioseoParsed['og:url'] ||
      url || 
      dynamicUrl;
  }

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

  // Generate HowTo schema - use provided data or extract from post content
  const detectedHowTo = post?.content?.rendered 
    ? extractHowToFromContent(post.content.rendered, post.title.rendered) 
    : null;
  const finalHowTo = howTo || detectedHowTo;
  const howToSchema = finalHowTo ? generateHowToSchema(finalHowTo) : null;

  // Generate Video schema - use provided data or extract from post content
  const detectedVideos = post?.content?.rendered 
    ? extractVideosFromContent(post.content.rendered, post.title.rendered, post.date) 
    : [];
  const finalVideos = videos || (detectedVideos.length > 0 ? detectedVideos : null);

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
      
      {/* JSON-LD Schema for HowTo */}
      {howToSchema && (
        <script type="application/ld+json">
          {JSON.stringify(howToSchema)}
        </script>
      )}
      
      {/* JSON-LD Schema for VideoObject(s) */}
      {finalVideos?.map((video, index) => (
        <script key={`video-${index}`} type="application/ld+json">
          {JSON.stringify(generateVideoSchema(video))}
        </script>
      ))}
    </Helmet>
  );
}
