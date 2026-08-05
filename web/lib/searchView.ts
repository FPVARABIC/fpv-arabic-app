import { SEARCH_TYPE_LABEL_AR } from '@core/data/kb/search/buildIndex';
import type { MatchReason, MatchReasonKind } from '@core/data/kb/search/query';
import type { RetrievalResult } from '@core/platform/retrieval';
import { webHref, SECTION_ROUTES, PHONE_ONLY_ROUTES } from './webRoutes';

/**
 * Turning a retrieval result into something a person reads.
 *
 * Presentation only — no ranking, no matching, no content. It exists as a
 * module rather than inside the page component for one reason: `retrieve()` is
 * meant to be called from several places (the search page, a command palette,
 * later an article's "related" strip), and each of them needs the same label
 * for the same match reason. A second copy of «طابق عرَض عطل» is a second
 * vocabulary, and readers notice.
 */

/** Every result type's badge, including the three retrieval-only kinds. */
export const RESULT_TYPE_LABEL_AR: Record<string, string> = {
  ...SEARCH_TYPE_LABEL_AR,
  'project-part': 'من مشروعك',
  'project-finding': 'حكم في مشروعك',
  'community-post': 'منشور مجتمع',
};

/**
 * Why a result is here, in words.
 *
 * The requirement was explicit: never a bare number. Each of these says
 * something a reader can check for themselves against what they typed, which
 * is what makes the ordering below it trustworthy rather than mysterious.
 */
const REASON_LABEL_AR: Record<MatchReasonKind, string> = {
  'title-phrase': 'طابق الاسم كاملاً',
  title: 'طابق العنوان',
  symptom: 'طابق عرَضاً موصوفاً',
  abbreviation: 'طابق اختصاراً',
  keyword: 'طابق كلمة مفتاحية',
  synonym: 'طابق مرادفاً',
  body: 'ورد في النص',
  prefix: 'بداية كلمة',
  typo: 'تصحيح إملائي',
  intent: 'يناسب ما تحاول فعله',
};

/**
 * The one or two reasons worth showing.
 *
 * Rendering all of them turns every card into a wall of chips and stops anyone
 * reading any of them. Ordered by how much they justify the result's position:
 * a symptom match explains a surprising ordering, «ورد في النص» explains
 * nothing anybody was wondering about.
 */
const REASON_PRIORITY: MatchReasonKind[] = [
  'symptom', 'abbreviation', 'title-phrase', 'title', 'typo',
  'intent', 'synonym', 'keyword', 'prefix', 'body',
];

export interface ReasonChip {
  kind: MatchReasonKind;
  labelAr: string;
  /** The matched words, when naming them adds something. */
  terms: string[];
}

export function topReasons(reasons: MatchReason[], max = 2): ReasonChip[] {
  return [...reasons]
    .sort((a, b) => REASON_PRIORITY.indexOf(a.kind) - REASON_PRIORITY.indexOf(b.kind))
    .slice(0, max)
    .map(r => ({
      kind: r.kind,
      labelAr: REASON_LABEL_AR[r.kind],
      // Naming the words only helps where the reader might not see the link —
      // a synonym, a typo correction, a symptom phrase.
      terms: (['symptom', 'synonym', 'typo', 'abbreviation'] as MatchReasonKind[]).includes(r.kind)
        ? r.terms.slice(0, 3)
        : [],
    }));
}

/**
 * A result's URL.
 *
 * Everything goes through the destination adapter. The two exceptions carry
 * their own route because they have no `Destination`: the scope pages, which
 * exist only on this surface, and community posts, which are database rows
 * rather than content. Both are named here rather than hidden in a component.
 */
export function resultHref(
  r: RetrievalResult & { route?: string; postId?: string },
): { href: string | null; unavailableReasonAr?: string } {
  if (r.type === 'community-post' && r.postId) {
    return { href: `${SECTION_ROUTES.community}/posts/${encodeURIComponent(r.postId)}` };
  }
  if (r.destination) {
    const web = webHref(r.destination);
    // A route that is the resolved page PLUS something more — `?topic=subtrim`,
    // a fragment — is more precise, so it wins. The prefix check is what makes
    // that safe: a route that does not agree with the adapter's own answer is
    // ignored rather than trusted, so this can never introduce a path the
    // adapter would have refused.
    if (web.href && r.route && r.route.startsWith(web.href) && r.route.length > web.href.length) {
      return { href: r.route };
    }
    return { href: web.href, unavailableReasonAr: web.unavailableReasonAr };
  }
  if (r.route) {
    const phoneOnly = PHONE_ONLY_ROUTES[r.route];
    return phoneOnly ? { href: null, unavailableReasonAr: phoneOnly } : { href: r.route };
  }
  return { href: null };
}

