/**
 * Site Configuration Hooks
 * 
 * Resolves SITE_CONFIG IDs/slugs into actual WordPress data using React Query.
 * These hooks provide ready-to-use data for Navigation, Trending Bar, and Featured sections.
 */

import { useQuery } from '@tanstack/react-query';
import { SITE_CONFIG, DEFAULT_TRENDING_COLORS } from '@/data/site-config';
import { 
  fetchPosts, 
  WPPost, 
  WPCategory, 
  WPTag,
  getFeaturedImageUrl,
  getAuthor,
  getCategories,
  getReadingTime,
  stripHtml,
} from '@/lib/wordpress';
import { 
  getLocalCategories, 
  getLocalCategoryBySlug,
  getLocalTags,
  getLocalTagBySlug,
} from '@/lib/local-data';
import { formatDistanceToNow } from 'date-fns';

// ============================================
// TYPES
// ============================================

export interface NavigationItem {
  title: string;
  href: string;
  popular: Array<{
    name: string;
    href: string;
    image: string;
  }>;
  more: string[];
  viewAllLabel: string;
}

export interface TrendingTopic {
  name: string;
  slug: string;
  href: string;
  color: string;
  count?: number;
}

export interface FeaturedArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  categorySlug: string;
  author: string;
  authorSlug: string;
  timestamp: string;
  readTime: string;
  href: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function postToFeaturedArticle(post: WPPost): FeaturedArticle {
  const author = getAuthor(post);
  const categories = getCategories(post);
  const primaryCategory = categories[0] || { name: 'Uncategorized', slug: 'uncategorized' };
  
  return {
    id: post.id,
    slug: post.slug,
    title: stripHtml(post.title.rendered),
    excerpt: stripHtml(post.excerpt.rendered).slice(0, 150) + '...',
    image: getFeaturedImageUrl(post, 'large'),
    category: primaryCategory.name,
    categorySlug: primaryCategory.slug,
    author: author.name,
    authorSlug: author.slug,
    timestamp: formatDistanceToNow(new Date(post.date), { addSuffix: true }),
    readTime: `${getReadingTime(post.content.rendered)} min read`,
    href: `/${post.slug}`,
  };
}

function getColorForSlug(slug: string, customColors?: Record<string, string>): string {
  // Check custom colors first, then defaults
  const colors = { ...DEFAULT_TRENDING_COLORS, ...customColors };
  return colors[slug] || 'bg-primary';
}

// ============================================
// NAVIGATION HOOK
// ============================================

export function useNavigationData() {
  const { navigation } = SITE_CONFIG;
  const localCategories = getLocalCategories();
  
  // Build navigation items from config
  const navItems: NavigationItem[] = navigation.categorySlugs.map(slug => {
    const category = localCategories.find(c => c.slug === slug);
    const config = navigation.popularItems[slug];
    
    return {
      title: category?.name || slug.charAt(0).toUpperCase() + slug.slice(1).replace('-', ' '),
      href: `/category/${slug}`,
      popular: [], // Will be populated by useNavigationPopularPosts
      more: [], // Can be extended with subcategories
      viewAllLabel: `View All ${category?.name || slug}`,
    };
  });

  return { data: navItems, isLoading: false };
}

/**
 * Fetches popular posts for a specific navigation category
 * Call this for each category that needs popular items in the dropdown
 */
