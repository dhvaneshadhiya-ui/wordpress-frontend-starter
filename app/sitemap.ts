import { MetadataRoute } from 'next';
import { fetchPosts, fetchCategories, fetchTags, fetchAuthors } from '@/lib/wordpress';

const SITE_URL = process.env.SITE_URL || 'https://dev.igeeksblog.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Homepage
  entries.push({
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 1,
  });

  try {
    // Fetch all posts (paginated)
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 50) { // Limit to 50 pages (1000 posts) for build performance
      const { posts, totalPages } = await fetchPosts({ page, perPage: 20 });
      
      for (const post of posts) {
        entries.push({
          url: `${SITE_URL}/${post.slug}`,
          lastModified: new Date(post.modified),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
      
      hasMore = page < totalPages;
      page++;
    }

    // Fetch categories
    const categories = await fetchCategories({ perPage: 100 });
    for (const category of categories) {
      entries.push({
        url: `${SITE_URL}/category/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }

    // Fetch tags (top 100)
    const tags = await fetchTags({ perPage: 100 });
    for (const tag of tags) {
      entries.push({
        url: `${SITE_URL}/tag/${tag.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }

    // Fetch authors
    const authors = await fetchAuthors({ perPage: 100 });
    for (const author of authors) {
      entries.push({
        url: `${SITE_URL}/author/${author.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  return entries;
}
