/**
 * The retrieval contract.
 *
 * WHAT THIS LAYER IS
 * ------------------
 * One function — `retrieve(query, context)` — that every surface asks when a
 * person is looking for something. The search page asks it. The article page
 * will ask it for "related". The project page will ask it for "what should I
 * read about this finding". And the assistant, when it is built, will ask it
 * instead of building a knowledge base of its own.
 *
 * That last one is the reason this exists now rather than later. An assistant
 * bolted on afterwards always brings its own index, its own chunking and its
 * own idea of what a destination is — and from that day the platform has two
 * answers to every question and no way to keep them in agreement. Defining the
 * contract before the assistant exists is what makes that impossible.
 *
 * WHAT THIS LAYER IS NOT
 * ----------------------
 * It is not a second index. It ranks what `src/data/kb/search` already holds,
 * and it holds no content of its own — `scripts/testRetrieval.ts` fails if a
 * string of prose appears in this directory.
 *
 * It is not an answering layer. It finds, orders, explains WHY it found, and
 * names what it still does not know. It never composes a technical statement,
 * never infers a compatibility verdict, and never writes a sentence that is not
 * already in `src/data/`. A librarian, not an author.
 *
 * WHY IT RETURNS THIS MUCH STRUCTURE
 * ----------------------------------
 * Because a result has to survive being read by something that cannot see the
 * screen. A row of title-plus-snippet is enough for a human scanning a list and
 * useless to anything that has to decide what to do next: is this reviewed
 * knowledge or someone's opinion? how old is it? which firmware? what does the
 * reader have to tell me before I am allowed to judge? Those are fields, and
 * they are on every result whether the current UI renders them or not.
 */

import type { Destination } from '../destinations';
import type { SearchDocType, SearchContentClass } from '../../data/kb/search/buildIndex';
import type { MatchReason } from '../../data/kb/search/query';
import type { KbLink, KbLevel } from '../../data/kb/types';

/**
 * Where a result came from, and therefore how much it may be trusted.
 *
 * This is the field that keeps a forum post from ever being presented as an
 * engineering answer. It is not a display detail — it decides which group a
 * result is rendered in, whether it may carry a review date, and whether a
 * future assistant is allowed to draw on it at all.
 */
export type Provenance =
  /** Written and reviewed in this platform, with sources and a review date. */
  | 'official'
  /** Written by a member. Never a technical verdict, always visibly separate. */
  | 'community'
  /** The reader's own recorded build. Private, never in server-rendered HTML. */
  | 'user-project';

export const PROVENANCE_LABEL_AR: Record<Provenance, string> = {
  official: 'محتوى موثّق',
  community: 'من المجتمع',
  'user-project': 'من مشروعك',
};

/**
 * What the reader appears to be trying to do.
 *
 * Reuses the intent vocabulary already carried in every entry's `bot` block
 * rather than inventing a parallel one — the whole point is that an entry
 * declaring `intents: ['diagnose']` can be matched against a query recognised
 * as a diagnosis request, with no translation table in between.
 */
export type QueryIntent =
  | 'diagnose'
  | 'navigate'
  | 'explain'
  | 'compare'
  | 'build'
  | 'configure'
  | 'coverage';

export const INTENT_LABEL_AR: Record<QueryIntent, string> = {
  diagnose: 'يبدو أنك تصف عطلاً',
  navigate: 'يبدو أنك تبحث عن مكان إعداد',
  explain: 'يبدو أنك تسأل عن معنى',
  compare: 'يبدو أنك تقارن بين خيارين',
  build: 'يبدو أنك تخطّط لبناء',
  configure: 'يبدو أنك تريد تغيير إعداد',
  coverage: 'يبدو أنك تسأل هل نغطّي شيئاً',
};

/** One thing the retrieval layer found. */
export interface RetrievalResult {
  /** Globally unique and stable: `${type}:${sourceId}`. */
  id: string;
  type: SearchDocType | 'project-part' | 'project-finding' | 'community-post';
  titleAr: string;
  /** The official English name, where the thing has one. Never a translation. */
  titleEn?: string;
  /** One line of context — what this is, or where it sits. */
  summaryAr?: string;

  /**
   * Where it opens, as an IDENTITY rather than a URL.
   *
   * Every result resolves through the one destination table, which is what
   * makes a result openable on the phone and on the web without either surface
   * learning the other's routes — and what makes a dangling target a test
   * failure instead of a reader's dead click.
   */
  destination: Destination | null;

  provenance: Provenance;
  contentClass?: SearchContentClass;
  level?: KbLevel;

  /** Internal ordering weight. Never rendered alone — see `reasons`. */
  score: number;
  /**
   * Why this is here, in terms a person can act on.
   *
   * The requirement was explicit: no bare number. A reader who cannot tell why
   * a result appeared cannot tell whether to trust the ones below it.
   */
  reasons: MatchReason[];
  /** The query words that actually matched, deduped across reasons. */
  matchedTerms: string[];

