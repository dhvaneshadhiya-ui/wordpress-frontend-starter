import { FRONTEND_URL, BACKEND_URL } from './constants';

/**
 * Transform internal links in WordPress content from backend to frontend domain.
 * Only transforms href attributes, leaving image src attributes unchanged.
 */
export function transformContentLinks(html: string): string {
  if (!html) return html;
  
  // Escape special regex characters in the backend URL
  const escapedBackendUrl = BACKEND_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Only replace href attributes (links), not src attributes (images)
  const linkPattern = new RegExp(`(href=["'])${escapedBackendUrl}`, 'gi');
  
  return html.replace(linkPattern, `$1${FRONTEND_URL}`);
}
