/**
 * `retrieve(query, options)` — the platform's one way of finding things.
 *
 * WHAT IT DOES, IN ORDER
 * ----------------------
 *   1. reads the query's intent from how it was asked
 *   2. asks the ONE search engine to rank the ONE index
 *   3. turns each hit into a structured result with a real destination
 *   4. adds the reader's own build as a SEPARATE group, when supplied
 *   5. keeps community content in a THIRD group, never merged
 *   6. reports what a judgement would still need before it could be made
 *
 * WHAT IT REFUSES TO DO
 * ---------------------
 * Compose. It has no sentence of its own to say. Every string on every result
 * comes out of `src/data/`, and the only text this module authors is the label
 * on a match reason. That is the line between a librarian and an author, and it
 * is the line the assistant will inherit when it is built on top of this.
 *
 * WHY THE THREE GROUPS ARE THREE FIELDS AND NOT ONE SORTED LIST
 * -------------------------------------------------------------
 * Because merging them would make the separation a rendering convention, and a
 * rendering convention is one refactor away from a forum post being quoted as
 * an engineering answer. Making them three fields means a caller has to decide,
 * explicitly and visibly in its own code, to treat member opinion as knowledge.
 * None of them does.
 */

import { search, type SearchHit, type MatchReason } from '../../data/kb/search/query';
import { getSearchIndex, type SearchDoc, type SearchDocType } from '../../data/kb/search/buildIndex';
import { normalizeText, tokenize, contentTokens, fuzzyEquals } from '../../data/kb/search/normalize';
import { detectIntents } from './intent';
import type { Destination } from '../destinations';
import type {
  RetrievalOptions, RetrievalResponse, RetrievalResult, ProjectContextInput, Provenance,
} from './types';

export * from './types';
export { detectIntents, isBareAbbreviation } from './intent';

/**
 * A doc's destination, derived from its type and id.
 *
 * The index stores a `route` string because it predates the resolver being
 * usable from it; this maps back to the IDENTITY, so every result opens through
 * `resolveDestination` on whichever surface is asking. A type with no mapping
 * returns null and the result renders as unopenable rather than as a guess.
 */
export function destinationFor(doc: SearchDoc): Destination | null {
  const [, ...rest] = doc.key.split(':');
  const id = rest.join(':');
  switch (doc.type) {
    case 'article': return { kind: 'article', id };
    case 'module': return { kind: 'module', id };
    case 'path': return doc.system ? { kind: 'module', id: doc.system } : null;
    case 'term': return { kind: 'glossary', id };
    case 'dx': return { kind: 'dx', id };
    // A node's address is its tree: the diagnostic flow is stateful and entering
    // it halfway would skip the checks that make the later ones safe.
    case 'dx-node': return { kind: 'dx', id: id.split('.')[0] };
    case 'lesson': return { kind: 'lesson', id };
    case 'bf-page': return { kind: 'betaflight', id };
    case 'bf-field': return { kind: 'betaflight', id: id.split('.')[0] };
    case 'elrs-step': return { kind: 'elrs-setup', id };
    case 'elrs-issue': return { kind: 'elrs-issue', id };
    case 'edgetx-topic': return { kind: 'edgetx', id };
    case 'edgetx-setting': return { kind: 'edgetx', id: id.split('.')[0] };
    case 'video-tool': return { kind: 'video', id };
    case 'roadmap': return { kind: 'roadmap', id };
    case 'assembly-stage': return { kind: 'assembly' };
    case 'checklist': return { kind: 'checklist' };
    case 'part': return { kind: 'assembly' };
    // A build archetype is chosen inside the build flow, so that is where it
    // opens. On a surface without that flow it renders as unavailable with a
    // reason, which is the same treatment every part gets.
    case 'drone-type': return { kind: 'assembly' };
    // The scope pages are web-only by design — they answer a gap, which is not
    // content the phone has a page for. The caller renders `route` for these.
    case 'software-scope': return null;
    case 'troubleshooting': return null;
    default: return null;
  }
}

/**
 * The scope pages' one exception, kept explicit.
 *
 * They have no `Destination` because they exist only on the web (a page whose
 * whole subject is «غير مغطّى» has no phone counterpart, and a destination kind
 * for it would resolve to null there — a dead link). So the result carries the
 * index's own route for them, and only for them.
 *
 * The legacy troubleshooting list is deliberately NOT here. Its route exists on
 * the phone and nowhere else, and treating it as a web route made six results
 * link to a page this surface has never had. It resolves to no destination, and
 * the surface decides how to say so.
 */
export const ROUTE_ONLY_TYPES = new Set<SearchDocType>(['software-scope']);

/**
 * Types whose index route points INSIDE the page its destination names.
 *
 * A `Destination` is a piece of content, and one row on a screen of fourteen is
 * not one — so the model has no way to express it, correctly. What the index
 * does have is `/programming/edgetx/outputs?topic=subtrim`, and dropping it made
 * a search for «Subtrim» land on the screen and leave the reader to find their
 * own row, which is exactly what indexing settings separately exists to prevent.
 *
 * The surface uses the route only when it agrees with the resolved destination,
 * so this can never smuggle in a path the adapter would have refused.
 */
