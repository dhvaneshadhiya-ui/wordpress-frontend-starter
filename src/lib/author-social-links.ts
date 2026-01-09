// Author social profile mappings for sameAs schema property
// Maps author slugs to their verified social media URLs for E-E-A-T signals

export const AUTHOR_SOCIAL_LINKS: Record<string, string[]> = {
  'dhvanesh': [
    'https://twitter.com/igeeksblog',
    'https://www.linkedin.com/in/dhvanesh-adhiya/'
  ],
  'iosblogger': [
    'https://twitter.com/jikiblg'
  ],
  // Add more authors as needed:
  // 'author-slug': ['https://twitter.com/handle', 'https://linkedin.com/in/profile']
};

/**
 * Get sameAs array for an author by slug
 * Returns empty array if author has no social links configured
 */
export function getAuthorSameAs(authorSlug: string): string[] {
  return AUTHOR_SOCIAL_LINKS[authorSlug] || [];
}
