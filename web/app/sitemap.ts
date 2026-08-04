import type { MetadataRoute } from 'next';
import { siteOrigin, isCanonicalOrigin } from '@/lib/siteOrigin';
import { allKbModules, moduleArticles } from '@core/data/kb/registry';
import { STORE_CATEGORIES } from '@core/data/store/categories';
import { NAV_ITEMS } from '@/lib/siteNav';
import { href, SECTION_ROUTES } from '@/lib/webRoutes';

/**
 * The sitemap, generated from the same registries the pages are.
 *
 * WHY IT IS GENERATED AND NOT WRITTEN
 * -----------------------------------
 * A hand-written sitemap is a second list of what the site contains, and the
 * moment an article is added it is wrong — silently, in the one file whose
 * whole job is to be complete. Reading the registries means the sitemap cannot
 * disagree with the site.
 *
 * WHAT IS DELIBERATELY ABSENT
 * ---------------------------
 * Anything behind a session (`/profile`, `/admin`), anything user-generated
 * (`/community/posts/*` — those change constantly and are `noindex` on the
 * page itself), and the cart. A sitemap is an invitation to crawl; inviting a
 * crawler to a page that redirects to sign-in wastes its budget and ours.
 *
 * Store product pages are absent for a reason specific to this shop: nothing
 * is published yet. A sitemap listing sixty products that all say «قيد
 * التجهيز» teaches a search engine that this site is full of empty pages.
 * They join when they publish.
 *
 * EVERY PATH COMES FROM THE RESOLVER
 * ----------------------------------
 * Not one of them is interpolated here. A route written a second time is a
 * second routing table, and the copy that rots is always the one nobody looks
 * at — which a sitemap is. `href()` also returns null for a destination that
 * does not exist on the web, so a module removed from the registry silently
 * leaves the sitemap instead of becoming a 404 a crawler reports for months.
 * `scripts/testWebCore.ts` fails the build if a path is hand-built, and it
 * caught this file doing exactly that.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // A preview must never submit a sitemap: it would ask a search engine to
  // index a copy of the site under the wrong origin.
  if (!isCanonicalOrigin()) return [];

  const origin = siteOrigin();
  const now = new Date();
  const url = (p: string) => `${origin}${p}`;

  const entries: MetadataRoute.Sitemap = [
    { url: url('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
  ];

  // Every public section named in the site map, minus the ones that need an
  // account. `requiresAuth` is the same flag the header uses to decide what to
  // render, so the two cannot drift apart.
  for (const item of NAV_ITEMS) {
    if (item.requiresAuth || item.requiresRole || item.status === 'planned') continue;
    if (item.href === '/') continue;
    entries.push({
      url: url(item.href), lastModified: now, changeFrequency: 'weekly', priority: 0.8,
    });
  }

  // The encyclopedia — the reason most people will arrive from a search engine.
  for (const m of allKbModules) {
    const modulePath = href({ kind: 'module', id: m.id });
    if (modulePath) {
      entries.push({
        url: url(modulePath), lastModified: now, changeFrequency: 'monthly', priority: 0.7,
      });
    }
    for (const a of moduleArticles(m.id)) {
      const articlePath = href({ kind: 'article', id: a.id });
      if (articlePath) {
        entries.push({
          url: url(articlePath), lastModified: now,
          changeFrequency: 'monthly', priority: 0.6,
        });
      }
    }
  }

  // Store sections. Real editorial pages about what each size is for — they
  // stand up on their own before anything is priced. The section index is the
  // only store path the resolver models, so the category id is appended to it
  // rather than to a string typed here.
  for (const c of STORE_CATEGORIES) {
    entries.push({
      url: url(`${SECTION_ROUTES.store}/${encodeURIComponent(c.id)}`),
      lastModified: now, changeFrequency: 'weekly', priority: 0.5,
    });
  }

  return entries;
}