  /** When the statement was last checked against its source. */
  reviewedAt?: string;
  /** Firmware/app version this is tied to, where it is version-specific. */
  version?: string;
  /** Owning system, e.g. 'rc-link'. */
  system?: string;
  /** Software this concerns, e.g. 'betaflight'. */
  software?: string;
  /** Part categories this concerns, e.g. 'receivers'. */
  parts?: string[];

  /** Intents this entry declares it can serve. */
  intents?: string[];
  /** Things a reader can DO from here, as abstract destinations. */
  actions?: KbLink[];
  /**
   * Facts that must be known before any judgement about this topic.
   *
   * The field that makes «أحتاج طراز لوحتك أولاً» a designed behaviour rather
   * than a hoped-for one. Carried on the result so the caller can ask BEFORE
   * offering an answer, not after.
   */
  requiresBeforeVerdict?: string[];
  /** Safety preconditions that must be stated before any step is suggested. */
  safetyPrerequisitesAr?: string[];

  /**
   * How sure we are, and only where the notion applies.
   *
   * Absent on ordinary content: an article is not "70% confident", it is
   * written. Present on project-derived results, where it comes from the
   * verdict engine's own `confidence` — never computed here.
   */
  confidence?: 'typed-spec' | 'derived' | 'manual-required';
}

/** The page the reader is on, so retrieval can prefer what is near them. */
export interface PageContext {
  /** The destination of the current page, when it has one. */
  here?: Destination;
  /** The system the current page belongs to, e.g. 'video'. */
  system?: string;
  /** The software the current page is about, e.g. 'edgetx'. */
  software?: string;
}

/**
 * The reader's own build, when they have one and consent to it being used.
 *
 * Typed as the shared `ProjectSnapshot` rather than a copy, and passed IN
 * rather than read here: this module must run in Node with no storage, and a
 * retrieval layer that reached for localStorage on its own would be unusable
 * from a server, a test, or a future assistant.
 */
export interface RetrievalOptions {
  page?: PageContext;
  /** Set only when the caller has the reader's project AND permission to use it. */
  project?: ProjectContextInput;
  filters?: {
    types?: RetrievalResult['type'][];
    contentClass?: SearchContentClass;
    system?: string;
    software?: string;
    level?: KbLevel;
    provenance?: Provenance;
  };
  limit?: number;
  /** Offset into the ranked list, for pagination. */
  offset?: number;
}

/**
 * The project, reduced to what retrieval needs.
 *
 * Deliberately not the whole snapshot: retrieval needs to know WHICH parts and
 * findings exist so it can surface and boost them, and nothing else. Narrowing
 * it here means a caller cannot accidentally hand the whole record to a layer
 * that has no business holding it.
 */
export interface ProjectContextInput {
  exists: boolean;
  parts: { category: string; labelAr: string; id: string; nameAr: string }[];
  findings: {
    id: string;
    severity: 'blocker' | 'warning' | 'unknown' | 'ok';
    confidence: 'typed-spec' | 'derived' | 'manual-required';
    claimAr: string;
    missingAr: string[];
    links: KbLink[];
  }[];
  /** Recorded facts as label/value pairs — e.g. «منفذ المستقبل» / «UART 2». */
  facts: { field: string; labelAr: string; valueAr: string }[];
}

/** What `retrieve` gives back. */
export interface RetrievalResponse {
  /** The query as typed. */
  query: string;
  /** Its normalised form — what actually matched. */
  queryNorm: string;
  /** Intents recognised in the query, most confident first. */
  intents: QueryIntent[];
  /**
   * Reviewed platform knowledge. The default group, and the only one a
   * technical answer may ever be drawn from.
   */
  official: RetrievalResult[];
  /**
   * The reader's own build. Never server-rendered, never indexed, never mixed
   * into `official` — a fact about one person's aircraft is not knowledge.
   */
  project: RetrievalResult[];
  /**
   * Member-written content, delivered through a separate channel and marked
   * untrusted. Empty unless the caller explicitly asked for it and supplied it.
   */
  community: RetrievalResult[];
  /** Total official matches before `limit`, so the UI can paginate honestly. */
  totalOfficial: number;
  /** Counts by type across all official matches, for filter chips. */
  countsByType: Record<string, number>;
  /**
   * What the reader would have to say for a judgement to be possible.
   *
   * Collected from the top results' own `requiresBeforeVerdict`. Retrieval does
   * not judge — but it can say what a judgement would need, which is what stops
   * the next layer from guessing.
   */
  missingForVerdict: string[];
  /**
   * Spelling suggestion, when the query matched nothing exactly but is one edit
   * from something real. Never applied silently.
   */
  didYouMean?: string;
}
