import {
  resolveDestination, type Destination, type DestinationChecks,
} from '@core/platform/destinations';
import { getArticle, getModule } from '@core/data/kb/registry';
import { getDxTree } from '@core/data/kb/diagnostics/trees';
import { kbTerms } from '@core/data/kb/glossary/terms';
import { bfPageRegistry } from '@core/data/betaflight/pageRegistry';
import { allEdgeTxPages } from '@core/data/edgetx/registry';
import { allVideoToolPages } from '@core/data/video/software/registry';

/**
 * The ONE place a destination becomes a web URL.
 *
 * WHY THIS FILE IS SO SMALL
 * -------------------------
 * Because the hard part was already done. `resolveDestination` in the shared
 * platform layer already turns an abstract destination into a path — and those
 * paths (`/kb/:moduleId/:articleId`, `/diagnose/:treeId`, `/betaflight/:id`)
 * are shaped for a URL bar, not for a phone-specific navigator. So the web does
 * not need its own routing table; it needs to reuse that one and answer a
 * single extra question the phone never has to ask:
 *
 *   "is this destination actually implemented on the web YET?"
 *
 * That question matters because the web ships before every phone corner has a
 * counterpart. A link to a build-flow stage must not render as a live link that
 * 404s — it must render as visibly unavailable, with the phone app named as
 * where it lives. Silence would be worse than absence.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE
 * ------------------------------------
 * No component anywhere in `web/` may write a content path by hand. Not
 * `/kb/${id}`, not `href="/diagnose/..."`. Everything goes through `webHref`,
 * so that moving a route is one line here rather than a search across dozens of
 * components — and so `scripts/testWebCore.ts` can prove there is no second
 * routing table hiding in a component.
 */

/**
 * Existence checks bound to the SHARED registries.
 *
 * This is what stops the web from linking to content it does not have: a
 * destination naming an article that no longer exists resolves to null here for
 * exactly the same reason, and by exactly the same lookup, as it does in the
 * phone app.
 */
const WEB_CHECKS: DestinationChecks = {
  articleExists: id => !!getArticle(id),
  moduleExists: id => !!getModule(id),
  moduleIdOfArticle: id => getArticle(id)?.moduleId,
  dxExists: id => !!getDxTree(id),
  glossaryExists: id => kbTerms.some(t => t.id === id),

  /*
   * These three MUST mirror the `generateStaticParams` of the routes they
   * describe, which all filter on «does this registry entry actually have a
   * page». A registry entry with no content is named on its index as
   * undocumented and given no URL — so resolving a destination to that URL
   * produces a link that 404s.
   *
   * That is not hypothetical: `/betaflight/blackbox` shipped as a live link
   * from an encyclopedia article, because the resolver built the path from the
   * id without ever asking whether the page existed.
   */
  betaflightPageExists: id => bfPageRegistry.some(p => p.id === id && !!p.page),
  edgeTxPageExists: id => allEdgeTxPages.some(p => p.id === id),
  videoPageExists: id => allVideoToolPages.some(p => p.id === id),
};

/**
 * Destination kinds the web does not implement yet, and where they do live.
 *
 * Declared as data rather than scattered through `if` statements so the set is
 * auditable in one glance and a test can assert it shrinks over time rather
 * than quietly growing.
 */
export const PHONE_ONLY_KINDS: Partial<Record<Destination['kind'], string>> = {
  // The build flow is a long stateful wizard whose value is in being in your
  // hand at the bench, and per-stage completion is tracked there. What the web
  // now has is the project workspace those flows feed, including the full
  // roadmap and checklist CONTENT under /project — so these messages point at
  // it rather than simply refusing.
  //
  // They stay listed because the DEEP LINK is what is unavailable: a link to
  // one specific stage or checklist group has no web address, and sending
  // someone to a page that does not scroll to what they asked for is worse
  // than telling them where it is.
  // Found by the search end-to-end run: sixteen lessons are in the shared
  // index, and every one of them rendered as a live link to `/lessons/:id`,
  // which this surface has never had. They 404'd — silently, because nobody
  // clicks a lesson result while testing a Betaflight page. Declaring the kind
  // here turns the dead link into a visible «متاح في التطبيق».
  lesson: 'الدروس المصوّرة والتفاعلية متاحة في تطبيق الهاتف',
  assembly: 'تدفّق البناء خطوة بخطوة متاح في تطبيق الهاتف',
  roadmap: 'مراحل البناء معروضة كاملة في صفحة «مشروعي» — وتتبّع إنجازها في التطبيق',
  checklist: 'قوائم الفحص معروضة كاملة في صفحة «مشروعي» — وتتبّع إنجازها في التطبيق',
};

