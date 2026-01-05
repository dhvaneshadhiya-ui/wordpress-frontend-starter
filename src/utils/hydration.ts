/**
 * Hydration utilities for SSG (Static Site Generation)
 * 
 * These utilities allow React to hydrate on top of pre-rendered HTML,
 * using data that was embedded in the page at build time.
 */

import type { WPPost, WPCategory, WPTag, WPAuthor } from '@/lib/wordpress';

export interface InitialPostData {
  type: 'post';
  data: {
    id: number;
    slug: string;
    title: { rendered: string };
    excerpt: { rendered: string };
    content: { rendered: string };
    date: string;
    modified: string;
    featuredImage?: string;
    author?: {
      id: number;
      name: string;
      slug: string;
      avatar?: string;
    };
    categories: Array<{ id: number; name: string; slug: string }>;
    tags: Array<{ id: number; name: string; slug: string }>;
    seo: {
      title: string;
      description: string;
      ogTitle: string;
      ogDescription: string;
      ogImage?: string;
      twitterTitle: string;
      twitterDescription: string;
      twitterImage?: string;
      canonical: string;
      publishedTime: string;
      modifiedTime: string;
      author: string;
      image?: string;
    };
  };
}

export interface InitialCategoryData {
  type: 'category';
  data: {
    category: {
      id: number;
      name: string;
      slug: string;
      description?: string;
      count?: number;
      seo?: {
        title: string;
        description: string;
      };
    };
    posts: InitialPostData['data'][];
  };
}

export interface InitialTagData {
  type: 'tag';
  data: {
    tag: {
      id: number;
      name: string;
      slug: string;
      count?: number;
    };
    posts: InitialPostData['data'][];
  };
}

export interface InitialAuthorData {
  type: 'author';
  data: {
    author: {
      id: number;
      name: string;
      slug: string;
      description?: string;
      avatar?: string;
    };
    posts: InitialPostData['data'][];
  };
}

export interface InitialHomeData {
  type: 'home';
  data: {
    posts: InitialPostData['data'][];
  };
}

export type InitialData = 
  | InitialPostData 
  | InitialCategoryData 
  | InitialTagData 
  | InitialAuthorData 
  | InitialHomeData;

declare global {
  interface Window {
    __INITIAL_DATA__?: InitialData;
  }
}

/**
 * Get initial data that was pre-rendered at build time.
 * Returns null if no initial data is available (client-side navigation).
 */
export function getInitialData(): InitialData | null {
  if (typeof window !== 'undefined' && window.__INITIAL_DATA__) {
    return window.__INITIAL_DATA__;
  }
  return null;
}

/**
 * Get initial post data if available
 */
export function getInitialPostData(slug: string): InitialPostData['data'] | null {
  const data = getInitialData();
  if (data?.type === 'post' && data.data.slug === slug) {
    return data.data;
  }
  return null;
}

/**
 * Get initial category data if available
 */
export function getInitialCategoryData(slug: string): InitialCategoryData['data'] | null {
  const data = getInitialData();
  if (data?.type === 'category' && data.data.category.slug === slug) {
    return data.data;
  }
  return null;
}

/**
 * Get initial tag data if available
 */
export function getInitialTagData(slug: string): InitialTagData['data'] | null {
  const data = getInitialData();
  if (data?.type === 'tag' && data.data.tag.slug === slug) {
    return data.data;
  }
  return null;
}

/**
 * Get initial author data if available
 */
export function getInitialAuthorData(slug: string): InitialAuthorData['data'] | null {
  const data = getInitialData();
  if (data?.type === 'author' && data.data.author.slug === slug) {
    return data.data;
  }
  return null;
}

/**
 * Get initial home page data if available
 */
export function getInitialHomeData(): InitialHomeData['data'] | null {
  const data = getInitialData();
  if (data?.type === 'home') {
    return data.data;
  }
  return null;
}

/**
 * Clear initial data after hydration is complete.
 * Call this after React has mounted to prevent stale data issues.
 */
export function clearInitialData(): void {
  if (typeof window !== 'undefined') {
    delete window.__INITIAL_DATA__;
  }
}

/**
 * Check if the page was pre-rendered (SSG) or is being rendered client-side
 */
export function isPreRendered(): boolean {
  return getInitialData() !== null;
}

// ============= Data Transformers =============

/**
 * Transform SSG post data to WPPost format for React Query
 */
export function transformToWPPost(data: InitialPostData['data']): WPPost {
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    content: data.content,
    date: data.date,
    modified: data.modified,
    featured_media: 0,
    categories: data.categories.map(c => c.id),
    tags: data.tags.map(t => t.id),
    author: data.author?.id || 0,
    _embedded: {
      'wp:featuredmedia': data.featuredImage ? [{
        source_url: data.featuredImage,
        alt_text: data.title.rendered.replace(/<[^>]*>/g, ''),
        media_details: {
          sizes: {
            full: { source_url: data.featuredImage },
            large: { source_url: data.featuredImage },
            medium: { source_url: data.featuredImage },
          }
        }
      }] : undefined,
      author: data.author ? [{
        id: data.author.id,
        name: data.author.name,
        slug: data.author.slug,
        avatar_urls: data.author.avatar ? { '48': data.author.avatar, '96': data.author.avatar } : undefined,
      }] : undefined,
      'wp:term': [
        data.categories.map(c => ({ id: c.id, name: c.name, slug: c.slug, taxonomy: 'category' })),
        data.tags.map(t => ({ id: t.id, name: t.name, slug: t.slug, taxonomy: 'post_tag' })),
      ],
    },
  };
}

/**
 * Transform SSG category data to WPCategory format
 */
export function transformToWPCategory(data: InitialCategoryData['data']['category']): WPCategory {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    count: data.count || 0,
    description: data.description,
  };
}

/**
 * Transform SSG tag data to WPTag format
 */
export function transformToWPTag(data: InitialTagData['data']['tag']): WPTag {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    count: data.count || 0,
  };
}

/**
 * Transform SSG author data to WPAuthor format
 */
export function transformToWPAuthor(data: InitialAuthorData['data']['author']): WPAuthor {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    avatar_urls: data.avatar ? { '48': data.avatar, '96': data.avatar } : undefined,
  };
}

/**
 * Transform array of SSG posts to WPPost array
 */
export function transformPostsArray(posts: InitialPostData['data'][]): WPPost[] {
  return posts.map(transformToWPPost);
}
