/**
 * Pure unit tests for useFeed.ts's page-assembly logic (Phase 2, Sections
 * K/L/M) — the author/category-diversity greedy filter and the
 * guaranteed-newest-post-slot injection. No emulator, no Firestore, no
 * network: these are plain functions over in-memory PostWithId arrays,
 * exported specifically so they're testable in isolation from React
 * rendering and live queries.
 *
 * Run with: npx tsx scripts/testFeedDiversity.ts
 */
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import {
  assemblePageWithDiversity, applyNewestPostGuarantee, mergeCandidateStream, AUTHOR_DIVERSITY_CAP, CATEGORY_DIVERSITY_CAP,
} from '../src/components/Community/utils/feedDiversity';
import type { PostWithId, PostCategory } from '../src/components/Community/types';

let passCount = 0;
let failCount = 0;

function assertValue<T>(label: string, actual: T, expected: T) {
  try {
    assert.deepStrictEqual(actual, expected);
    console.log(`  PASS  ${label} (= ${JSON.stringify(actual)})`);
    passCount++;
  } catch {
    console.log(`  FAIL  ${label} — actual=${JSON.stringify(actual)}, expected=${JSON.stringify(expected)}`);
    failCount++;
  }
}

function makePost(id: string, authorId: string, category?: PostCategory): PostWithId {
  return {
    id,
    authorId,
    authorName: `author-${authorId}`,
    authorPhoto: null,
    text: `post ${id}`,
    ...(category ? { category } : {}),
    mediaType: 'none',
    mediaURL: null,
    thumbnailURL: null,
    mediaSize: null,
    mediaDuration: null,
    mediaPath: null,
    mediaWidth: null,
    mediaHeight: null,
    commentsCount: 0,
    likesCount: 0,
    createdAt: Timestamp.fromMillis(0),
    status: 'active',
    searchTokens: [],
    feedScore: 100,
  };
}

// Nine real category ids, cycled through where a test needs "some category,
// doesn't matter which" without accidentally tripping the CATEGORY cap
// while isolating AUTHOR-cap behavior specifically.
const SPREAD_CATEGORIES: PostCategory[] = [
  'questions', 'parts', 'projects', 'flights', 'betaflight', 'electronics', 'long-range', 'cinematic', 'freestyle',
];

console.log('\n=== 1. Section L — author-diversity greedy fill (category spread out so ONLY the author cap binds) ===');
{
  // A single author dominates the top of the stream with 6 posts; the cap
  // (2/page) must admit only the first 2 and defer the rest, backfilling
  // the page with other authors' posts. Categories are spread across all 9
  // ids so the category cap (4/page) never becomes the binding constraint
  // here — this test isolates author-diversity behavior specifically.
  const stream = [
    ...Array.from({ length: 6 }, (_, i) => makePost(`dominant-${i}`, 'authorX', SPREAD_CATEGORIES[i % SPREAD_CATEGORIES.length])),
    ...Array.from({ length: 8 }, (_, i) => makePost(`other-${i}`, `author-${i}`, SPREAD_CATEGORIES[(i + 6) % SPREAD_CATEGORIES.length])),
  ];
  const { displayed, deferred } = assemblePageWithDiversity(stream);
  const dominantInPage = displayed.filter(p => p.authorId === 'authorX').length;
  assertValue('L1 exactly AUTHOR_DIVERSITY_CAP (2) posts from the dominant author appear in the page', dominantInPage, AUTHOR_DIVERSITY_CAP);
  assertValue('L2 the page is still filled to a full 10 posts (backfilled from other authors)', displayed.length, 10);
  assertValue('L3 the 4 excess dominant-author posts are deferred, not discarded', deferred.filter(p => p.authorId === 'authorX').length, 4);
  assertValue('L4 deferred candidates are NEVER silently dropped — total in equals total out', displayed.length + deferred.length, stream.length);
}

