import { WPPost, stripHtml } from './wordpress';
import { FRONTEND_URL } from './constants';

/**
 * Generate dynamic OG image URL for a post
 * Points to the /og or /api/og edge function
 */
export function generateOgImageUrl(post: WPPost): string {
  const params = new URLSearchParams();

  // Title (cleaned of HTML)
  const title = stripHtml(post.title.rendered);
  params.set('title', title);

  // Featured image
  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  if (featuredImage) {
    params.set('image', featuredImage);
  }

  // Author name
  const author = post._embedded?.author?.[0]?.name;
  if (author) {
    params.set('author', author);
  }

  // Primary category
  const category = post._embedded?.['wp:term']?.[0]?.[0]?.name;
  if (category) {
    params.set('category', category);
  }

  // Use /og for Netlify compatibility, Vercel will route /api/og
  return `${FRONTEND_URL}/og?${params.toString()}`;
}

/**
 * Generate OG image URL from raw post data (for SSG/prerender)
 */
export function generateOgImageUrlFromData(data: {
  title: string;
  image?: string;
  author?: string;
  category?: string;
}): string {
  const params = new URLSearchParams();

  params.set('title', data.title);
  
  if (data.image) {
    params.set('image', data.image);
  }
  
  if (data.author) {
    params.set('author', data.author);
  }
  
  if (data.category) {
    params.set('category', data.category);
  }

  return `${FRONTEND_URL}/og?${params.toString()}`;
}