export function useNavigationPopularPosts(categorySlug: string) {
  const { navigation } = SITE_CONFIG;
  const config = navigation.popularItems[categorySlug];
  const category = getLocalCategoryBySlug(categorySlug);
  
  return useQuery({
    queryKey: ['nav-popular', categorySlug],
    queryFn: async () => {
      if (!category) return [];
      
      // If tagSlug is specified, fetch posts with that tag
      if (config?.tagSlug) {
        const tag = getLocalTagBySlug(config.tagSlug);
        if (tag) {
          const { posts } = await fetchPosts({ 
            tags: [tag.id], 
            perPage: config.count || 4 
          });
          return posts.map(post => ({
            name: stripHtml(post.title.rendered),
            href: `/${post.slug}`,
            image: getFeaturedImageUrl(post, 'medium'),
          }));
        }
      }
      
      // If postIds are specified, fetch those specific posts
      if (config?.postIds?.length) {
        // WordPress doesn't have a direct "fetch by IDs" endpoint,
        // so we fetch by category and filter (or make multiple requests)
        const { posts } = await fetchPosts({ 
          categories: [category.id], 
          perPage: 20 
        });
        const filteredPosts = posts.filter(p => config.postIds!.includes(p.id));
        return filteredPosts.slice(0, config.count || 4).map(post => ({
          name: stripHtml(post.title.rendered),
          href: `/${post.slug}`,
          image: getFeaturedImageUrl(post, 'medium'),
        }));
      }
      
      // Default: fetch latest posts from category
      const { posts } = await fetchPosts({ 
        categories: [category.id], 
        perPage: config?.count || 4 
      });
      return posts.map(post => ({
        name: stripHtml(post.title.rendered),
        href: `/${post.slug}`,
        image: getFeaturedImageUrl(post, 'medium'),
      }));
    },
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// TRENDING BAR HOOK
// ============================================

export function useTrendingData() {
  const { trending } = SITE_CONFIG;
  const localTags = getLocalTags();
  
  return useQuery({
    queryKey: ['trending-topics'],
    queryFn: async () => {
      const topics: TrendingTopic[] = [];
      
      // Use tagSlugs if specified
      if (trending.tagSlugs?.length) {
        for (const slug of trending.tagSlugs) {
          const tag = localTags.find(t => t.slug === slug);
          if (tag) {
            topics.push({
              name: tag.name,
              slug: tag.slug,
              href: `/tag/${tag.slug}`,
              color: getColorForSlug(tag.slug, trending.colors),
              count: tag.count,
            });
          }
        }
      }
      
      // Use tagIds if specified (and no slugs)
      if (!trending.tagSlugs?.length && trending.tagIds?.length) {
        for (const id of trending.tagIds) {
          const tag = localTags.find(t => t.id === id);
          if (tag) {
            topics.push({
              name: tag.name,
              slug: tag.slug,
              href: `/tag/${tag.slug}`,
              color: getColorForSlug(tag.slug, trending.colors),
              count: tag.count,
            });
          }
        }
      }
      
      return topics;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    initialData: () => {
      // Provide initial data from local tags
      const topics: TrendingTopic[] = [];
      
      if (trending.tagSlugs?.length) {
        for (const slug of trending.tagSlugs) {
          const tag = localTags.find(t => t.slug === slug);
          if (tag) {
            topics.push({
              name: tag.name,
              slug: tag.slug,
              href: `/tag/${tag.slug}`,
              color: getColorForSlug(tag.slug, trending.colors),
              count: tag.count,
            });
          }
        }
      }
      
      return topics.length > 0 ? topics : undefined;
    },
  });
}

// ============================================
// FEATURED ARTICLES HOOK
// ============================================

export function useFeaturedPosts() {
  const { featured } = SITE_CONFIG;
  
  return useQuery({
    queryKey: ['featured-posts', featured],
    queryFn: async () => {
      let heroPost: WPPost | null = null;
      let sidebarPosts: WPPost[] = [];
      
      // Fetch hero article
      if (featured.heroPostId) {
        // Specific post ID
        const { posts } = await fetchPosts({ perPage: 1 });
        // Filter by ID (WordPress REST API doesn't support direct ID lookup for multiple)
        const allPosts = await fetchPosts({ perPage: 20 });
        heroPost = allPosts.posts.find(p => p.id === featured.heroPostId) || allPosts.posts[0];
      } else if (featured.heroCategorySlug) {
        // Latest from category
        const category = getLocalCategoryBySlug(featured.heroCategorySlug);
        if (category) {
          const { posts } = await fetchPosts({ categories: [category.id], perPage: 1 });
          heroPost = posts[0];
        }
      }
      
      // If no hero yet, get latest post
      if (!heroPost) {
        const { posts } = await fetchPosts({ perPage: 1 });
        heroPost = posts[0];
      }
      
      // Fetch sidebar articles
      if (featured.sidebarPostIds?.length) {
        // Specific post IDs
        const { posts } = await fetchPosts({ perPage: 50 });
        sidebarPosts = posts.filter(p => featured.sidebarPostIds!.includes(p.id))
          .slice(0, featured.sidebarCount || 4);
      } else if (featured.sidebarCategorySlug) {
        // Latest from category
        const category = getLocalCategoryBySlug(featured.sidebarCategorySlug);
        if (category) {
          const { posts } = await fetchPosts({ 
            categories: [category.id], 
            perPage: (featured.sidebarCount || 4) + 1 // +1 to account for potential hero duplicate
          });
          // Exclude hero post from sidebar
          sidebarPosts = posts
            .filter(p => p.id !== heroPost?.id)
            .slice(0, featured.sidebarCount || 4);
        }
      } else if (featured.sidebarTagSlug) {
        // Latest from tag
        const tag = getLocalTagBySlug(featured.sidebarTagSlug);
        if (tag) {
          const { posts } = await fetchPosts({ 
            tags: [tag.id], 
            perPage: (featured.sidebarCount || 4) + 1
          });
          sidebarPosts = posts
            .filter(p => p.id !== heroPost?.id)
            .slice(0, featured.sidebarCount || 4);
        }
      }
      
      // If still no sidebar, get latest posts
      if (sidebarPosts.length === 0) {
        const { posts } = await fetchPosts({ perPage: 5 });
        sidebarPosts = posts
          .filter(p => p.id !== heroPost?.id)
          .slice(0, featured.sidebarCount || 4);
      }
      
      return {
        hero: heroPost ? postToFeaturedArticle(heroPost) : null,
        sidebar: sidebarPosts.map(postToFeaturedArticle),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
