/**
 * Platform detection utility
 * Identifies deployment environment for platform-specific features
 */

export type Platform = 'vercel' | 'netlify' | 'lovable' | 'local';

/**
 * Detect the current deployment platform
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'local';
  
  const hostname = window.location.hostname;
  
  // Vercel deployments
  if (hostname.includes('vercel.app') || 
      hostname === 'wp.dev.igeeksblog.com') {
    return 'vercel';
  }
  
  // Netlify deployments
  if (hostname.includes('netlify.app') || 
      hostname.includes('netlify.live')) {
    return 'netlify';
  }
  
  // Lovable preview
  if (hostname.includes('lovable.app') || 
      hostname.includes('lovableproject.com')) {
    return 'lovable';
  }
  
  return 'local';
}

export const platform = detectPlatform();
export const isVercel = platform === 'vercel';
export const isNetlify = platform === 'netlify';
export const isLovable = platform === 'lovable';
export const isProduction = isVercel || isNetlify;