console.log('\n=== 2. Section M — category-diversity greedy fill (authors spread out so ONLY the category cap binds) ===');
{
  // 3 categories represented (7 questions, 8 flights, 6 projects — 21
  // candidates), each post a distinct author, so the author cap never
  // binds; enough categories present that the page can still be
  // backfilled to a full 10 after the "questions" cap defers its excess.
  const stream = [
    ...Array.from({ length: 7 }, (_, i) => makePost(`q-${i}`, `author-q${i}`, 'questions')),
    ...Array.from({ length: 8 }, (_, i) => makePost(`f-${i}`, `author-f${i}`, 'flights')),
    ...Array.from({ length: 6 }, (_, i) => makePost(`p-${i}`, `author-p${i}`, 'projects')),
  ];
  const { displayed, deferred } = assemblePageWithDiversity(stream);
  const questionsInPage = displayed.filter(p => p.category === 'questions').length;
  assertValue('M1 exactly CATEGORY_DIVERSITY_CAP (4) posts from one category appear in the page', questionsInPage, CATEGORY_DIVERSITY_CAP);
  assertValue('M2 the page is still filled to a full 10 posts', displayed.length, 10);
  assertValue('M3 the 3 excess "questions" posts are deferred', deferred.filter(p => p.category === 'questions').length, 3);
}

console.log('\n=== 3. Uncategorized posts form their own diversity bucket ===');
{
  const stream = Array.from({ length: 8 }, (_, i) => makePost(`uncat-${i}`, `author-${i}`)); // no category at all
  const { displayed, deferred } = assemblePageWithDiversity(stream);
  assertValue('U1 uncategorized posts are still capped at CATEGORY_DIVERSITY_CAP (4) per page, same as any real category', displayed.length, CATEGORY_DIVERSITY_CAP);
  assertValue('U2 the other 4 uncategorized posts are deferred', deferred.length, 4);
}

console.log('\n=== 4. A healthy, non-adversarial stream is completely unaffected ===');
{
  // 3 categories spread across 10 posts (4+3+3, each <= CATEGORY_DIVERSITY_CAP)
  // and 10 distinct authors — neither cap should ever bind.
  const stream = Array.from({ length: 10 }, (_, i) => makePost(`healthy-${i}`, `author-${i}`, SPREAD_CATEGORIES[i % 3]));
  const { displayed, deferred } = assemblePageWithDiversity(stream);
  assertValue('H1 all 10 distinct-author, evenly-split-category posts pass through untouched', displayed.length, 10);
  assertValue('H2 nothing deferred when no cap is ever exceeded', deferred.length, 0);
  assertValue('H3 order is preserved exactly (score order in, same order out) when nothing is skipped', displayed.map(p => p.id), stream.map(p => p.id));
}

console.log('\n=== 5. Section K — guaranteed newest-post-slot injection ===');
{
  const displayed = Array.from({ length: 10 }, (_, i) => makePost(`p${i}`, `author-${i}`));
  const newest = makePost('newest-1', 'brand-new-author');

  const { displayed: withGuarantee, evicted } = applyNewestPostGuarantee(displayed, displayed, newest);
  assertValue('K1 the newest post is now present in the page', withGuarantee.some(p => p.id === 'newest-1'), true);
  assertValue('K2 the page size is unchanged (still exactly 10)', withGuarantee.length, 10);
  assertValue('K3 the lowest-score (last) item was evicted to make room', evicted?.id, 'p9');
  assertValue('K4 the newest post is inserted near-top, not buried at the very end', withGuarantee.indexOf(withGuarantee.find(p => p.id === 'newest-1')!) <= 5, true);
}
{
  // Already present -> no-op, no eviction.
  const displayed = Array.from({ length: 10 }, (_, i) => makePost(`p${i}`, `author-${i}`));
  const alreadyThere = displayed[3];
  const { displayed: result, evicted } = applyNewestPostGuarantee(displayed, displayed, alreadyThere);
  assertValue('K5 no-op when the newest post is already on the page', result, displayed);
  assertValue('K6 nothing evicted when no injection was needed', evicted, null);
}
{
  // Deferred-but-present-in-stream -> promoted from the stream, not
  // fetched separately (Section K's own documented mechanism).
  const combinedStream = [
    ...Array.from({ length: 10 }, (_, i) => makePost(`p${i}`, `author-${i}`)),
    makePost('deferred-newest', 'some-author'),
  ];
  const { displayed } = assemblePageWithDiversity(combinedStream.slice(0, 10)); // the 11th never even considered here
  const newestCandidate = combinedStream[10];
  const { displayed: withGuarantee } = applyNewestPostGuarantee(displayed, combinedStream, newestCandidate);
  assertValue('K7 a newest post found within the full candidate stream is promoted from there (identity preserved)', withGuarantee.find(p => p.id === 'deferred-newest'), newestCandidate);
}
{
  // No newest candidate at all (e.g. an empty feed) -> safe no-op.
  const { displayed, evicted } = applyNewestPostGuarantee([], [], null);
  assertValue('K8 an empty page with no newest candidate stays empty, no crash', displayed, []);
  assertValue('K9 nothing evicted', evicted, null);
}

