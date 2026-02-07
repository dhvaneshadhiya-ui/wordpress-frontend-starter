
# Plan: Dynamic Content Configuration for Navigation, Trending, and Featured Articles

## Overview
Create a centralized configuration system that allows you to control the navigation categories, trending topics, and featured articles using WordPress post IDs, category IDs, and tag IDs. All hardcoded mock data will be replaced with real WordPress content.

---

## Architecture Design

```text
+------------------------+     +---------------------------+
|  src/data/site-config.ts|     |  WordPress Data           |
|  - navCategoryIds      |---->|  - categories.json        |
|  - trendingTagIds      |     |  - tags.json              |
|  - featuredPostIds     |     |  - posts (API/chunks)     |
+------------------------+     +---------------------------+
           |
           v
+------------------------+
|  src/hooks/            |
|  useSiteConfig.ts      |  <-- New hook to load config data
+------------------------+
           |
           +------+------+------+
           |      |      |      |
           v      v      v      v
     Navigation  Trending  Featured  Other
     Component   Bar       Articles  Pages
```

---

## Changes by Component

### 1. Create Central Configuration File
**New file: `src/data/site-config.ts`**

This file will be the single source of truth for all dynamic content:

```typescript
export const SITE_CONFIG = {
  // Navigation categories - specify category slugs to show in header
  navigation: {
    categories: ['iphone', 'mac', 'ipad', 'how-to', 'apps', 'accessories', 'news'],
    // Popular items per category (optional featured posts/tags)
    popularItems: {
      'iphone': {
        postIds: [12345, 12346, 12347, 12348], // Specific post IDs to feature
        // OR use tag slugs:
        tagSlugs: ['iphone-16', 'ios-18', 'tips-tricks', 'troubleshooting']
      },
      'mac': {
        postIds: [12350, 12351, 12352, 12353]
      }
      // ... etc
    }
  },
  
  // Trending bar - uses tags or specific posts
  trending: {
    // Option A: Use popular tags (by count or specific IDs)
    tagIds: [1467, 1215, 1034], // Specific tag IDs
    // OR
    tagSlugs: ['ios-18', 'macos-sequoia', 'iphone-16', 'apple-watch'],
    // Option B: Use category-based trending
    categoryIds: [1052, 1215], // Show trending from these categories
    // Color mapping by category/tag slug
    colors: {
      'iphone': 'bg-blue-500',
      'mac': 'bg-purple-600',
      'ipad': 'bg-orange-500',
      'apps': 'bg-green-500'
    }
  },
  
  // Featured articles section
  featured: {
    // Hero article - specific post ID
    heroPostId: 12345,
    // OR use latest from category
    heroCategorySlug: 'news',
    
    // Sidebar articles - specific post IDs
    sidebarPostIds: [12346, 12347, 12348, 12349],
    // OR use latest from tag/category
    sidebarTagSlug: 'featured',
    sidebarCount: 4
  }
};
```

### 2. Create Data Hook
**New file: `src/hooks/useSiteConfig.ts`**

Hook that loads and resolves configuration to actual data:

- `useNavigationData()` - Returns categories with their popular posts
- `useTrendingData()` - Returns trending tags/topics with colors
- `useFeaturedPosts()` - Returns hero + sidebar posts

### 3. Update DexertoNavigation
**File: `src/components/DexertoNavigation.tsx`**

- Import `useNavigationData()` hook
- Replace static `NAV_ITEMS` with dynamic data
- Popular items will show actual post thumbnails from WordPress
- Links will use proper `/category/{slug}` or `/{post-slug}` routes

### 4. Update DexertoTrendingBar
**File: `src/components/DexertoTrendingBar.tsx`**

- Import `useTrendingData()` hook
- Replace static `TRENDING_TOPICS` with dynamic tags
- Links point to `/tag/{slug}` routes
- Colors assigned from config or auto-generated

### 5. Update DexertoTrendingArticles
**File: `src/components/DexertoTrendingArticles.tsx`**

- Import `useFeaturedPosts()` hook
- Replace mock `HERO_ARTICLE` and `TRENDING_ARTICLES` with real posts
- Use `getFeaturedImageUrl()`, `getAuthor()`, `getCategories()` helpers
- Links point to actual post slugs

---

## Technical Details

### How Category/Tag/Post IDs Work

| Type | Where to Find IDs | API Filter |
|------|------------------|------------|
| Categories | `src/data/categories.json` - look for `"id": 1034` | `fetchPosts({ categories: [1034] })` |
| Tags | `src/data/tags.json` - look for `"id": 1467` | `fetchPosts({ tags: [1467] })` |
| Posts | Post URLs or chunks - look for `"id": 12345` | `fetchPosts({ slug: "post-slug" })` |

### Example: Finding IDs
- **iPhone category** has `id: 1052` (from categories.json)
- **iOS 18 tag** has `id: 1523` (from tags.json)  
- **Specific post** has `id: 45678` (from post chunk or URL)

### Configuration Options

**Navigation Popular Items - 3 approaches:**
1. `postIds: [1, 2, 3, 4]` - Specific posts (most control)
2. `tagSlug: 'featured-iphone'` - Latest posts with this tag (automatic)
3. `categorySlug: 'iphone'` - Latest 4 from category (automatic)

**Trending Bar - 2 approaches:**
1. `tagIds: [1, 2, 3, 4, 5]` - Specific tags to show
2. `autoPopular: true` - Auto-select tags with highest post count

**Featured Section - 2 approaches:**
1. `heroPostId: 12345` - Specific post always shown
2. `heroCategorySlug: 'news'` - Latest post from category

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/data/site-config.ts` | Create | Central configuration with IDs |
| `src/hooks/useSiteConfig.ts` | Create | Hooks to resolve config to data |
| `src/components/DexertoNavigation.tsx` | Modify | Use dynamic navigation data |
| `src/components/DexertoTrendingBar.tsx` | Modify | Use dynamic trending tags |
| `src/components/DexertoTrendingArticles.tsx` | Modify | Use real WordPress posts |
| `src/data/nav-items.ts` | Delete/Deprecate | Replaced by site-config |

---

## Usage After Implementation

To change featured content, edit `src/data/site-config.ts`:

```typescript
// Change hero article
featured: {
  heroPostId: 54321, // New post ID
}

// Add trending topic
trending: {
  tagIds: [1467, 1215, 1034, 9999], // Added new tag ID
}

// Modify navigation popular items
navigation: {
  popularItems: {
    'iphone': {
      postIds: [11111, 22222, 33333, 44444] // New featured posts
    }
  }
}
```

---

## Benefits

1. **Single source of truth** - All dynamic content controlled from one file
2. **No code changes needed** - Just update IDs in config file
3. **Flexible options** - Use specific IDs or automatic "latest from category/tag"
4. **Type-safe** - TypeScript interfaces for all configuration
5. **Cached data** - Uses existing React Query caching for performance
