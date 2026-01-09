/**
 * Image optimization utilities
 * Uses platform-specific image CDN when deployed, original URLs otherwise
 */

import { isVercel, isNetlify } from '@/lib/platform';

const VERCEL_IMAGE_BASE = '/_vercel/image';
const NETLIFY_IMAGE_BASE = '/.netlify/images';

// Responsive image widths for srcSet
export const RESPONSIVE_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536];

/**
 * Get an optimized image URL
 * Uses Vercel/Netlify image CDN when deployed, original URLs elsewhere
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality: number = 75
): string {
  // Return placeholder for empty URLs
  if (!url || url === '/placeholder.svg') {
    return '/placeholder.svg';
  }

  // Don't optimize local assets
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }

  // Vercel Image Optimization
  if (isVercel) {
    return `${VERCEL_IMAGE_BASE}?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
  }

  // Netlify Image CDN
  if (isNetlify) {
    return `${NETLIFY_IMAGE_BASE}?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
  }

  // Fallback: return original URL for Lovable preview and local dev
  return url;
}

/**
 * Generate a srcSet string for responsive images
 * @param url - Original image URL
 * @param widths - Array of widths for srcSet
 * @param quality - Image quality
 */
export function generateSrcSet(
  url: string,
  widths: number[] = RESPONSIVE_WIDTHS,
  quality: number = 75
): string {
  if (!url || url === '/placeholder.svg') {
    return '';
  }

  return widths
    .map(w => `${getOptimizedImageUrl(url, w, quality)} ${w}w`)
    .join(', ');
}

/**
 * Get appropriate sizes attribute for responsive images
 * @param variant - Layout variant
 */
export function getImageSizes(variant: 'card' | 'featured' | 'full' = 'card'): string {
  switch (variant) {
    case 'featured':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 1200px';
    case 'full':
      return '100vw';
    case 'card':
    default:
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  }
}

/**
 * Calculate aspect ratio for image containers
 */
export function getAspectRatio(ratio: '16:9' | '4:3' | '1:1' | '3:2' = '16:9'): string {
  const ratios: Record<string, string> = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '3:2': 'aspect-[3/2]',
  };
  return ratios[ratio] || ratios['16:9'];
}