console.log('\n=== 6. mergeCandidateStream — same-call carryOver/freshBatch overlap (independent review correction) ===');
{
  // The exact scenario the review found: post "stale-1" was deferred into
  // carryOver on a prior window, then its live feedScore moved enough that
  // THIS SAME fetch's freshBatch legitimately re-matches it too — before
  // either copy has ever reached a seenIdsRef check. The two copies are
  // distinguishable by likesCount so the test can prove WHICH one survives,
  // not merely that dedup happened.
  const staleCarryOverCopy = { ...makePost('stale-1', 'authorA'), likesCount: 3 };
  const freshCopy = { ...makePost('stale-1', 'authorA'), likesCount: 41 };
  const untouchedCarryOver = makePost('carry-only', 'authorB');
  const freshOnly = makePost('fresh-only', 'authorC');

  const merged = mergeCandidateStream([untouchedCarryOver, staleCarryOverCopy], [freshOnly, freshCopy]);

  assertValue('MC1 the merged stream contains exactly one entry for the colliding id, not two', merged.filter(p => p.id === 'stale-1').length, 1);
  assertValue('MC2 the surviving copy is the FRESH one (live data), not the stale carryOver copy', merged.find(p => p.id === 'stale-1')?.likesCount, 41);
  assertValue('MC3 a carryOver post with no collision is preserved untouched', merged.some(p => p.id === 'carry-only'), true);
  assertValue('MC4 a freshBatch post with no collision is preserved untouched', merged.some(p => p.id === 'fresh-only'), true);
  assertValue('MC5 total merged length reflects the dedup (4 inputs, 1 collision -> 3 outputs), nothing silently dropped beyond the intended collision', merged.length, 3);
}
{
  // Disjoint sets (the normal, non-mutated case) — merge is a pure
  // concatenation, order preserved: carryOver first, then freshBatch.
  const carryOver = [makePost('c1', 'authorA'), makePost('c2', 'authorB')];
  const freshBatch = [makePost('f1', 'authorC'), makePost('f2', 'authorD')];
  const merged = mergeCandidateStream(carryOver, freshBatch);
  assertValue('MC6 disjoint carryOver/freshBatch are simply concatenated, carryOver first', merged.map(p => p.id), ['c1', 'c2', 'f1', 'f2']);
}
{
  // Empty carryOver (e.g. a reset fetch) -> merge is just freshBatch, untouched.
  const freshBatch = [makePost('f1', 'authorA'), makePost('f2', 'authorB')];
  const merged = mergeCandidateStream([], freshBatch);
  assertValue('MC7 an empty carryOver (reset fetch) leaves freshBatch completely untouched', merged, freshBatch);
}

console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===`);
process.exit(failCount > 0 ? 1 : 0);
