// Author social profile utilities for sameAs schema property
// Single source of truth for E-E-A-T signals

import authorSocialData from '@/data/author-social-links.json';

interface AuthorSocialData {
  sameAs: string[];
  twitter?: string;
}

const authorData = authorSocialData as Record<string, AuthorSocialData>;

/**
 * Get sameAs array for an author by slug
 * Returns empty array if author has no social links configured
 */
export function getAuthorSameAs(authorSlug: string): string[] {
  return authorData[authorSlug]?.sameAs || [];
}

/**
 * Get Twitter handle for an author by slug
 * Returns null if author has no Twitter configured
 */
export function getAuthorTwitter(authorSlug: string): string | null {
  return authorData[authorSlug]?.twitter || null;
}
