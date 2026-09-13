/**
 * BUILD V2 PHASE 2G-B — WHERE «اختيار القطع» ENDS, AND WHAT IT IS ALLOWED TO SAY
 * ==============================================================================
 *
 * Phase 2 had no ending. A reader answered the questions, resolved every tie,
 * looked at eight settled cards — and the journey simply stopped. No list to
 * take to a shop, no price, no statement of what was still unknown, and
 * nothing saying the phase was over. The only control at the bottom was
 * «رجوع».
 *
 * This suite is about the screen that ends it, and almost every assertion in
 * it is a REFUSAL. An ending is the most dangerous screen in this product:
 * it is the one a reader screenshots, the one they read as permission, and
 * the one where «اكتمل» is a single short step from «I am done» — with a drone
 * with props on it at the other end of that step.
 *
 * So the contract is two-sided:
 *
 *   · the review must ANSWER — which eight parts, who chose each, what the
 *     catalogue could and could not check, what it costs and what it does not
 *     include, what was not chosen for them, and what happens next;
 *   · and it must never ANSWER FALSELY — no «متوافق بالكامل» over an open
 *     manual check, no total that quietly drops the parts with no documented
 *     price, no accessory priced into a build nobody bought it for, no GPS
 *     turned into a missing part, and no «ابدأ التجميع» leading to a phase
 *     that does not exist.
 *
 * WHY SO MUCH OF THIS IS RENDERED RATHER THAN READ
 * ------------------------------------------------
 * Three times in this journey a structural grep has stood in for a behavioural
 * claim and passed while the claim was false. So the screen is rendered with
 * React's own server renderer and the assertions are made against the HTML a
 * reader would actually receive: what the numbers say, which sentences are
 * present, what is in the visible text versus what is only in a `data-*` hook.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testBuildV2Review.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { proposeBuild } from '../src/data/assembly/recommendation/proposeBuild';
import type {
  CategoryDecision, ProposedBuild, SelectionSource,
} from '../src/data/assembly/recommendation/types';
import type { BasePart } from '../src/data/assembly/types';
import { REQUIRED_BUILD_CATEGORIES } from '../src/data/assembly/recommendation/eligibility';
import { PART_CATEGORY_MAP } from '../src/data/project/store';
import {
  reviewEligibility, reviewView, type ReviewBlockReason,
} from '../web/components/build/v2/reviewModel';
import {
  summarisePrices, RECOMMENDED_CATEGORIES, OPTIONAL_CATEGORIES,
} from '../web/lib/build/bomPricing';
import { ReviewScreen } from '../web/components/build/v2/ReviewScreen';
import { REVIEW, PROPOSAL } from '../web/components/build/v2/copy';
import { PART_VOCAB } from '../web/lib/build/labels';
import { arabicNumber } from '../web/components/build/v2/arabicCount';
import {
  BUILD_V2_PREVIEW_PARAM, isBuildV2Preview,
} from '../web/lib/build/v2/previewFlag';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}
const section = (t: string) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 66 - t.length))}`);

const read = (p: string) => readFileSync(p, 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const V2 = 'web/components/build/v2';

// ── The world, and a reader who walks through it ────────────────────────────
const stocked = (category: string) => (PART_CATEGORY_MAP[category] ?? []).length;
const ALL_PARTS: BasePart[] = Object.values(PART_CATEGORY_MAP).flat();

/**
 * Resolve every open tie the way a reader does: press one candidate, let the
 * engine re-run, look again. Not a batch assignment — the engine's answer to
 * the second press depends on the first, and a test that skipped that would be
 * testing a state the journey cannot reach.
 */
function walk(input: Record<string, unknown>, max = 12) {
  const selectedParts: Record<string, string> = {};
  let build = proposeBuild({ ...input, selectedParts } as never);
  for (let i = 0; i < max; i++) {
    const open = build.decisions.filter(
      d => d.status === 'choice-required' && d.candidateIds.length > 0);
    if (open.length === 0) break;
    selectedParts[open[0].category] = open[0].candidateIds[0];
    build = proposeBuild({ ...input, selectedParts: { ...selectedParts } } as never);
  }
  return { build, selectedParts };
}
const propose = (input: Record<string, unknown>) => proposeBuild(input as never);

/* The answers behind each fixture, kept as answers so a reader is recognisable. */
const A_FREESTYLE = { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: {} };
const A_CINEMATIC = { droneTypeId: 'cinematic', cellCount: 4, budgetTier: 'mid', owned: {} };
const A_LONGRANGE = { droneTypeId: 'long-range', cellCount: 4, budgetTier: 'mid', owned: {} };
const A_CINEWHOOP = { droneTypeId: 'cinewhoop', cellCount: 6, budgetTier: 'mid', owned: {} };
const A_RACING = { droneTypeId: 'racing', cellCount: 6, budgetTier: 'mid', owned: {} };

const FREESTYLE = walk(A_FREESTYLE);     // two reader choices, all eight priced
const CINEMATIC = walk(A_CINEMATIC);     // no choices needed, one unpriced part
const LONGRANGE = walk(A_LONGRANGE);     // one choice, three unpriced parts
const UNRESOLVED = propose({ ...A_FREESTYLE, selectedParts: {} });
const CINEWHOOP = walk(A_CINEWHOOP);
const RACING = walk(A_RACING);

// ── The screen, actually rendered ───────────────────────────────────────────
const webRequire = createRequire(join(process.cwd(), 'web/package.json'));
type Renderer = (el: unknown) => string;
const ReactRT = webRequire('react') as {
  createElement: (t: unknown, p?: Record<string, unknown>) => unknown;
};
const renderToStaticMarkup = (webRequire('react-dom/server') as {
  renderToStaticMarkup: Renderer;
}).renderToStaticMarkup;

const render = (build: ProposedBuild) => renderToStaticMarkup(
  ReactRT.createElement(ReviewScreen, { build, onBack: () => {} }));

/**
 * WHAT THE READER ACTUALLY SEES.
 *
 * Tags — and therefore every attribute — are removed before any claim about
 * reader-visible text. `data-testid="v2-review-line-frames"` carries a
 * category key on purpose; that is a machine hook and no reader meets it. A
 * guard that searched the raw HTML would confuse the two and would fail on
 * the hooks while missing a key printed in the prose.
 */
const visible = (html: string) => html
  .replace(/<[^>]*>/g, ' ')
  .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ');

const HTML_FREESTYLE = render(FREESTYLE.build);
const HTML_CINEMATIC = render(CINEMATIC.build);
const HTML_LONGRANGE = render(LONGRANGE.build);
const TEXT_FREESTYLE = visible(HTML_FREESTYLE);
const TEXT_CINEMATIC = visible(HTML_CINEMATIC);
const TEXT_LONGRANGE = visible(HTML_LONGRANGE);

/**
 * ONE ELEMENT'S SUBTREE, from its opening tag to the closing tag named.
 *
 * Splitting on the bare `data-testid="…"` leaves the REST of the opening tag
 * — `data-priced="8" style="padding:13px 15px"` — at the front of the slice,
 * where it is no longer a well-formed tag and so survives tag-stripping as
 * prose. That produced five «invented prices» that were a padding value and
 * two machine counts.
 */
const blockOf = (html: string, testId: string, closing: string) => {
  const at = html.indexOf(`data-testid="${testId}"`);
  if (at < 0) return '';
  const open = html.indexOf('>', at);
  return html.slice(open + 1).split(closing)[0];
};

/** One rendered `data-*` value, by test id. */
const attrOf = (html: string, testId: string, attr: string) => {
  const el = html.match(new RegExp(`<[^>]*data-testid="${testId}"[^>]*>`));
  return el?.[0].match(new RegExp(`${attr}="([^"]*)"`))?.[1];
};
const hasTestId = (html: string, testId: string) =>
  new RegExp(`data-testid="${testId}"`).test(html);

