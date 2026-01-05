/**
 * Local data service - provides static taxonomy data for navigation
 * Posts are always fetched from API for real-time content
 */

import categoriesData from '@/data/categories.json';
import tagsData from '@/data/tags.json';
import authorsData from '@/data/authors.json';

// Types
interface Category {
  id: number;
  name: string;
  slug: string;
  count?: number;
  description?: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

interface Author {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
}

// Typed data
const categories: Category[] = categoriesData as Category[];
const tags: Tag[] = tagsData as Tag[];
const authors: Author[] = authorsData as Author[];

// Category functions
export function getLocalCategories(): Category[] {
  return categories;
}

export function getLocalCategoryBySlug(slug: string): Category | null {
  return categories.find(c => c.slug === slug) || null;
}

export function getLocalCategoryById(id: number): Category | null {
  return categories.find(c => c.id === id) || null;
}

// Tag functions
export function getLocalTags(): Tag[] {
  return tags;
}

export function getLocalTagBySlug(slug: string): Tag | null {
  return tags.find(t => t.slug === slug) || null;
}

export function getLocalTagById(id: number): Tag | null {
  return tags.find(t => t.id === id) || null;
}

// Author functions
export function getLocalAuthors(): Author[] {
  return authors;
}

export function getLocalAuthorBySlug(slug: string): Author | null {
  return authors.find(a => a.slug === slug) || null;
}

export function getLocalAuthorById(id: number): Author | null {
  return authors.find(a => a.id === id) || null;
}