/* ── Grouping ─────────────────────────────────────────────────────────────── */

/**
 * The six shelves a result can land on.
 *
 * WHY GROUPS AND NOT ONE RANKED LIST
 * ----------------------------------
 * One list is honest about relevance and useless for deciding. A search for
 * «ExpressLRS» legitimately matches an article, a setup step, a diagnosis, four
 * receivers and a project — and interleaved by score they read as one
 * undifferentiated wall in which the reader cannot tell an engineering
 * reference from something we would like to sell them.
 *
 * Grouping also carries a claim the platform has to make anyway: a member's
 * post and a reviewed article are not the same kind of statement. That is
 * already in `Provenance`; this puts it on the screen.
 *
 * THE ORDER IS THE PLATFORM'S PRIORITIES, NOT ALPHABETICAL
 * --------------------------------------------------------
 * Knowledge first — somebody who does not know what to buy needs to understand
 * before they choose. Diagnosis second, because a person describing a fault
 * needs it now. The shop is fourth: it earns its place by being useful, not by
 * being first.
 */
export type ResultGroupId =
  | 'knowledge' | 'diagnostics' | 'software' | 'projects' | 'store' | 'pages';

export interface ResultGroup {
  id: ResultGroupId;
  titleAr: string;
  /** One line saying what KIND of thing is on this shelf. */
  blurbAr: string;
}

export const RESULT_GROUPS: ResultGroup[] = [
  {
    id: 'knowledge', titleAr: 'المعرفة',
    blurbAr: 'مقالات ومصطلحات ودروس — مكتوبة ومراجَعة، بمصادر وتواريخ مراجعة.',
  },
  {
    id: 'diagnostics', titleAr: 'التشخيص',
    blurbAr: 'أشجار تقودك من العرَض إلى السبب خطوةً خطوة.',
  },
  {
    id: 'software', titleAr: 'البرامج',
    blurbAr: 'صفحات الإعداد داخل Betaflight وExpressLRS وEdgeTX وأدوات الفيديو.',
  },
  {
    id: 'projects', titleAr: 'المشاريع',
    blurbAr: 'مشاريع كاملة وأقسامها — تفتح عند القسم المطابق لا عند أعلى الصفحة.',
  },
  {
    id: 'store', titleAr: 'المتجر',
    blurbAr: 'منتجات وخيارات وخدمات معروضة للبيع.',
  },
  {
    id: 'pages', titleAr: 'صفحات المنصّة',
    blurbAr: 'مداخل الأقسام والصفحات الثابتة.',
  },
];

/**
 * Which shelf a result type belongs on.
 *
 * A map rather than a chain of `if`s so the set is auditable in one glance and
 * `scripts/testSearchSources.ts` can assert that EVERY type has a shelf — an
 * unmapped type would silently vanish from a grouped view, which is worse than
 * an ugly one.
 */
export const GROUP_OF_TYPE: Record<string, ResultGroupId> = {
  article: 'knowledge',
  module: 'knowledge',
  path: 'knowledge',
  term: 'knowledge',
  lesson: 'knowledge',
  part: 'knowledge',
  'drone-type': 'knowledge',
  'assembly-stage': 'knowledge',
  roadmap: 'knowledge',
  checklist: 'knowledge',

  dx: 'diagnostics',
  'dx-node': 'diagnostics',
  troubleshooting: 'diagnostics',
  'elrs-issue': 'diagnostics',

  'bf-page': 'software',
  'bf-field': 'software',
  'elrs-step': 'software',
  'edgetx-topic': 'software',
  'edgetx-setting': 'software',
  'video-tool': 'software',
  'software-scope': 'software',

  project: 'projects',
  'project-section': 'projects',

  product: 'store',
  'product-variant': 'store',
  service: 'store',

  page: 'pages',
};

export function groupOf(type: string): ResultGroupId {
  // An unknown type lands on «صفحات المنصّة» rather than disappearing. The
  // suite fails the build when one exists, so this is a floor, not a plan.
  return GROUP_OF_TYPE[type] ?? 'pages';
}
