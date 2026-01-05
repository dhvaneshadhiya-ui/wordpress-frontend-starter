/**
 * Local data service - provides fallback data from pre-fetched JSON files
 * Data is loaded asynchronously to prevent blocking the main thread
 */

// Data storage - starts empty, populated by async load
let posts: any[] = [];
let categories: any[] = [];
let tags: any[] = [];
let authors: any[] = [];
let dataLoaded = false;
let loadingPromise: Promise<void> | null = null;

export interface LocalPostsParams {
  page?: number;
  perPage?: number;
  categoryId?: number;
  tagId?: number;
  authorId?: number;
  search?: string;
  exclude?: number[];
}

export interface LocalPostsResult {
  posts: any[];
  total: number;
  totalPages: number;
}

/**
 * Initialize local data asynchronously
 * Returns immediately if already loaded, otherwise loads data
 */
export async function initLocalData(): Promise<void> {
  if (dataLoaded) return;
  
  // If already loading, wait for that promise
  if (loadingPromise) return loadingPromise;
  
  loadingPromise = (async () => {
    try {
      // Dynamic imports - Vite will chunk these separately
      const [postsModule, categoriesModule, tagsModule, authorsModule] = await Promise.all([
        import('@/data/posts.json'),
        import('@/data/categories.json'),
        import('@/data/tags.json'),
        import('@/data/authors.json'),
      ]);
      
      posts = postsModule.default as any[];
      categories = categoriesModule.default as any[];
      tags = tagsModule.default as any[];
      authors = authorsModule.default as any[];
      dataLoaded = true;
    } catch (error) {
      console.warn('Failed to load local data:', error);
      // Keep empty arrays as fallback
      dataLoaded = true;
    }
  })();
  
  return loadingPromise;
}

// Start loading immediately on module load (non-blocking)
initLocalData();

/**
 * Get posts from local data with filtering and pagination
 */
export function getLocalPosts(params: LocalPostsParams = {}): LocalPostsResult {
  const {
    page = 1,
    perPage = 10,
    categoryId,
    tagId,
    authorId,
    search,
    exclude = [],
  } = params;

  // Return empty if not loaded yet
  if (!dataLoaded) {
    return { posts: [], total: 0, totalPages: 0 };
  }

  let filtered = [...posts];

  // Filter by category (handle both formats: array of IDs or array of objects)
  if (categoryId) {
    filtered = filtered.filter(post => {
      if (Array.isArray(post.categories)) {
        return post.categories.some((cat: any) => 
          typeof cat === 'number' ? cat === categoryId : cat.id === categoryId
        );
      }
      return false;
    });
  }

  // Filter by tag (handle both formats)
  if (tagId) {
    filtered = filtered.filter(post => {
      if (Array.isArray(post.tags)) {
        return post.tags.some((tag: any) => 
          typeof tag === 'number' ? tag === tagId : tag.id === tagId
        );
      }
      return false;
    });
  }

  // Filter by author (handle both formats)
  if (authorId) {
    filtered = filtered.filter(post => {
      if (typeof post.author === 'number') {
        return post.author === authorId;
      } else if (post.author && typeof post.author === 'object') {
        return post.author.id === authorId;
      }
      return false;
    });
  }

  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(post =>
      post.title?.rendered?.toLowerCase().includes(searchLower) ||
      post.excerpt?.rendered?.toLowerCase().includes(searchLower)
    );
  }

  // Exclude specific posts
  if (exclude.length > 0) {
    filtered = filtered.filter(post => !exclude.includes(post.id));
  }

  // Sort by date (newest first)
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Paginate
  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedPosts = filtered.slice(startIndex, startIndex + perPage);

  return {
    posts: paginatedPosts,
    total,
    totalPages,
  };
}

/**
 * Get a single post by slug from local data
 */
export function getLocalPostBySlug(slug: string): any | null {
  if (!dataLoaded) return null;
  return posts.find(post => post.slug === slug) || null;
}

/**
 * Get all categories from local data
 */
export function getLocalCategories(): any[] {
  return categories;
}

/**
 * Get a single category by slug from local data
 */
export function getLocalCategoryBySlug(slug: string): any | null {
  return categories.find(cat => cat.slug === slug) || null;
}

/**
 * Get category by ID
 */
export function getLocalCategoryById(id: number): any | null {
  return categories.find(cat => cat.id === id) || null;
}

/**
 * Get all tags from local data
 */
export function getLocalTags(): any[] {
  return tags;
}

/**
 * Get a single tag by slug from local data
 */
export function getLocalTagBySlug(slug: string): any | null {
  return tags.find(tag => tag.slug === slug) || null;
}

/**
 * Get tag by ID
 */
export function getLocalTagById(id: number): any | null {
  return tags.find(tag => tag.id === id) || null;
}

/**
 * Get all authors from local data
 */
export function getLocalAuthors(): any[] {
  return authors;
}

/**
 * Get a single author by slug from local data
 */
export function getLocalAuthorBySlug(slug: string): any | null {
  return authors.find(author => author.slug === slug) || null;
}

/**
 * Get author by ID
 */
export function getLocalAuthorById(id: number): any | null {
  return authors.find(author => author.id === id) || null;
}

/**
 * Check if local data is available (has posts)
 */
export function hasLocalData(): boolean {
  return dataLoaded && posts.length > 0;
}

/**
 * Check if local data has been loaded
 */
export function isLocalDataLoaded(): boolean {
  return dataLoaded;
}

/**
 * Get posts count
 */
export function getLocalPostsCount(): number {
  return posts.length;
}
