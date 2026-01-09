import { FRONTEND_URL, BACKEND_URL } from './constants';

/**
 * Transform internal links in WordPress content from backend to frontend domain.
 * Only transforms href attributes, leaving image src attributes unchanged.
 * Handles http, https, and protocol-relative URLs.
 */
export function transformContentLinks(html: string): string {
  if (!html) return html;
  
  // Extract domain from BACKEND_URL (removes protocol)
  const backendDomain = BACKEND_URL.replace(/^https?:\/\//, '');
  const escapedDomain = backendDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Match href attributes with http, https, or protocol-relative URLs
  // Pattern: href="http://dev.igeeksblog.com" or href="https://..." or href="//..."
  const linkPattern = new RegExp(
    `(href=["'])(?:https?:)?//${escapedDomain}`,
    'gi'
  );
  
  return html.replace(linkPattern, `$1${FRONTEND_URL}`);
}
