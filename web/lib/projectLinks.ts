import type { PlatformRef } from '@core/data/projects/types';
import { ALL_PROJECTS } from '@core/data/projects/registry';
import { STORE_PRODUCTS, STORE_CATEGORIES, productHref, categoryHref } from './store';
import { softwareById } from './softwareHub';
import { webHref, SECTION_ROUTES } from './webRoutes';

/**
 * The ONE place a project's cross-platform reference becomes a URL.
 *
 * WHY A SECOND RESOLVER BESIDE `webRoutes.ts`
 * -------------------------------------------
 * `webHref` resolves a `Destination` — a piece of CONTENT the platform knows.
 * Three of the things a project has to point at are not content: a product for
 * sale, a shop section, and a software-centre entry for a program this platform
 * deliberately does not document. Widening `Destination` to carry them would
 * push shop concepts into the shared core that the phone app also compiles.
 *
 * So this is an adapter over the adapter: content refs go straight through
 * `webHref` and inherit every existence check it already performs; the three
 * commercial and hub cases are answered here against their own registries. No
 * path is written by hand in either half — `productHref`, `categoryHref` and
 * `SECTION_ROUTES` are the same helpers the store's own pages use.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE
 * ------------------------------------
 * A reference either resolves to a page that EXISTS, or it renders as text with
 * a visible reason. There is no third outcome. That is checked twice: here, at
 * render time, against the live registries; and in `scripts/testProjects.ts`,
 * at build time, against every reference in the library at once.
 *
 * WHY UNPUBLISHED PRODUCTS ARE CHECKED AGAIN AT RENDER TIME
 * ---------------------------------------------------------
 * `/store/p/:id` calls `notFound()` for an unpublished product, and the admin
 * panel can unpublish one at any moment. A project written six months earlier
 * cannot know that happened. Passing the live published set turns that into a
 * part rendered without a link rather than a click into a 404.
 */

export interface RefContext {
  /**
   * Product ids currently visible in the shop.
   *
   * Optional so a non-async caller still gets a correct-at-build-time answer
   * from the seeds. A server component that has already awaited the catalogue
   * should pass it, because the seeds cannot know what the admin panel did.
   */
  publishedProductIds?: ReadonlySet<string>;
}

export interface ResolvedRef {
  /** The URL, or null when this reference must not be a link. */
  href: string | null;
  /** Which part of the platform this points at. Always set, link or no link. */
  sectionAr: string;
  /**
   * Why there is no link, in the reader's terms.
   *
   * Set for every `href: null` EXCEPT a dangling target — an id that names
   * nothing. That case gets neither a link nor a sentence, because there is
   * nothing truthful to say about it, and it is a build failure in the suite.
   */
  noteAr?: string;
  /** True for the phone-only case, which is an absence on THIS surface only. */
  phoneOnly?: boolean;
}

const SEED_PUBLISHED = new Set(STORE_PRODUCTS.filter(p => p.published).map(p => p.id));
const CATEGORY_IDS = new Set(STORE_CATEGORIES.map(c => c.id));
const PUBLISHED_PROJECT_IDS = new Set(ALL_PROJECTS.filter(p => p.published).map(p => p.id));

export function refHref(ref: PlatformRef, ctx: RefContext = {}): ResolvedRef {
  switch (ref.to) {
    /* ── Honest absences. Deliberately first: they can never become links. ── */
    case 'planned':
      return {
        href: null,
        sectionAr: ref.sectionAr,
        noteAr: `سيضاف لاحقاً في ${ref.sectionAr}`,
      };
    case 'elsewhere':
      return { href: null, sectionAr: 'خارج المنصة', noteAr: ref.whereAr };

    /* ── The encyclopedia and its neighbours, through the shared resolver. ── */
    case 'kb-article':
      return content(webHref({ kind: 'article', id: ref.id }), 'الموسوعة');
    case 'kb-module':
      return content(webHref({ kind: 'module', id: ref.id }), 'الموسوعة');
    case 'glossary':
      return content(webHref({ kind: 'glossary', id: ref.id }), 'الموسوعة');
    case 'dx':
      return content(webHref({ kind: 'dx', id: ref.id }), 'التشخيص');
    case 'lesson':
      // Resolves to `{ href: null, unavailableReasonAr }` — the lessons are a
      // phone flow. That is an absence on this surface, not a missing page, and
      // `content` keeps the difference visible.
      return content(webHref({ kind: 'lesson', id: ref.id }), 'الدروس');

    /* ── The software centre. ─────────────────────────────────────────────── */
    case 'software': {
      const entry = softwareById(ref.id);
      if (!entry) return { href: null, sectionAr: 'مركز البرامج' };
      // A program with no coverage still has a page: the scope page, whose
      // entire subject is saying what exists and what does not. Linking there
      // is more useful than «سيضاف لاحقاً», because it names the alternative.
      if (!entry.destination) {
        return entry.scopeId
          ? { href: SECTION_ROUTES.scope(entry.scopeId), sectionAr: 'مركز البرامج' }
          : { href: null, sectionAr: 'مركز البرامج' };
      }
      return content(webHref(entry.destination), 'مركز البرامج');
    }

    /* ── The shop. ────────────────────────────────────────────────────────── */
    case 'store-product': {
      const live = ctx.publishedProductIds ?? SEED_PUBLISHED;
      if (!live.has(ref.id)) {
        // Known product, currently hidden. Distinguished from an unknown id so
        // the reader is told the truth rather than shown a silent gap.
        return SEED_PUBLISHED.has(ref.id) || STORE_PRODUCTS.some(p => p.id === ref.id)
          ? { href: null, sectionAr: 'المتجر', noteAr: 'غير معروض في المتجر حالياً' }
          : { href: null, sectionAr: 'المتجر' };
      }
      return { href: productHref(ref.id), sectionAr: 'المتجر' };
    }
    case 'store-category':
      return CATEGORY_IDS.has(ref.id)
        ? { href: categoryHref(ref.id), sectionAr: 'المتجر' }
        : { href: null, sectionAr: 'المتجر' };

    /* ── Another project in this library. ─────────────────────────────────── */
    case 'project':
      return PUBLISHED_PROJECT_IDS.has(ref.id)
        ? { href: `/projects/${encodeURIComponent(ref.id)}`, sectionAr: 'المشاريع' }
        : { href: null, sectionAr: 'المشاريع' };

    default: {
      // Exhaustiveness: adding a case to `PlatformRef` without handling it here
      // is a compile error rather than a silently unlinked reference.
      const never: never = ref;
      void never;
      return { href: null, sectionAr: '' };
    }
  }
}

/** A content destination's three outcomes, mapped onto ours. */
function content(
  r: { href: string | null; unavailableReasonAr?: string },
  sectionAr: string,
): ResolvedRef {
  if (r.href) return { href: r.href, sectionAr };
  if (r.unavailableReasonAr) {
    return { href: null, sectionAr, noteAr: r.unavailableReasonAr, phoneOnly: true };
  }
  return { href: null, sectionAr };
}

/**
 * Whether a reference points at something that no longer exists.
 *
 * Used by the suite rather than by a page. A page renders the item and drops
 * the link; the build should refuse to ship the library at all.
 */
export function refIsDangling(ref: PlatformRef, ctx: RefContext = {}): boolean {
  const r = refHref(ref, ctx);
  return r.href === null && !r.noteAr;
}
