import type { MetadataRoute } from 'next';
import { siteOrigin, isCanonicalOrigin } from '@/lib/siteOrigin';

/**
 * What a crawler may read.
 *
 * A preview deployment disallows everything. This is the single most important
 * line in the file: without it, every branch build competes with the official
 * site for the same content in search results, and the copy sometimes wins.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isCanonicalOrigin()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      // Not a security control — these are all enforced on the server. It is a
      // crawl-budget control: pointing a crawler at pages that redirect to
      // sign-in spends its allowance on nothing.
      disallow: ['/admin', '/api/', '/profile', '/settings', '/signin', '/store/cart'],
    }],
    sitemap: `${siteOrigin()}/sitemap.xml`,
    host: siteOrigin(),
  };
}
