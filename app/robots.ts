import { MetadataRoute } from 'next';

const SITE_URL = process.env.SITE_URL || 'https://dev.igeeksblog.com';

export default function robots(): MetadataRoute.Robots {
  // For staging/dev environment, disallow all crawlers
  // Change this for production
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