export const ANCHORED_TYPES = new Set<SearchDocType>(['edgetx-setting']);

function matchedTermsOf(reasons: MatchReason[]): string[] {
  const out = new Set<string>();
  for (const r of reasons) for (const t of r.terms) out.add(t);
  return [...out];
}

function toResult(hit: SearchHit): RetrievalResult & { route?: string } {
  const d = hit.doc;
  return {
    id: d.key,
    type: d.type,
    titleAr: d.titleAr,
    titleEn: d.titleEn,
    summaryAr: d.subtitle,
    destination: destinationFor(d),
    // Three cases carry the index's own path alongside the destination:
    //
    //   route-only types      no `Destination` exists for them at all
    //   troubleshooting       its route belongs to the phone, and the surface
    //                         says so rather than linking into nothing
    //   anchored types        the destination names the PAGE and the route adds
    //                         the position inside it — `?topic=subtrim` is the
    //                         difference between landing on the right screen and
    //                         landing on the right ROW of fourteen, which is the
    //                         whole reason settings are indexed separately
    ...(ROUTE_ONLY_TYPES.has(d.type) || d.type === 'troubleshooting' || ANCHORED_TYPES.has(d.type)
      ? { route: d.route }
      : {}),
    provenance: 'official' as Provenance,
    contentClass: d.contentClass,
    level: d.level,
    score: hit.score,
    reasons: hit.reasons,
    matchedTerms: matchedTermsOf(hit.reasons),
    reviewedAt: d.reviewedAt,
    version: d.version,
    system: d.system,
    software: d.software,
    parts: d.parts,
    intents: d.intents,
    actions: d.actions,
    requiresBeforeVerdict: d.requiresBeforeVerdict,
    safetyPrerequisitesAr: d.safetyPrerequisitesAr,
  };
}

/**
 * Which indexed docs relate to the reader's own build.
 *
 * Returns KEYS only. The ranker receives a set of strings and never learns what
 * a project is — which is what lets the same ranker run on a public server with
 * no project at all, and what keeps a reader's build out of any code path that
 * could serialise it.
 *
 * The relationship is asserted by the verdict engine's own links, never guessed:
 * a finding appears against a page because that finding's author said so.
 */
function projectBoostKeys(project: ProjectContextInput): Set<string> {
  const keys = new Set<string>();
  if (!project.exists) return keys;

  for (const p of project.parts) keys.add(`part:${p.id}`);

  for (const f of project.findings) {
    for (const l of f.links) {
      switch (l.kind) {
        case 'article': keys.add(`article:${l.targetId}`); break;
        case 'betaflight': keys.add(`bf-page:${l.targetId}`); break;
        case 'dx': keys.add(`dx:${l.targetId}`); break;
        case 'glossary': keys.add(`term:${l.targetId}`); break;
        case 'edgetx': keys.add(`edgetx-topic:${l.targetId}`); break;
        case 'video': keys.add(`video-tool:${l.targetId}`); break;
        case 'elrs-setup': keys.add(`elrs-step:${l.targetId}`); break;
        case 'elrs-issue': keys.add(`elrs-issue:${l.targetId}`); break;
        default: break;
      }
    }
  }
  return keys;
}

/**
 * Results drawn from the reader's own project.
 *
 * These are NOT knowledge. They are facts about one aircraft, and they are
 * returned in their own group, marked `user-project`, so no caller can render
 * them as documentation or feed them to something that would.
 *
 * Matching is deliberately simple — the reader's own record is small, and a
 * fuzzy search over five recorded values would produce noise, not recall.
 */