// ═══════════════════════════════════════════════════════════════════════════
section('0 — THE FIXTURES ARE REAL READERS, AND THEY ARE MEASURED');

/*
 * Every claim below rests on these builds being the states the fixtures say
 * they are. A fixture that quietly stopped being eligible would make a dozen
 * assertions about the review pass by never rendering one.
 */
{
  ok('the freestyle reader reaches the review, having chosen two parts herself',
    reviewEligibility(FREESTYLE.build).open
    && Object.keys(FREESTYLE.selectedParts).length === 2);
  ok('the cinematic reader reaches it with no choices to make at all',
    reviewEligibility(CINEMATIC.build).open
    && Object.keys(CINEMATIC.selectedParts).length === 0);
  ok('the long-range reader reaches it after one choice',
    reviewEligibility(LONGRANGE.build).open
    && Object.keys(LONGRANGE.selectedParts).length === 1);

  /*
   * THE PRICE CLAIMS NEED BOTH SHAPES OF REALITY, FROM REAL DATA.
   *
   * If every fixture were fully priced, «unpriced parts are counted» would be
   * a guard over a branch nothing reaches. The catalogue supplies both: the
   * freestyle build prices all eight, the cinematic one leaves a motor
   * undocumented and the long-range one leaves three.
   */
  const f = reviewView(FREESTYLE.build, stocked).price;
  const c = reviewView(CINEMATIC.build, stocked).price;
  const l = reviewView(LONGRANGE.build, stocked).price;
  ok(`both price shapes occur in real data — fully priced (${f.pricedCount}/8) `
    + `and partly (${c.pricedCount}/8, ${l.pricedCount}/8)`,
    f.unpricedCount === 0 && c.unpricedCount > 0 && l.unpricedCount > 1);

  ok('a manual check survives into every one of them — so claim 14 has something to test',
    [FREESTYLE, CINEMATIC, LONGRANGE].every(
      r => reviewView(r.build, stocked).manualChecks.includes('current-headroom')));

  /*
   * And the measurement the product question actually turns on: how many
   * readers can finish the phase at all. Printed rather than asserted — it is
   * a fact about the catalogue, and a threshold here would fail the day
   * somebody adds a cinewhoop frame.
   */
  let reach = 0, total = 0;
  for (const t of ['freestyle', 'cinematic', 'long-range', 'cinewhoop', 'racing']) {
    for (const tier of [undefined, 'budget', 'mid', 'premium']) {
      for (const cellCount of [undefined, 4, 6]) {
        total++;
        const input: Record<string, unknown> = { droneTypeId: t, owned: {} };
        if (tier) input.budgetTier = tier;
        if (cellCount) input.cellCount = cellCount;
        if (reviewEligibility(walk(input).build).open) reach++;
      }
    }
  }
  console.log(`  ·· ${reach}/${total} answer-sets can finish اختيار القطع after resolving ties`);
}

// ═══════════════════════════════════════════════════════════════════════════
section('1 — AN OPEN QUESTION IS NOT A FINISHED PHASE');

