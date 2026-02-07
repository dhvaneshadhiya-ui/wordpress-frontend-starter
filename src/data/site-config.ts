/**
 * Site Configuration - Central source of truth for dynamic content
 * 
 * This file controls navigation categories, trending topics, and featured articles.
 * Update IDs/slugs here to change what content appears across the site.
 * 
 * Finding IDs:
 * - Categories: src/data/categories.json (look for "id": number)
 * - Tags: src/data/tags.json (look for "id": number)
 * - Posts: Check post URLs or src/data/posts/*.json files
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface NavPopularItem {
  // Option 1: Use specific post IDs (most control)
  postIds?: number[];
  // Option 2: Use latest posts from a tag
  tagSlug?: string;
  // Number of items to show (default: 4)
  count?: number;
}

export interface NavigationConfig {
  // Category slugs to show in the navigation
  categorySlugs: string[];
  // Popular items configuration per category
  popularItems: Record<string, NavPopularItem>;
}

export interface TrendingTopicConfig {
  // Option A: Specific tag IDs to show
  tagIds?: number[];
  // Option B: Specific tag slugs to show
  tagSlugs?: string[];
  // Color mapping by slug (defaults provided if not specified)
  colors?: Record<string, string>;
}

export interface FeaturedConfig {
  // Hero article: specific post ID OR latest from category
  heroPostId?: number;
  heroCategorySlug?: string;
  // Sidebar articles: specific post IDs OR latest from category/tag
  sidebarPostIds?: number[];
  sidebarCategorySlug?: string;
  sidebarTagSlug?: string;
  sidebarCount?: number;
}

export interface SiteConfig {
  navigation: NavigationConfig;
  trending: TrendingTopicConfig;
  featured: FeaturedConfig;
}

// ============================================
// DEFAULT COLOR PALETTE FOR TRENDING TOPICS
// ============================================

const DEFAULT_TRENDING_COLORS: Record<string, string> = {
  // Categories
  'iphone': 'bg-blue-500',
  'mac': 'bg-purple-600',
  'ipad': 'bg-orange-500',
  'apps': 'bg-green-500',
  'how-to': 'bg-amber-500',
  'accessories': 'bg-pink-500',
  'news': 'bg-red-500',
  'ios': 'bg-blue-600',
  'macos': 'bg-purple-500',
  'ipados': 'bg-orange-600',
  'watchos': 'bg-red-600',
  'apple-watch': 'bg-red-500',
  'airpods': 'bg-indigo-500',
  // Tags
  'iphone-16': 'bg-blue-500',
  'ios-18': 'bg-blue-600',
  'macos-sequoia': 'bg-purple-600',
  'iphone-16-pro': 'bg-blue-700',
  'm4': 'bg-purple-500',
  'apple-intelligence': 'bg-gradient-to-r from-purple-500 to-pink-500',
};

// ============================================
// SITE CONFIGURATION
// ============================================

export const SITE_CONFIG: SiteConfig = {
  // ----------------------------------------
  // NAVIGATION
  // ----------------------------------------
  navigation: {
    // Categories shown in the main navigation
    categorySlugs: ['iphone', 'mac', 'ipad', 'how-to', 'apps', 'accessories', 'news'],
    
    // Popular items shown in dropdown for each category
    // You can use postIds for specific posts, or tagSlug for latest posts with that tag
    popularItems: {
      'iphone': {
        // Show latest 4 posts from iPhone category (auto-fetched)
        tagSlug: 'iphone-16',
        count: 4,
      },
      'mac': {
        tagSlug: 'macos-sequoia',
        count: 4,
      },
      'ipad': {
        tagSlug: 'ipados',
        count: 4,
      },
      'how-to': {
        // Latest how-to guides
        count: 4,
      },
      'apps': {
        count: 4,
      },
    },
  },

  // ----------------------------------------
  // TRENDING BAR
  // ----------------------------------------
  trending: {
    // Specific tags to show in trending bar
    // Find tag IDs in src/data/tags.json
    tagSlugs: ['iphone-16', 'ios-18', 'macos-sequoia', 'apple-watch', 'airpods', 'm4'],
    
    // Optional: Override colors for specific slugs
    colors: DEFAULT_TRENDING_COLORS,
  },

  // ----------------------------------------
  // FEATURED ARTICLES (Hero + Sidebar)
  // ----------------------------------------
  featured: {
    // Hero article: Use latest from 'news' category
    heroCategorySlug: 'news',
    
    // Sidebar articles: Latest 4 from 'iphone' category
    sidebarCategorySlug: 'iphone',
    sidebarCount: 4,
  },
};

// Export default colors for use in components
export { DEFAULT_TRENDING_COLORS };