function projectResults(
  project: ProjectContextInput,
  content: string[],
  queryNorm: string,
): RetrievalResult[] {
  if (!project.exists || content.length === 0) return [];
  const out: RetrievalResult[] = [];

  const hitsQuery = (text: string): string[] => {
    const toks = new Set(tokenize(text));
    return content.filter(t => toks.has(t) || [...toks].some(x => fuzzyEquals(t, x)));
  };

  // Recorded facts: «UART» should surface the reader's own UART, labelled as
  // theirs, beside the article that explains what one is.
  for (const fact of project.facts) {
    const terms = hitsQuery(`${fact.labelAr} ${fact.valueAr} ${fact.field}`);
    if (terms.length === 0) continue;
    out.push({
      id: `project-fact:${fact.field}`,
      type: 'project-part',
      titleAr: `${fact.labelAr}: ${fact.valueAr}`,
      summaryAr: 'قيمة سجّلتها أنت في مشروعك',
      destination: { kind: 'project', view: 'rc' },
      provenance: 'user-project',
      score: 100 + terms.length * 10,
      reasons: [{ kind: 'title', terms }],
      matchedTerms: terms,
    });
  }

  for (const part of project.parts) {
    const terms = hitsQuery(`${part.nameAr} ${part.labelAr}`);
    if (terms.length === 0) continue;
    out.push({
      id: `project-part:${part.category}`,
      type: 'project-part',
      titleAr: `${part.labelAr}: ${part.nameAr}`,
      summaryAr: 'قطعة في مشروعك',
      destination: { kind: 'project' },
      provenance: 'user-project',
      score: 90 + terms.length * 10,
      reasons: [{ kind: 'title', terms }],
      matchedTerms: terms,
    });
  }

  for (const f of project.findings) {
    const terms = hitsQuery(`${f.claimAr} ${f.missingAr.join(' ')}`);
    // A blocker is worth surfacing on a related query even on a weak match: it
    // is the thing standing between the reader and a flying aircraft.
    if (terms.length === 0 && !(f.severity === 'blocker' && queryNorm.length > 2)) continue;
    if (terms.length === 0) continue;
    out.push({
      id: `project-finding:${f.id}`,
      type: 'project-finding',
      titleAr: f.claimAr,
      summaryAr: f.missingAr.length > 0 ? `ينقص: ${f.missingAr.join('، ')}` : undefined,
      destination: { kind: 'project', view: 'findings' },
      provenance: 'user-project',
      score: (f.severity === 'blocker' ? 140 : f.severity === 'warning' ? 120 : 100) + terms.length * 10,
      reasons: [{ kind: 'title', terms }],
      matchedTerms: terms,
      confidence: f.confidence,
      requiresBeforeVerdict: f.missingAr,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

/**
 * A spelling suggestion, offered only when the query found little.
 *
 * Never applied silently: «هل تقصد» is a question, and a search box that
 * quietly answers a different question than the one asked is worse than one
 * that finds nothing. Drawn from real title tokens in the index, so it can only
 * ever suggest a word the platform actually contains.
 */
function suggestSpelling(content: string[], resultCount: number): string | undefined {
  if (resultCount >= 3 || content.length === 0) return undefined;

  const titles = new Set<string>();
  for (const doc of getSearchIndex()) for (const t of doc.titleTokens) if (t.length > 3) titles.add(t);

  const fixed: string[] = [];
  let changed = false;
  for (const t of content) {
    if (titles.has(t)) { fixed.push(t); continue; }
    const near = [...titles].find(c => fuzzyEquals(t, c));
    if (near) { fixed.push(near); changed = true; } else fixed.push(t);
  }
  return changed ? fixed.join(' ') : undefined;
}

const DEFAULT_LIMIT = 30;

export function retrieve(rawQuery: string, options: RetrievalOptions = {}): RetrievalResponse {
  const queryNorm = normalizeText(rawQuery);
  const original = tokenize(rawQuery);
  const content = contentTokens(original);
  const intents = detectIntents(rawQuery);

  const empty: RetrievalResponse = {
    query: rawQuery, queryNorm, intents,
    official: [], project: [], community: [],
    totalOfficial: 0, countsByType: {}, missingForVerdict: [],
  };
  if (!queryNorm) return empty;

  const boostKeys = options.project ? projectBoostKeys(options.project) : undefined;

  // The page the reader is on, as a preference between near-ties. A person
  // reading the video system who types «منفذ» means the video port more often
  // than not; a person reading anything else means whatever they typed.
  const filters = {
    ...(options.filters?.contentClass ? { contentClass: options.filters.contentClass } : {}),
    ...(options.filters?.system ? { system: options.filters.system } : {}),
    ...(options.filters?.software ? { software: options.filters.software } : {}),
    ...(options.filters?.level ? { level: options.filters.level } : {}),
    ...(options.filters?.types
      ? { types: options.filters.types.filter((t): t is SearchDocType =>
          !t.startsWith('project-') && t !== 'community-post') }
      : {}),
  };

  let hits = search(rawQuery, { filters, intents, boostKeys });

  // Page context, applied after ranking so it can only reorder, never exclude.
  if (options.page?.system || options.page?.software) {
    hits = hits.map(h => ({
      ...h,
      score: h.score
        + (options.page?.system && h.doc.system === options.page.system ? 18 : 0)
        + (options.page?.software && h.doc.software === options.page.software ? 18 : 0),
    })).sort((a, b) => b.score - a.score);
  }

  const countsByType: Record<string, number> = {};
  for (const h of hits) countsByType[h.doc.type] = (countsByType[h.doc.type] ?? 0) + 1;

  const offset = options.offset ?? 0;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const official = hits.slice(offset, offset + limit).map(toResult);

  const project = options.project ? projectResults(options.project, content, queryNorm) : [];

  // What a judgement would still need. Taken from the entries' own declarations,
  // deduped, and capped — a list of twenty unknowns is not an answer either.
  const missing = new Set<string>();
  for (const r of official.slice(0, 5)) for (const m of r.requiresBeforeVerdict ?? []) missing.add(m);
  for (const r of project) for (const m of r.requiresBeforeVerdict ?? []) missing.add(m);

  return {
    query: rawQuery,
    queryNorm,
    intents,
    official,
    project,
    // Community arrives through its own async channel — this layer is
    // synchronous and content-only, and reaching into a database from here
    // would make it unusable in every place that has no database.
    community: [],
    totalOfficial: hits.length,
    countsByType,
    missingForVerdict: [...missing].slice(0, 6),
    didYouMean: suggestSpelling(content, hits.length),
  };
}