/*
 * CLAIM 1. A tie is a question the reader has not answered. Reviewing a build
 * with one open is reviewing a build that does not exist yet — the engine
 * broke that tie arbitrarily to prove a path, and the «result» would be an
 * arbitrary pick presented as the reader's build.
 */
{
  const e = reviewEligibility(UNRESOLVED);
  ok('a build with an unanswered tie cannot open the review', !e.open);
  const reasons: readonly ReviewBlockReason[] = e.open ? [] : e.reasons;
  const openChoices = reasons.find(r => r.kind === 'open-choices');
  ok('— and the reason names the categories still waiting, so the reader can act',
    openChoices?.kind === 'open-choices'
    && openChoices.categories.length > 0
    && openChoices.categories.every(c => REQUIRED_BUILD_CATEGORIES.includes(c)));
  ok('the SAME answers open it once those exact ties are resolved',
    reviewEligibility(FREESTYLE.build).open
    && openChoices?.kind === 'open-choices'
    && openChoices.categories.every(c => c in FREESTYLE.selectedParts));

  /*
   * The distinction that makes this rule non-trivial: `choice-required` is the
   * only status that blocks. A category the system settled by itself does not
   * need the reader's word, and requiring one would mean the phase could only
   * end for readers who had overruled everything.
   */
  const settled = FREESTYLE.build.decisions.filter(d => d.status === 'recommended');
  ok('— while a category the system settled needs no answer to close the phase',
    settled.length > 0 && reviewEligibility(FREESTYLE.build).open);

  /*
   * EACH OF THE EIGHT, ON ITS OWN.
   *
   * Walking real readers only ever produces the ties the CATALOGUE happens to
   * leave open, and no reader in it leaves `frames` alone unresolved. So the
   * rule was true for the categories that happen to tie and untested for the
   * rest: a mutation that dropped the first category out of the eligibility
   * loop entirely passed every assertion here.
   *
   * The eight are therefore proved one at a time, against an eligible build
   * with exactly one category pushed back into each failing state.
   */
  const withDecision = (
    category: string, change: (d: CategoryDecision) => CategoryDecision | null,
  ): ProposedBuild => {
    const decisions = FREESTYLE.build.decisions
      .map(d => (d.category === category ? change(d) : d))
      .filter((d): d is CategoryDecision => d !== null);
    const parts = { ...FREESTYLE.build.parts };
    if (!decisions.some(d => d.category === category)) delete parts[category];
    return { ...FREESTYLE.build, decisions, parts };
  };

  const blockedBy = (b: ProposedBuild, category: string, kind: ReviewBlockReason['kind']) => {
    const r = reviewEligibility(b);
    if (r.open) return false;
    return r.reasons.some(x => x.kind === kind && 'categories' in x
      && x.categories.includes(category));
  };

  for (const category of REQUIRED_BUILD_CATEGORIES) {
    ok(`«${PART_VOCAB[category]!.ar}» alone, left as an open tie, shuts the ending`,
      blockedBy(withDecision(category, d => ({ ...d, status: 'choice-required' })),
        category, 'open-choices'));
    ok(`«${PART_VOCAB[category]!.ar}» alone, unavailable, shuts the ending`,
      blockedBy(withDecision(category, d => ({ ...d, status: 'unavailable' })),
        category, 'unavailable'));
    ok(`«${PART_VOCAB[category]!.ar}» alone, decided by nothing at all, shuts the ending`,
      blockedBy(withDecision(category, () => null), category, 'unresolved'));
    /*
     * And the status that SOUNDS settled while resolving to no part — the
     * failure that would render seven rows and call it eight.
     */
    ok(`«${PART_VOCAB[category]!.ar}» alone, settled but part-less, shuts the ending`,
      blockedBy({
        ...FREESTYLE.build,
        parts: Object.fromEntries(Object.entries(FREESTYLE.build.parts)
          .filter(([c]) => c !== category)),
      }, category, 'unresolved'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
section('2 — A DEAD END IS NOT A FINISHED PHASE EITHER');

/*
 * CLAIM 2. Three different failures, and the review refuses all three: a
 * required category the catalogue cannot fill, a blocker raised by the shared
 * verdict engine, and no complete assignment at all.
 */
{
  const cw = reviewEligibility(CINEWHOOP.build);
  const rc = reviewEligibility(RACING.build);
  ok('a build with unavailable required categories cannot open the review', !cw.open);
  ok('— and says so as «unavailable», not as a vague failure',
    !cw.open && cw.reasons.some(r => r.kind === 'unavailable'));
  ok('a build carrying blocker findings cannot open the review', !rc.open);
  ok('— and names the findings rather than swallowing them',
    !rc.open && rc.reasons.some(r => r.kind === 'blockers'
      && r.findingIds.length > 0));
  ok('both also report the root fact: no proven path exists',
    !cw.open && !rc.open
    && cw.reasons.some(r => r.kind === 'no-proven-path')
    && rc.reasons.some(r => r.kind === 'no-proven-path'));
  ok('and a null build — nothing proposed at all — is refused, not crashed into',
    !reviewEligibility(null).open);

  /*
   * THE ONE THING THAT MUST NOT BLOCK IT.
   *
   * `current-headroom` is open on every single eligible build in the
   * catalogue, and no catalogue can close it. If the ending required it, the
   * phase could never end — and the reader would learn that reaching a screen
   * is what clears a safety check.
   */
  const withManual = reviewView(FREESTYLE.build, stocked).manualChecks;
  ok('an open MANUAL CHECK does not block the ending — parts are settled, hardware is not',
    withManual.length > 0 && reviewEligibility(FREESTYLE.build).open);
}

// ═══════════════════════════════════════════════════════════════════════════
section('3 — EIGHT CATEGORIES, ONCE EACH, IN THE ENGINE\'S OWN ORDER');

/*
 * CLAIM 3. A missing row is a part the reader never orders. A duplicated row
 * is a part they order twice — and, if it also reached the price sum, pay for
 * twice.
 */
{
  for (const [name, r] of [['freestyle', FREESTYLE], ['cinematic', CINEMATIC],
    ['long-range', LONGRANGE]] as const) {
    const lines = reviewView(r.build, stocked).lines;
    const cats = lines.map(l => l.category);
    ok(`${name}: exactly eight lines, no category twice`,
      lines.length === 8 && new Set(cats).size === 8);
    ok(`${name}: the eight are the REQUIRED eight, in the engine's build order`,
      JSON.stringify(cats) === JSON.stringify([...REQUIRED_BUILD_CATEGORIES]));
  }

  /* And every one of them is on the screen, once. */
  for (const category of REQUIRED_BUILD_CATEGORIES) {
    const hits = HTML_FREESTYLE.split(`data-testid="v2-review-line-${category}"`).length - 1;
    ok(`the rendered review carries exactly one «${PART_VOCAB[category]!.ar}» row`, hits === 1);
  }

  /*
   * AND NOTHING OUTSIDE THE EIGHT CAN BECOME A NINTH.
   *
   * «exactly eight lines» is satisfied today by a catalogue that never
   * resolves an optional category: a loop widened to include `gps` still
   * produced eight rows, because there was no GPS part to put in the ninth.
   * That is not the rule holding — that is the rule being untested, and it
   * goes live the moment the engine resolves one.
   *
   * So a GPS is put into a build, decision and part both, and the review must
   * still report the required eight and price only those.
   */
  {
    const gpsPart = (PART_CATEGORY_MAP.gps ?? [])[0];
    const gpsDecision: CategoryDecision = {
      ...FREESTYLE.build.decisions[0],
      category: 'gps',
      partId: gpsPart.id,
      candidateIds: [gpsPart.id],
      status: 'recommended',
      selectionSource: 'system',
    };
    const withGps: ProposedBuild = {
      ...FREESTYLE.build,
      decisions: [...FREESTYLE.build.decisions, gpsDecision],
      parts: { ...FREESTYLE.build.parts, gps: gpsPart },
    };
    const gpsView = reviewView(withGps, stocked);
    ok('a build that HAS a resolved GPS still reports exactly the required eight',
      gpsView.lines.length === 8
      && !gpsView.lines.some(l => l.category === 'gps'));
    ok('— and its price is untouched by that GPS',
      gpsView.price.priceMinUSD === reviewView(FREESTYLE.build, stocked).price.priceMinUSD
      && gpsView.price.pricedCount === 8);
    ok('— and no GPS row is rendered',
      !hasTestId(render(withGps), 'v2-review-line-gps'));
    ok('— while the reader is still told a GPS exists and is optional',
      hasTestId(render(withGps), 'v2-review-optional-gps'));
    /* The same for a recommended accessory the engine somehow settled. */
    const capPart = (PART_CATEGORY_MAP.capacitors ?? [])[0];
    const withCap: ProposedBuild = {
      ...FREESTYLE.build,
      decisions: [...FREESTYLE.build.decisions,
        { ...gpsDecision, category: 'capacitors', partId: capPart.id,
          candidateIds: [capPart.id] }],
      parts: { ...FREESTYLE.build.parts, capacitors: capPart },
    };
    ok('a resolved capacitor cannot reach the rows or the total either',
      reviewView(withCap, stocked).lines.length === 8
      && reviewView(withCap, stocked).price.priceMinUSD
        === reviewView(FREESTYLE.build, stocked).price.priceMinUSD);
  }

  /*
   * THE TRUTH IS BORROWED, NOT COPIED.
   *
   * There are already two lists of «what a build needs» in this repository —
   * the engine's and the BOM's — and `scripts/testWebBuild.ts` pins them to
   * each other. A third, typed into the review, would be a third thing to keep
   * in step, and the one most likely to drift unnoticed because it only shows
   * up on the last screen.
   */
  const model = stripComments(read(`${V2}/reviewModel.ts`));
  ok('the review reads the ENGINE\'s required list rather than declaring its own',
    model.includes('REQUIRED_BUILD_CATEGORIES')
    && !/\[\s*'frames'\s*,/.test(model));
  ok('— and the tiers come from the shared BOM module, not from a second copy',
    model.includes("from '@/lib/build/bomPricing'")
    && !/'capacitors'\s*,\s*'buzzers'/.test(model));
}

// ═══════════════════════════════════════════════════════════════════════════
section('4 — EVERY LINE IS A PART THE CATALOGUE ACTUALLY STOCKS');
{
  /*
   * CLAIM 4. The review shows the part the ENGINE decided on — not a lookup
   * the screen did for itself. A second resolution path is a second chance to
   * disagree with the card the reader just came from.
   */
  for (const [name, r] of [['freestyle', FREESTYLE], ['cinematic', CINEMATIC],
    ['long-range', LONGRANGE]] as const) {
    const view = reviewView(r.build, stocked);
    const allOnShelf = view.lines.every(l =>
      (PART_CATEGORY_MAP[l.category] ?? []).some(p => p.id === l.part.id));
    ok(`${name}: every line resolves to a real part on its own shelf`, allOnShelf);
    ok(`${name}: — and it is the part the engine put there, object for object`,
      view.lines.every(l => r.build.parts[l.category] === l.part));
    ok(`${name}: the reader's own choices are the parts they pressed`,
      Object.entries(r.selectedParts).every(
        ([c, id]) => view.lines.find(l => l.category === c)?.part.id === id));
  }

  /* The names on the screen are the names in the data. */
  const view = reviewView(FREESTYLE.build, stocked);
  ok('each row prints the catalogue\'s own Arabic name for that part',
    view.lines.every(l => TEXT_FREESTYLE.includes(l.part.nameAr)));
  ok('— and its English product name too, which is what a shop search takes',
    view.lines.every(l => TEXT_FREESTYLE.includes(l.part.nameEn)));
}

// ═══════════════════════════════════════════════════════════════════════════
section('5 — WHO CHOSE IT, AND THE FOUR ANSWERS KEPT FOUR');
{
  /*
   * CLAIM 5. This is the assertion the whole of Phase 2D existed for. «I own
   * this», «I chose this» and «the system picked this» are three different
   * facts about the world, and the last screen is exactly where a tired
   * implementation flattens them into one badge.
   */
  const view = reviewView(FREESTYLE.build, stocked);
  const bySource = (s: SelectionSource) => view.lines.filter(l => l.source === s);

  ok('the reader\'s two choices are attributed to the reader',
    bySource('user-selected').length === 2
    && bySource('user-selected').every(l => l.category in FREESTYLE.selectedParts));
  ok('— and are called «اخترتها بنفسك», never «اقترحه النظام»',
    bySource('user-selected').every(l =>
      new RegExp(`${REVIEW.provenance.selected}`).test(
        visible(blockOf(HTML_FREESTYLE, `v2-review-line-${l.category}`, '</li>')))));

  for (const l of bySource('user-selected')) {
    const badge = visible(
      blockOf(HTML_FREESTYLE, `v2-review-provenance-${l.category}`, '</span>'));
    ok(`«${PART_VOCAB[l.category]!.ar}» — the reader's own choice is not labelled as ours`,
      !badge.includes(REVIEW.provenance.recommended)
      && !badge.includes(REVIEW.provenance.owned));
  }

  /*
   * AND THE OTHER DIRECTION, WHICH IS THE MORE TEMPTING MISTAKE.
   *
   * Calling a system recommendation «اختيارك» flatters the reader and costs
   * nothing visible — right up to the moment they are standing over a part
   * that does not fit, certain they picked it.
   */
  ok('a system decision is never called the reader\'s',
    bySource('system').length > 0
    && bySource('system').every(l => {
      const badge = visible(
        blockOf(HTML_FREESTYLE, `v2-review-provenance-${l.category}`, '</span>'));
      return !badge.includes(REVIEW.provenance.selected)
        && !badge.includes(REVIEW.provenance.owned);
    }));

  /*
   * «the system picked this from several» and «this was the only one that
   * fits» are also different sentences, and the catalogue supplies both.
   */
  const cin = reviewView(CINEMATIC.build, stocked);
  ok('«الخيار الوحيد المتوافق» is said only where the engine actually said it',
    cin.lines.some(l => l.status === 'only-compatible')
    && cin.lines.filter(l => l.status === 'only-compatible').every(l =>
      visible(blockOf(HTML_CINEMATIC, `v2-review-provenance-${l.category}`, '</span>'))
        .includes(REVIEW.provenance.onlyCompatible)));
  ok('— and «اقترحه النظام» only where it ranked several',
    cin.lines.some(l => l.status === 'recommended')
    && cin.lines.filter(l => l.status === 'recommended').every(l =>
      visible(blockOf(HTML_CINEMATIC, `v2-review-provenance-${l.category}`, '</span>'))
        .includes(REVIEW.provenance.recommended)));

  /*
   * THE FOURTH SOURCE, AND WHY IT IS TESTED WITH A CONSTRUCTED BUILD.
   *
   * `user-owned` needs `owned.parts` — hardware already in hand. The V2
   * journey never populates it: it asks about ECOSYSTEMS, not parts. So the
   * branch is unreachable from the questions today, and that is a fact worth
   * pinning rather than a gap worth hiding: it is asserted below, and the copy
   * path is exercised through the pure model instead, so the day the journey
   * learns to ask, the label is already right.
   */
  const preview = stripComments(read(`${V2}/BuildV2Preview.tsx`));
  ok('the journey asks about ecosystems, never claiming the reader owns a PART',
    !/owned\s*:\s*\{[^}]*parts/.test(preview) && !preview.includes('ownedParts'));

  const owned: ProposedBuild = {
    ...FREESTYLE.build,
    decisions: FREESTYLE.build.decisions.map(d => d.category === 'frames'
      ? { ...d, selectionSource: 'user-owned' as SelectionSource, status: 'user-locked' }
      : d) as CategoryDecision[],
  };
  const ownedHtml = render(owned);
  ok('a part the reader OWNS is called «قطعة لديك» — the fourth answer, kept apart',
    visible(blockOf(ownedHtml, 'v2-review-provenance-frames', '</span>'))
      .includes(REVIEW.provenance.owned));
  ok('— and owning one is not reported as having chosen it',
    !visible(blockOf(ownedHtml, 'v2-review-provenance-frames', '</span>'))
      .includes(REVIEW.provenance.selected));

  ok('all four of the domain\'s sources have their own sentence — none doubled up',
    new Set(Object.values(REVIEW.provenance)).size === 4);

  /*
   * Provenance is TEXT. A reader who cannot tell two greys apart, or who is
   * hearing the page rather than seeing it, still has to be able to tell what
   * the system decided from what they decided.
   */
  ok('provenance is carried by words, not by a colour or an icon',
    Object.values(REVIEW.provenance).every(p => TEXT_FREESTYLE.includes(p)
      || !view.lines.some(l => visible(
        blockOf(HTML_FREESTYLE, `v2-review-provenance-${l.category}`, '</span>'))
        .includes(p))));
}

// ═══════════════════════════════════════════════════════════════════════════
section('6 — NO DATABASE KEY REACHES THE READER');
{
  /*
   * CLAIM 6. Every id in this build, and every category key, checked against
   * the VISIBLE TEXT — tags stripped, so the `data-*` hooks the tests
   * themselves rely on are not mistaken for prose.
   */
  for (const [name, html] of [['freestyle', HTML_FREESTYLE], ['cinematic', HTML_CINEMATIC],
    ['long-range', HTML_LONGRANGE]] as const) {
    const text = visible(html);
    const leakedIds = ALL_PARTS.map(p => p.id).filter(id => text.includes(id));
    ok(`${name}: no catalogue part id appears in the prose`
      + (leakedIds.length ? ` — leaked: ${leakedIds.slice(0, 3).join(', ')}` : ''),
      leakedIds.length === 0);
    const leakedCats = Object.keys(PART_CATEGORY_MAP)
      .filter(c => new RegExp(`(^|\\s)${c}(\\s|$|:)`).test(text));
    ok(`${name}: no category key appears in the prose`
      + (leakedCats.length ? ` — leaked: ${leakedCats.join(', ')}` : ''),
      leakedCats.length === 0);
  }
  /* The manual check ids are keys too, and they have copy of their own. */
  ok('a manual check is described, never identified by its finding id',
    !visible(HTML_FREESTYLE).includes('current-headroom')
    && TEXT_FREESTYLE.includes(PROPOSAL.manual.labels['current-headroom']));

  /* Negative control: the ids ARE still on the machine hooks, for debugging. */
  ok('— while the ids stay on the data-* hooks, where a debugger can find them',
    hasTestId(HTML_FREESTYLE, 'v2-review-manual-current-headroom')
    && hasTestId(HTML_FREESTYLE, 'v2-review-line-frames'));
}

// ═══════════════════════════════════════════════════════════════════════════
section('7 — THE ARITHMETIC, AND THE HALF OF IT WE CANNOT DO');
{
  /*
   * CLAIMS 7, 8 and 9. Every figure on this screen is a sum of figures a human
   * wrote into the catalogue. Not a midpoint, not an estimate, not a market
   * price, not a conversion, not shipping, not tax.
   */
  for (const [name, r, html] of [
    ['freestyle', FREESTYLE, HTML_FREESTYLE], ['cinematic', CINEMATIC, HTML_CINEMATIC],
    ['long-range', LONGRANGE, HTML_LONGRANGE]] as const) {
    const view = reviewView(r.build, stocked);
    /* Recomputed here from the raw parts, independently of the model. */
    let min = 0, max = 0, unpriced = 0, priced = 0;
    for (const l of view.lines) {
      const range = l.part.priceRangeUSD;
      if (range) { min += range[0]; max += range[1]; priced++; } else unpriced++;
    }
    ok(`${name}: the documented minimums and maximums are summed exactly ($${min}–$${max})`,
      view.price.priceMinUSD === min && view.price.priceMaxUSD === max);
    ok(`${name}: the parts with no documented price are counted (${unpriced}), never estimated`,
      view.price.unpricedCount === unpriced && view.price.pricedCount === priced);
    ok(`${name}: priced + unpriced accounts for all eight — nothing silently dropped`,
      view.price.pricedCount + view.price.unpricedCount === 8);

    const text = visible(html);
    if (priced > 0) {
      ok(`${name}: the screen shows that range and no other figure`,
        text.includes(`$${min}–$${max}`));
    }
    if (unpriced > 0) {
      ok(`${name}: — and says how many parts it could not include`,
        text.includes(arabicNumber(unpriced))
        && text.includes(REVIEW.price.unpricedNote));
    }
    ok(`${name}: the exclusions are stated on the screen, not in a footnote`,
      text.includes(REVIEW.price.excludes));
  }

  /*
   * CLAIM 9, said as strictly as it can be said: every number rendered inside
   * the price block is one of exactly three the catalogue justifies.
   */
  const view = reviewView(FREESTYLE.build, stocked);
  const priceBlock = visible(blockOf(HTML_FREESTYLE, 'v2-review-price', '</section>'));
  const allowed = new Set([
    String(view.price.priceMinUSD), String(view.price.priceMaxUSD),
    arabicNumber(view.price.unpricedCount),
  ]);
  const rendered = priceBlock.match(/[\d٠-٩]+/g) ?? [];
  const invented = rendered.filter(n => !allowed.has(n));
  ok('every number in the price block is a documented sum or the unpriced count'
    + (invented.length ? ` — invented: ${invented.join(', ')}` : ''),
    invented.length === 0);

  /*
   * A midpoint is the most natural thing in the world to add and the least
   * defensible: nothing in the data says a part costs the average of its
   * range, and a single figure is what a reader remembers.
   */
  const screen = stripComments(read(`${V2}/ReviewScreen.tsx`));
  const pricing = stripComments(read('web/lib/build/bomPricing.ts'));
  ok('no midpoint, no average, no currency conversion anywhere in the path',
    !/\/\s*2\b/.test(pricing) && !/\/\s*2\b/.test(screen)
    && !/(SAR|EGP|AED|EUR|€|£|exchange|convert)/i.test(pricing + screen));
  ok('the price summariser does arithmetic on documented ranges and nothing else',
    (pricing.match(/priceRangeUSD/g) ?? []).length > 0
    && !/Math\.(round|floor|ceil|random)/.test(pricing));

  /*
   * AND THE CASE WHERE A RANGE WOULD BE A LIE.
   *
   * `$0–$0` on a build with no documented prices reads as «this build is
   * free». The catalogue prices most things, so this state is reached with a
   * constructed build rather than waited for.
   */
  const unpricedBuild: ProposedBuild = {
    ...FREESTYLE.build,
    parts: Object.fromEntries(Object.entries(FREESTYLE.build.parts)
      .map(([c, p]) => [c, { ...p, priceRangeUSD: undefined }])) as Record<string, BasePart>,
  };
  const noneHtml = render(unpricedBuild);
  ok('with nothing documented the screen says so instead of printing $0–$0',
    visible(noneHtml).includes(REVIEW.price.noneDocumented)
    && !visible(noneHtml).includes('$0'));
  ok('— and still reports how many parts that was',
    visible(noneHtml).includes(arabicNumber(8)));
  ok('the range element is simply absent, not rendered empty',
    !hasTestId(noneHtml, 'v2-review-price-range')
    && hasTestId(noneHtml, 'v2-review-price-none'));

  /* The machine-readable counts agree with the prose. */
  ok('the price block publishes its own counts for a checker to read back',
    attrOf(HTML_LONGRANGE, 'v2-review-price', 'data-unpriced')
      === String(reviewView(LONGRANGE.build, stocked).price.unpricedCount)
    && attrOf(HTML_LONGRANGE, 'v2-review-price', 'data-priced')
      === String(reviewView(LONGRANGE.build, stocked).price.pricedCount));
}

// ═══════════════════════════════════════════════════════════════════════════
section('8 — WHAT IS NOT IN THE TOTAL, BECAUSE NOBODY BOUGHT IT');
{
  /*
   * CLAIM 10. The reader has not chosen a capacitor. Adding one to the total
   * invents a purchase — and it is an easy bug to write, because the
   * accessory is right there in the same view object.
   */
  const view = reviewView(FREESTYLE.build, stocked);
  const eightOnly = summarisePrices(view.lines.map(l => l.part));
  ok('the total prices the eight required parts and nothing else',
    eightOnly.priceMinUSD === view.price.priceMinUSD
    && eightOnly.priceMaxUSD === view.price.priceMaxUSD
    && eightOnly.pricedCount + eightOnly.unpricedCount === 8);

  /*
   * Proved by ARITHMETIC rather than by reading the code: add every stocked
   * accessory to the same summariser and the answer must move. If it does not,
   * the accessories are free — or they were already inside.
   */
  const extras = [...RECOMMENDED_CATEGORIES, ...OPTIONAL_CATEGORIES]
    .flatMap(c => PART_CATEGORY_MAP[c] ?? []);
  const withExtras = summarisePrices([...view.lines.map(l => l.part), ...extras]);
  ok(`the ${extras.length} stocked accessories would have moved the total — they are not in it`,
    withExtras.priceMinUSD > view.price.priceMinUSD
    && view.price.priceMinUSD === eightOnly.priceMinUSD);

  /* And no accessory's name is anywhere on the screen to suggest otherwise. */
  const extraNames = extras.filter(p => TEXT_FREESTYLE.includes(p.nameAr));
  ok('no accessory product is named on the review at all'
    + (extraNames.length ? ` — named: ${extraNames[0].nameAr}` : ''),
    extraNames.length === 0);
  ok('the price lead says out loud that it covers the core parts only',
    TEXT_FREESTYLE.includes(REVIEW.price.lead)
    && REVIEW.price.excludes.includes('الموصى بها'));
}

// ═══════════════════════════════════════════════════════════════════════════
section('9 — THREE TIERS, AND THE TWO THAT ARE NOT REQUIRED');
{
  /*
   * CLAIMS 11, 12 and 13. A capacitor is «موصى بها» — the catalogue's own
   * safety notes push it. A GPS is «اختياري» — it changes what the drone can
   * do, not whether it flies. Flattening those two into one list loses a real
   * editorial distinction; promoting either into the required eight would stop
   * the phase from ever ending.
   */
  const view = reviewView(FREESTYLE.build, stocked);
  ok('the recommended tier is exactly capacitors, buzzers and tools',
    JSON.stringify(view.recommendedExtras.map(e => e.category))
      === JSON.stringify(['capacitors', 'buzzers', 'tools']));
  ok('the optional tier is exactly GPS, and it is its own tier',
    JSON.stringify(view.optionalExtras.map(e => e.category)) === JSON.stringify(['gps']));

  ok('— and they are rendered as two separate sections, with two different headings',
    hasTestId(HTML_FREESTYLE, 'v2-review-recommended')
    && hasTestId(HTML_FREESTYLE, 'v2-review-optional')
    && TEXT_FREESTYLE.includes(REVIEW.recommended.title)
    && TEXT_FREESTYLE.includes(REVIEW.optional.title)
    && REVIEW.recommended.title !== REVIEW.optional.title);

  for (const c of ['capacitors', 'buzzers', 'tools']) {
    ok(`«${PART_VOCAB[c]!.ar}» is listed as recommended, by category`,
      hasTestId(HTML_FREESTYLE, `v2-review-recommended-${c}`));
  }
  ok('«نظام تحديد المواقع» is listed as optional, on its own',
    hasTestId(HTML_FREESTYLE, 'v2-review-optional-gps')
    && !hasTestId(HTML_FREESTYLE, 'v2-review-recommended-gps'));

  /*
   * CLAIM 13, behaviourally: a build with no GPS is a finished build. If GPS
   * were required, no reader in this catalogue could ever end the phase,
   * because the journey never offers one.
   */
  ok('no eligible build carries a GPS — and every one of them is still complete',
    [FREESTYLE, CINEMATIC, LONGRANGE].every(r =>
      !('gps' in r.build.parts) && reviewEligibility(r.build).open));
  ok('GPS is not in the engine\'s required list, so it cannot gate the ending',
    !REQUIRED_BUILD_CATEGORIES.includes('gps')
    && OPTIONAL_CATEGORIES.includes('gps'));

  /*
   * THE WORDS THAT WOULD MAKE AN OPTIONAL PART FEEL MISSING.
   *
   * «ناقص» and «مطلوب» are what a reader reads as a hole in their build. The
   * optional section may not use either, and may not claim everyone should
   * have one.
   */
  const optBlock = visible(blockOf(HTML_FREESTYLE, 'v2-review-optional', '</section>'));
  /*
   * The words that would turn an optional part into a hole in the build —
   * matched as CLAIMS, not as substrings. «ليست مطلوبة» contains «مطلوب» and
   * is the honest sentence; a guard that failed on it would push the copy
   * towards saying less rather than more.
   */
  ok('the optional section never calls a GPS missing',
    !/ناقص|ينقص|غير مكتمل/.test(optBlock));
  ok('— nor required, except to say it is NOT required',
    !/(?<!ليست |ليس |غير )مطلوب/.test(optBlock));
  ok('— nor recommended for everyone, which the catalogue does not claim',
    !/موصى به للجميع|يُنصح به دائمًا|كل بناء يحتاج/.test(optBlock)
    && !optBlock.includes(REVIEW.recommended.title));
  ok('— it says plainly that it is not needed for completion',
    optBlock.includes(REVIEW.optional.lead)
    && REVIEW.optional.lead.includes('ليست مطلوبة'));

  /* Nothing was added to anybody's build. Both tiers say so. */
  ok('neither tier pretends something was chosen for the reader',
    (TEXT_FREESTYLE.match(new RegExp(REVIEW.extrasNotChosen, 'g')) ?? []).length
      === RECOMMENDED_CATEGORIES.length + OPTIONAL_CATEGORIES.length);
  ok('and the recommended lead admits the system ranked no product among them',
    REVIEW.recommended.lead.includes('لم يرشّح النظام منتجًا بعينه'));

  /*
   * «none chosen» must not be readable as «none exist»: the count of what the
   * catalogue stocks is carried so the copy can never drift into the stronger
   * claim.
   */
  ok('the model carries what the catalogue stocks, so «لم تُختَر» cannot mean «لا يوجد»',
    [...view.recommendedExtras, ...view.optionalExtras].every(e => e.stocked > 0));
}

// ═══════════════════════════════════════════════════════════════════════════
section('10 — THE MANUAL CHECK ARRIVES OPEN AND LEAVES OPEN');
{
  /*
   * CLAIM 14. This is the assertion that matters most on the page. A manual
   * check is a question the DATA cannot settle; reaching an end screen is not
   * evidence about hardware, and a control here that let a reader mark one
   * passed would record a click, not a measurement.
   */
  const view = reviewView(FREESTYLE.build, stocked);
  ok('the engine\'s manual checks pass through untouched — none cleared by arriving',
    JSON.stringify(view.manualChecks) === JSON.stringify([...FREESTYLE.build.manualChecks])
    && view.manualChecks.includes('current-headroom'));
  ok('the check is rendered, with its own heading, not folded into a footnote',
    hasTestId(HTML_FREESTYLE, 'v2-review-manual')
    && hasTestId(HTML_FREESTYLE, 'v2-review-manual-current-headroom')
    && TEXT_FREESTYLE.includes(REVIEW.manual.title));

  /*
   * THE CORRECTED 2G-A WORDING, WORD FOR WORD.
   *
   * The old sentence sent the reader to «الرقمين على القطعتين» — two figures,
   * one of which does not exist: no motor in the catalogue documents current
   * draw, because draw is not a property of a motor. Phase 2G-A rewrote it to
   * say where each half actually comes from. The review shows THAT sentence,
   * from the same source, so the two screens cannot drift.
   */
  ok('it shows the corrected instruction, from the proposal\'s own copy',
    TEXT_FREESTYLE.includes(PROPOSAL.manual.labels['current-headroom']));
  ok('— which still refuses to imply a motor current we do not have',
    PROPOSAL.manual.labels['current-headroom'].includes('غير موجود في الكتالوج')
    && PROPOSAL.manual.labels['current-headroom'].includes('مواصفات الشركة المصنّعة'));

  /*
   * AND THERE IS NO WAY TO «PASS» IT HERE.
   */
  const screen = stripComments(read(`${V2}/ReviewScreen.tsx`));
  const manualBlock = blockOf(HTML_FREESTYLE, 'v2-review-manual', '</aside>');
  ok('no checkbox, no toggle, no button sits beside a manual check',
    !/<input|<button|role="checkbox"|type="checkbox"/.test(manualBlock));
  ok('the review never records a check as done — it has nowhere to record it',
    !/(setChecked|confirmed|markPassed|onCheck|useState)/.test(screen));
  ok('and it never says a manual check passed',
    !/(اجتاز|تم الفحص|فحص ناجح|تحقّقنا)/.test(TEXT_FREESTYLE));

  /*
   * The status is carried as text with the warning colour, not by the colour
   * alone — the section has a heading and a lead sentence that say what it is.
   */
  ok('the manual section does not rely on colour or an icon to be understood',
    visible(manualBlock).includes(REVIEW.manual.title)
    && visible(manualBlock).includes(REVIEW.manual.lead));
  ok('— and its lead points at the assembly phase, not at this screen',
    REVIEW.manual.lead.includes('مرحلة التجميع'));
}

// ═══════════════════════════════════════════════════════════════════════════
section('11 — WHAT THE ENDING IS NOT ALLOWED TO SAY');
{
  /*
   * CLAIM 15. The six sentences this journey exists to not say. Each one is
   * true-sounding, reachable by a single careless edit, and load-bearing: a
   * reader who believes any of them puts props on a drone.
   */
  const FORBIDDEN: [string, RegExp][] = [
    ['«متوافق بالكامل» — while a manual check is open', /متوافق بالكامل/],
    ['«آمن للطيران»', /آمن للطيران|آمن للاستخدام|بناء آمن/],
    ['«تم التحقق بالكامل»', /تم التحقق بالكامل|تحقّقنا من كل شيء/],
    ['«جاهز للتشغيل»', /جاهز للتشغيل|جاهز للتوصيل|جاهز لتوصيل البطارية/],
    ['«جاهز للمراوح»', /جاهز للمراوح|ركّب المراوح/],
    ['«اجتاز فحص هامش التيار»', /اجتاز|هامش التيار سليم|هامش التيار كافٍ/],
    ['«اكتمل التجميع»', /اكتمل التجميع|تم التجميع/],
    ['«جاهز للطيران»', /جاهز للطيران|يمكنك الطيران/],
  ];
  for (const [what, rx] of FORBIDDEN) {
    ok(`the review never claims ${what}`,
      ![TEXT_FREESTYLE, TEXT_CINEMATIC, TEXT_LONGRANGE].some(t => rx.test(t)));
  }
  /* And not in the copy module either, where a future screen would find it. */
  ok('— and none of those sentences is sitting unused in the review copy',
    !FORBIDDEN.some(([, rx]) => rx.test(JSON.stringify(REVIEW))));

  /*
   * WHAT IT SAYS INSTEAD — and the two halves stay two halves.
   *
   * «لم نجد مانعًا» is a statement about what the data could check. «تبقى فحوص
   * يدوية» is a statement about what it could not. Merged, they become
   * «متوافق بالكامل», which is the claim above.
   */
  ok('compatibility is reported as «لم نجد مانع توافق معروفًا في البيانات الحالية»',
    TEXT_FREESTYLE.includes(REVIEW.compat.noBlockers)
    && REVIEW.compat.noBlockers.includes('البيانات الحالية'));
  ok('— and the open manual checks are named in a SEPARATE sentence',
    TEXT_FREESTYLE.includes(REVIEW.compat.stillManual)
    && hasTestId(HTML_FREESTYLE, 'v2-review-compat-manual'));
  ok('that second sentence appears only when a check is actually open',
    !hasTestId(render({ ...FREESTYLE.build, manualChecks: [] }), 'v2-review-compat-manual'));

  /*
   * CLAIM 16. The headline and its correction are one thought. «اكتمل اختيار
   * القطع الأساسية» alone is the sentence a reader turns into «I am done».
   */
  ok('the headline is a claim about PARTS, and says so in the same breath',
    TEXT_FREESTYLE.includes(REVIEW.completeTitle)
    && TEXT_FREESTYLE.includes(REVIEW.completeLead));
  ok('— and the correction names what has NOT happened: assembly, power, flight',
    /تجميع/.test(REVIEW.completeLead) && /طيران/.test(REVIEW.completeLead)
    && /تشغيل/.test(REVIEW.completeLead));
  const screen = stripComments(read(`${V2}/ReviewScreen.tsx`));
  ok('the two cannot be rendered apart — the lead has no condition on it',
    screen.includes('REVIEW.completeTitle') && screen.includes('REVIEW.completeLead')
    && !/\{\s*\w+\s*&&\s*[^}]*completeLead/.test(screen));
  ok('nothing celebratory implies safety',
    !/(مبروك|تهانينا|أحسنت|رائع|ممتاز)/.test(TEXT_FREESTYLE));
}

// ═══════════════════════════════════════════════════════════════════════════
section('12 — THE ONLY REAL ACTION, AND IT GOES BACKWARDS');
{
  /*
   * CLAIM 17, and section M. The next phase does not exist. A live «ابدأ
   * التجميع» would be a door painted on a wall; a disabled one is still a
   * button promising a destination. So the phase is NAMED, its state is
   * stated, and the one control goes back to the parts.
   */
  const screen = stripComments(read(`${V2}/ReviewScreen.tsx`));
  const buttons = HTML_FREESTYLE.match(/<button[^>]*>/g) ?? [];
  ok('exactly one control on the whole screen', buttons.length === 1);
  ok('— and it is a real <button type="button">, not a clickable div',
    buttons[0].includes('type="button"') && hasTestId(HTML_FREESTYLE, 'v2-review-back'));
  ok('it is labelled «الرجوع لتعديل القطع» — an edit, not an exit',
    TEXT_FREESTYLE.includes(REVIEW.back) && REVIEW.back.includes('تعديل'));
  ok('it is at least 44px tall, like every other control in this journey',
    /minHeight:\s*44/.test(screen));

  ok('the handoff is a message, with no control in it',
    hasTestId(HTML_FREESTYLE, 'v2-review-handoff')
    && !/<button/.test(blockOf(HTML_FREESTYLE, 'v2-review-handoff', '</section>')));
  ok('it names the next phase and says plainly that it is not open yet',
    TEXT_FREESTYLE.includes(REVIEW.handoff.body)
    && REVIEW.handoff.body.includes('التجميع الآمن')
    && REVIEW.handoff.body.includes('لم تُفتح'));
  ok('there is no «ابدأ التجميع» anywhere, live or disabled',
    !/ابدأ التجميع|ابدأ الآن|انتقل للتجميع/.test(TEXT_FREESTYLE)
    && !/disabled/.test(HTML_FREESTYLE));

  /* And the button returns to the proposal — where the parts can be changed. */
  const preview = stripComments(read(`${V2}/BuildV2Preview.tsx`));
  ok('«الرجوع لتعديل القطع» lands on the proposal, where the parts are',
    /onBack=\{\(\) => setScreen\('proposal'\)\}/.test(preview));
  ok('— and «رجوع» in the footer does the same thing from the review',
    /if \(screen === 'review'\) \{ setScreen\('proposal'\); return; \}/.test(preview));
}

// ═══════════════════════════════════════════════════════════════════════════
section('13 — THE REVIEW IS DERIVED EVERY TIME, NEVER REMEMBERED');
{
  /*
   * CLAIM 18. A cached «finished» flag is how an ending goes stale: the reader
   * changes a part, the build reopens a category, and a summary of a build
   * that no longer exists stays reachable — priced, provenanced and wrong.
   */
  const before = reviewView(FREESTYLE.build, stocked);
  const swapped = { ...FREESTYLE.selectedParts };
  /*
   * The alternatives are on the TIE the reader answered, not on the answer.
   * Once a category is `user-selected` its candidate list is the one part they
   * chose — which is the point of a selection — so the other options have to
   * be read from the build as it stood BEFORE the press.
   */
  const tie = UNRESOLVED.decisions.find(d => d.category === 'propellers')!;
  const chosen = FREESTYLE.selectedParts.propellers;
  const other = (PART_CATEGORY_MAP.propellers ?? [])
    .find(p => p.id !== chosen && tie.candidateIds.includes(p.id));
  ok(`the reader had ${tie.candidateIds.length} propellers to choose between, `
    + 'and could have picked another', other !== undefined);

  if (other) {
    swapped.propellers = other.id;
    const after = propose({ ...A_FREESTYLE, selectedParts: swapped });
    const afterView = reviewView(after, stocked);
    ok('changing a part changes the part the review reports',
      afterView.lines.find(l => l.category === 'propellers')?.part.id === other.id
      && before.lines.find(l => l.category === 'propellers')?.part.id !== other.id);
    ok('— and the price is recomputed from the new parts, not carried over',
      afterView.price.priceMinUSD
        === afterView.lines.reduce((s, l) => s + (l.part.priceRangeUSD?.[0] ?? 0), 0));
    const beforeText = visible(render(FREESTYLE.build));
    const afterText = visible(render(after));
    ok('the rendered screen differs — the change reaches the reader',
      beforeText !== afterText && afterText.includes(other.nameAr));
  }

  /*
   * AND THE DOOR CLOSES BEHIND THEM.
   *
   * If a change reopens a category, the review must stop being reachable until
   * it is resolved again. Measured by taking an eligible build back to the
   * state it came from.
   */
  ok('clearing the choices that opened the review closes it again',
    reviewEligibility(propose({ ...A_FREESTYLE, selectedParts: {} })).open === false
    && reviewEligibility(FREESTYLE.build).open === true);

  const preview = stripComments(read(`${V2}/BuildV2Preview.tsx`));
  ok('eligibility is derived on every render, from the engine\'s current answer',
    /const reviewOpen = build !== null && reviewEligibility\(build\)\.open;/.test(preview));
  /*
   * `useState<… | 'review'>` is WHICH SCREEN the reader is on, which is state
   * the journey must keep. What must not exist is a remembered VERDICT — an
   * eligibility, a build, or a «finished» flag cached across renders, any of
   * which would outlive the build it was computed from.
   */
  ok('— there is no stored «finished» flag, and no cached eligibility or build',
    !/(reviewDone|hasReviewed|completedPhase|isComplete)/.test(preview)
    && !/use(State|Memo|Ref)[^;\n]*(reviewEligibility|reviewOpen|ProposedBuild)/.test(preview));
  ok('the review screen renders only while it is still eligible',
    /screen === 'review' && build && reviewOpen/.test(preview));
  ok('and an ineligible review falls back to the parts, never to a blank screen',
    /screen === 'review' && !reviewOpen/.test(preview));

  const screen = stripComments(read(`${V2}/ReviewScreen.tsx`));
  ok('the screen itself holds no state — it is a function of the build it is given',
    !/useState|useReducer|useRef|useEffect/.test(screen));
  ok('the model is pure: it imports the engine\'s TYPES and no engine',
    !/proposeBuild/.test(stripComments(read(`${V2}/reviewModel.ts`))));
  ok('— and what the catalogue stocks is injected, so a test can empty a shelf',
    /stockedIn/.test(read(`${V2}/reviewModel.ts`))
    && reviewView(FREESTYLE.build, () => 0).recommendedExtras.every(e => e.stocked === 0));
}

// ═══════════════════════════════════════════════════════════════════════════
section('14 — STILL NOTHING IS WRITTEN DOWN');
{
  /*
   * CLAIM 21. The ending is exactly where persistence gets added: the reader
   * has finished something, and saving it feels like a kindness. It is not
   * this phase's to add, and «we do not call it» is a weaker promise than «it
   * is not in the bundle».
   */
  const NEW_FILES = [
    `${V2}/ReviewScreen.tsx`, `${V2}/reviewModel.ts`, 'web/lib/build/bomPricing.ts',
  ];
  const BANNED = /localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|firebase|firestore|saveDraft|saveAssemblyProject|mirrorToProject|navigator\.sendBeacon/;
  for (const f of NEW_FILES) {
    ok(`${f.split('/').pop()} writes nothing anywhere`, !BANNED.test(stripComments(read(f))));
  }
  /*
   * The whole V2 folder, including the screens that were already there — this
   * is the sweep that has to keep passing as the journey grows.
   */
  const v2All = readdirSync(V2).filter(f => /\.tsx?$/.test(f));
  const leaks = v2All.filter(f => BANNED.test(stripComments(read(join(V2, f)))));
  ok(`no file in the V2 journey persists anything (${v2All.length} files checked)`
    + (leaks.length ? ` — ${leaks.join(', ')}` : ''), leaks.length === 0);

  /*
   * AND THE REASON THE PRICING SEAM IS ITS OWN FILE.
   *
   * `bom.ts` imports `draft.ts`, which imports the project WRITER. Importing
   * the BOM's rules from V2 would have pulled that in behind them. The V2
   * review must not reach it, directly or transitively.
   */
  const model = read(`${V2}/reviewModel.ts`);
  ok('the review imports the pure pricing seam, not bom.ts',
    model.includes('bomPricing') && !/from '@?\/?.*build\/bom'/.test(model));
  ok('— and never reaches a draft, which is a persistence record',
    !/BuildDraft|draftParts|emptyDraft/.test(
      NEW_FILES.map(f => stripComments(read(f))).join('\n')));
  ok('no BuildDraft is fabricated to satisfy an API',
    !/computeBom\(/.test(NEW_FILES.map(f => stripComments(read(f))).join('\n')));
}

// ═══════════════════════════════════════════════════════════════════════════
section('15 — THE PHASE ENDED; NOTHING ELSE OPENED');
{
  /*
   * CLAIM 22, and the preservation list. A review screen is a plausible place
   * to add a route — «/build/review» reads like a good idea — and it would
   * take the V2 journey out from behind its flag.
   */
  ok('the preview parameter is still `buildV2`', BUILD_V2_PREVIEW_PARAM === 'buildV2');
  ok('`?buildV2=1` still opens it, and nothing else does',
    isBuildV2Preview('1')
    && ![null, undefined, '', '0', '01', '1 ', 'true', 'yes', 'V1', 'review']
      .some(v => isBuildV2Preview(v)));
  ok('the gate still reads that one parameter through that one predicate',
    stripComments(read(`${V2}/BuildV2PreviewGate.tsx`))
      .includes('isBuildV2Preview(new URLSearchParams(window.location.search)'));
  const routes = readdirSync('web/app/build', { recursive: true }) as string[];
  ok('no new route was created for the review',
    !routes.some(r => /review/i.test(String(r))));
  ok('the review is a STATE in the existing journey, not a page',
    /screen === 'review'/.test(stripComments(read(`${V2}/BuildV2Preview.tsx`)))
    && !readdirSync(V2).includes('page.tsx'));

  /* The domain the whole journey rests on is untouched by this phase. */
  ok('the review reads the engine\'s output and changes none of its inputs',
    !/proposeBuild|RecommendationEngine/.test(stripComments(read(`${V2}/reviewModel.ts`))));

  /*
   * PHASE 2G-A'S WORK IS STILL THERE.
   *
   * The confirmation before destructive invalidation, its non-modal
   * semantics, and the owned-equipment diagnosis all live one screen back. A
   * review screen that quietly changed the answer flow would break them.
   */
  const preview = stripComments(read(`${V2}/BuildV2Preview.tsx`));
  ok('the invalidation confirmation is still wired into the answer flow',
    preview.includes('InvalidationConfirm') && preview.includes('setPending('));
  /*
   * Comments stripped first: this file's header EXPLAINS at length why
   * `aria-modal` is absent, and a guard that searched the raw text would fail
   * on the explanation for the very rule it is enforcing.
   */
  const confirm = stripComments(read(`${V2}/InvalidationConfirm.tsx`));
  ok('— and is still a non-modal dialog, with no aria-modal on it',
    confirm.includes('role="dialog"') && !confirm.includes('aria-modal'));
  ok('the owned-equipment diagnosis is still consulted on a dead end',
    preview.includes('diagnoseDeadEnd'));
}

// ═══════════════════════════════════════════════════════════════════════════
section('16 — READABLE, NAVIGABLE, AND ISOLATED');
{
  /*
   * Section P. Latin product names inside Arabic prose need bidi isolation or
   * the punctuation around them migrates — «Source One V5» followed by a comma
   * renders the comma on the wrong side. The journey has one contract for
   * that, and the review uses it rather than a second one.
   */
  const screen = read(`${V2}/ReviewScreen.tsx`);
  ok('the review uses the journey\'s shared isolation contract for Latin names',
    screen.includes("import { Ltr }") && screen.includes('<Ltr>'));
  const bdi = (HTML_FREESTYLE.match(/<bdi/g) ?? []).length;
  ok(`Latin product names are actually isolated in the output (${bdi} isolated runs)`,
    bdi >= 8);
  ok('— including the price, which is Latin currency inside Arabic prose',
    /<bdi[^>]*>\$/.test(HTML_FREESTYLE));

  /*
   * Headings, so the page can be navigated by structure rather than by
   * scrolling. One h2 for the screen, h3 for each part of it.
   */
  const h2 = (HTML_FREESTYLE.match(/<h2/g) ?? []).length;
  const h3 = (HTML_FREESTYLE.match(/<h3/g) ?? []).length;
  ok(`the screen has one heading and real sub-headings under it (h2×${h2}, h3×${h3})`,
    h2 === 1 && h3 >= 3);
  ok('no heading level is skipped on the way down', !/<h4|<h5|<h6/.test(HTML_FREESTYLE));

  /* The parts are a list, so assistive technology can say how many there are. */
  ok('the eight parts are a list, not eight loose divs',
    /<ul[^>]*data-testid="v2-review-parts"/.test(HTML_FREESTYLE)
    && (HTML_FREESTYLE.match(/<li /g) ?? []).length >= 8);

  /* Nothing is hidden behind a disclosure the reader has to find. */
  ok('nothing on the summary is collapsed behind a disclosure',
    !/<details|<summary/.test(HTML_FREESTYLE));

  /* The price is not carried by colour: the warning line has words in it. */
  ok('the unpriced warning is a sentence, not a red number',
    visible(HTML_LONGRANGE).includes(REVIEW.price.unpricedNote)
    && REVIEW.price.unpricedNote.length > 20);
}

// ═══════════════════════════════════════════════════════════════════════════
if (failures.length > 0) {
  console.log(`\n❌ testBuildV2Review: ${failures.length} FAILED of ${passed + failures.length}`);
  for (const f of failures) console.log(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✅ testBuildV2Review: ${passed} assertions passed`);