/**
 * Routes that exist on the PHONE and have no destination kind of their own.
 *
 * One entry, and it earns its place: the legacy troubleshooting list is indexed
 * for search and carries `/troubleshooting` as its route — a phone screen. Six
 * results linked to it from this surface and every one of them 404'd. It has no
 * `Destination` kind to declare in `PHONE_ONLY_KINDS`, so the route itself is
 * declared instead, and `searchView.resultHref` turns it into a visible
 * «متاح في التطبيق» rather than a dead click.
 */
export const PHONE_ONLY_ROUTES: Record<string, string> = {
  '/troubleshooting': 'قائمة الأعطال القديمة متاحة في تطبيق الهاتف — وأشجار التشخيص هنا تغطّي الأحدث منها',
};

export interface WebHref {
  /** The URL, or null when this destination has no web page. */
  href: string | null;
  /** Set when the destination is real but lives only in the phone app. */
  unavailableReasonAr?: string;
  /** True for links that leave the platform. */
  external?: boolean;
}

/**
 * Resolve a destination for the web.
 *
 * Returns a `WebHref` rather than a bare string so the caller can tell the
 * three cases apart — live link, deliberately-unavailable, and broken — and
 * render each honestly. A component that receives `href: null` with no reason
 * has found a dangling target and should render nothing rather than a dead
 * anchor.
 */
export function webHref(d: Destination): WebHref {
  const phoneOnly = PHONE_ONLY_KINDS[d.kind];
  if (phoneOnly) return { href: null, unavailableReasonAr: phoneOnly };

  if (d.kind === 'external') {
    return { href: isSafeExternalUrl(d.url) ? d.url : null, external: true };
  }

  return { href: resolveDestination(d, WEB_CHECKS) };
}

/** Convenience for the common case: a live href or null. */
export function href(d: Destination): string | null {
  return webHref(d).href;
}

/**
 * Section indexes, which the destination resolver deliberately does not model.
 *
 * A `Destination` names a piece of CONTENT — an article, a Betaflight page, one
 * ExpressLRS issue. The doors in front of those (the software hub, the
 * ExpressLRS front page) are navigation, not content: nothing links to them as
 * an answer, no finding points at them, and the bot returning «افتح قسم
 * البرامج» instead of the actual page would be the failure the resolver's
 * optional-id comment already warns about.
 *
 * The scope pages are here for a different reason: a page whose entire subject
 * is «هذا البرنامج غير مغطّى بعد» has no counterpart on the phone, so a
 * destination kind for it would resolve to null there — a dead link, which is
 * precisely what the resolver exists to prevent.
 *
 * They live in the adapter rather than in a component for the ordinary reason:
 * a path interpolated inside a component is how a second routing table starts,
 * and `scripts/testWebCore.ts` fails the build when one appears.
 */
export const SECTION_ROUTES = {
  /** The software centre's index. */
  programming: '/programming',
  /** The ExpressLRS front page, in front of the setup and troubleshooting flows. */
  expresslrs: '/programming/expresslrs',
  /**
   * The build section — the interactive path from part selection to first
   * flight. A navigation door rather than a piece of content, like the
   * software hub: nothing resolves TO it as an answer, so it has no
   * `Destination` kind.
   */
  build: '/build',
  /**
   * The RETIRED community index. The section was removed from the web
   * experience (the route now redirects to `/build` — see next.config.ts),
   * but the dormant community module still references this constant, and a
   * path constant that lies about where a module points would be worse than
   * one that names a redirect.
   */
  community: '/community',
  /** The search page, so a "search for this" link is never hand-written. */
  search: '/search',
  /**
   * The store.
   *
   * A commercial section rather than content, so it has no `Destination` kind:
   * the resolver models what the platform KNOWS, and a product for sale is not
   * that. It lives on the web only — the phone app has no storefront.
   */
  store: '/store',
  /**
   * The honest-scope page for a program this platform does not document.
   * Never linked for a program that HAS pages — those resolve as destinations.
   */
  scope: (topicId: string): string => `/programming/scope/${encodeURIComponent(topicId)}`,
} as const;

/**
 * Whether an outbound URL is safe to render as a link.
 *
 * Blocks `javascript:`, `data:` and `vbscript:` — the three schemes that turn
 * an anchor into script execution. Content in this repository is authored, so
 * this is defence in depth rather than the primary control; it matters because
 * community posts will eventually carry user-supplied URLs through the same
 * renderer, and the check must already be in the path when they do.
 */
export function isSafeExternalUrl(url: string): boolean {
  const trimmed = url.trim();
  // Reject control characters outright: they are used to smuggle a scheme past
  // naive prefix checks (e.g. "java\tscript:").
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed, 'https://fpv-arabic.invalid');
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
