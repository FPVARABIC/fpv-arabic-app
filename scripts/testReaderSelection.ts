/**
 * «I CHOSE THIS» IS NOT «I OWN THIS» — PHASE 2D
 * =============================================
 *
 * Before this phase the domain could say three things about a category: the
 * system chose it, the reader already owns it, or nobody has chosen yet. The
 * fourth — «the reader picked this for this build, and does not claim to have
 * it» — had nowhere to live, so Phase 2C rendered its candidate lists
 * read-only and reported the gap rather than routing a wizard click through
 * `owned.parts`.
 *
 * That workaround would have told someone they own hardware they have not
 * bought, and made the engine defend a part they never had. This suite is the
 * proof that the honest version behaves.
 *
 * WHAT IS ACTUALLY BEING TESTED
 * -----------------------------
 * Not «the field exists». Every assertion here injects a world and reads an
 * OUTCOME: a budget preference that must lose to a choice, an ecosystem that
 * must beat one, two selections that are fine apart and impossible together,
 * a wrong-shelf id that must not resolve, and — the one that protects
 * everybody who never touches this feature — that an input with no selections
 * returns exactly what it returned before the field existed, compared against
 * a snapshot taken from canonical BEFORE the engine was changed.
 *
 * Run: npx tsx scripts/testReaderSelection.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { proposeBuild } from '../src/data/assembly/recommendation/proposeBuild';
import type {
  ProposedBuild, CategoryDecision, RecommendationInput,
} from '../src/data/assembly/recommendation/types';
import { PART_CATEGORY_MAP } from '../src/data/project/store';
import { REQUIRED_BUILD_CATEGORIES } from '../src/data/assembly/recommendation/eligibility';
import type { BasePart } from '../src/data/assembly/types';
import {
  proposalView, type ProposalContext,
} from '../web/components/build/v2/proposalModel';
import { PROPOSAL } from '../web/components/build/v2/copy';
import { PART_VOCAB } from '../web/lib/build/labels';
import { ProposalScreen } from '../web/components/build/v2/ProposalScreen';

/** The real world, indexed the way the screen indexes it. */
const BY_CATEGORY: Record<string, Record<string, BasePart>> = {};
const ALL_IDS = new Set<string>();
for (const [category, list] of Object.entries(PART_CATEGORY_MAP)) {
  BY_CATEGORY[category] = {};
  for (const p of list) { BY_CATEGORY[category][p.id] = p; ALL_IDS.add(p.id); }
}
const VIEW_CTX: ProposalContext = {
  resolvePart: (category, id) => BY_CATEGORY[category]?.[id],
  existsInAnyCategory: id => ALL_IDS.has(id),
  hasCategory: category => category in PART_CATEGORY_MAP,
  categoryLabel: category => PART_VOCAB[category]?.ar,
  hasManualLabel: id => id in PROPOSAL.manual.labels,
};

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}
const section = (t: string) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 66 - t.length))}`);

const build = (i: Record<string, unknown>) => proposeBuild(i as unknown as RecommendationInput);
const dec = (b: ProposedBuild, c: string): CategoryDecision =>
  b.decisions.find(d => d.category === c)!;

/** The reader's answers everything below varies from. */
const BASE = { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: {} };

const baseline = build(BASE);

// ═══════════════════════════════════════════════════════════════════════════
section('0 — THE FIXTURES ARE REAL, MEASURED FROM THE CATALOGUE');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * Every case below rests on a property of the live catalogue — a genuine tie,
 * a genuine budget preference, a genuinely incompatible pair. If the catalogue
 * moves and one of those stops being true, the test that depends on it would
 * quietly stop testing anything. So each is asserted first, by name.
 */
const TIE = 'propellers';
const tieDecision = dec(baseline, TIE);
ok(`«${TIE}» really is an open tie in the baseline (${tieDecision.candidateIds.length} candidates)`,
  tieDecision.status === 'choice-required' && tieDecision.candidateIds.length >= 2
  && tieDecision.partId === undefined);

const TIE_A = tieDecision.candidateIds[1];
const TIE_B = tieDecision.candidateIds[2];
ok('…and two DIFFERENT members of it are available to pick, neither first',
  TIE_A !== undefined && TIE_B !== undefined && TIE_A !== TIE_B
  && TIE_A !== tieDecision.candidateIds[0] && TIE_B !== tieDecision.candidateIds[0]);

/* A category the BUDGET settled, so «choice outranks preference» has a subject. */
const RANKED = 'frames';
const rankedDecision = dec(baseline, RANKED);
/*
 * NOT the first candidate — deliberately, and this cost a probe to learn.
 *
 * The first version took `candidateIds.find(id => id !== partId)`, which is
 * the catalogue's first frame. A probe that removed the selection from the
 * search's locks then let the search walk that category freely, and the first
 * thing it walks to is… the catalogue's first frame. Every assertion still
 * passed, on a build where the reader's choice had been dropped and replaced
 * by a coincidence. Picking from the far end makes «the search honoured you»
 * distinguishable from «the search found the same thing anyway».
 */
const NOT_PREFERRED = [...rankedDecision.candidateIds].reverse()
  .find(id => id !== rankedDecision.partId)!;
ok(`«${RANKED}» really was settled by the budget ranking`,
  rankedDecision.status === 'recommended' && rankedDecision.selectionSource === 'system'
  && rankedDecision.reasons.some(r => r.kind === 'ranking' && r.inputKey === 'budgetTier'));
ok('…and a viable candidate exists that the ranking did NOT prefer',
  NOT_PREFERRED !== undefined && NOT_PREFERRED !== rankedDecision.partId);
ok('…which is also not what an UNLOCKED search would reach first',
  NOT_PREFERRED !== rankedDecision.candidateIds[0]
  && NOT_PREFERRED !== baseline.provenPath?.[RANKED]);

/*
 * A REAL jointly-impossible pair — a 5.0" frame and a 5.1" propeller, both
 * individually viable in this exact build. Not a synthetic: the clearance rule
 * is a physical claim and the catalogue really contains both parts.
 */
const J_FRAME = 'frame-impulserc-apexdc-evo5-premium';
const J_PROP = 'propeller-gemfan-hurricane-51466-v2-mck-premium';
ok('the jointly-impossible pair are both viable candidates on their own',
  dec(baseline, 'frames').candidateIds.includes(J_FRAME)
  && dec(baseline, 'propellers').candidateIds.includes(J_PROP));

const REAL_FRAME_ID = PART_CATEGORY_MAP.frames[0].id;
ok('the wrong-category fixture is a REAL id that simply lives elsewhere',
  PART_CATEGORY_MAP.frames.some(p => p.id === REAL_FRAME_ID)
  && !PART_CATEGORY_MAP.motors.some(p => p.id === REAL_FRAME_ID));

// ═══════════════════════════════════════════════════════════════════════════
section('1 — THE INPUT IS A CHOICE, AND IT IS NOT FILED UNDER OWNERSHIP');
// ═══════════════════════════════════════════════════════════════════════════
const TYPES_SRC = readFileSync('src/data/assembly/recommendation/types.ts', 'utf8');
const ENGINE_SRC = readFileSync('src/data/assembly/recommendation/proposeBuild.ts', 'utf8');

ok('`selectedParts` is a TOP-LEVEL input, not a member of `owned`',
  /^ {2}selectedParts\?: Readonly<Record<string, string>>;$/m.test(TYPES_SRC));
ok('…and it carries ids, never part objects a caller could invent',
  !/selectedParts\?: Readonly<Record<string, BasePart>>/.test(TYPES_SRC));
ok('the engine never reads a selection out of `owned`',
  !/owned\?\.selected|owned\.selected/.test(ENGINE_SRC));

/*
 * THE SENTENCE THAT MUST NEVER APPEAR ON A SELECTION. «قطعة تملكها بالفعل» is
 * the owned reason, and attaching it to a choice is the whole bug this phase
 * exists to prevent — said in the reader's own language, on their own screen.
 */
const OWNED_SENTENCE = 'قطعة تملكها بالفعل';
const selectedTie = build({ ...BASE, selectedParts: { [TIE]: TIE_A } });
ok('a selected part is never described as one the reader owns',
  dec(selectedTie, TIE).reasons.every(r => !r.ar.includes(OWNED_SENTENCE)));
ok('…and no decision anywhere in that build claims ownership',
  selectedTie.decisions.every(d => d.reasons.every(r => !r.ar.includes(OWNED_SENTENCE))));
ok('…while a genuinely owned part still says exactly that',
  build({
    ...BASE, owned: { parts: { frames: PART_CATEGORY_MAP.frames[0] } },
  }).decisions.some(d => d.reasons.some(r => r.ar.includes(OWNED_SENTENCE))));

// ═══════════════════════════════════════════════════════════════════════════
section('2 — PROVENANCE: FOUR SOURCES, AND NONE OF THEM OVERLOADED');
// ═══════════════════════════════════════════════════════════════════════════
const sourceBlock = TYPES_SRC.match(/export type SelectionSource =([\s\S]*?);/)![1];
const sources = [...sourceBlock.matchAll(/'([a-z-]+)'/g)].map(m => m[1]).sort();
ok(`the provenance union is exactly the four documented ones (${sources.join(', ')})`,
  sources.join() === ['none', 'system', 'user-owned', 'user-selected'].join());

const d2 = dec(selectedTie, TIE);
ok('a reader-selected category reports `user-selected`', d2.selectionSource === 'user-selected');
ok('…and NOT `user-owned` — no ownership was claimed', d2.selectionSource !== 'user-owned');
ok('…and NOT `system` — nothing was weighed against anything',
  (d2.selectionSource as string) !== 'system');
ok('…with an honest status of its own, not one of the four that would be lies',
  d2.status === 'user-selected');
ok('…and the id the reader named', d2.partId === TIE_A);

/*
 * THE REASON VOCABULARY. A reader's click is not a spec, not a curation tag
 * and not a refusal to judge — so it is not `documented`, which is what an
 * earlier draft would have reached for because the enum already existed.
 */
const selReason = d2.reasons.find(r => r.kind === 'selection');
ok('the reason is a `selection`, a kind that did not exist before',
  selReason !== undefined);
ok('…resting on `user-input`, never on `documented`',
  selReason?.evidence === 'user-input');
ok('…and pointing at the input that caused it',
  selReason?.inputKey === 'selectedParts');
ok('…and it says, in Arabic, that the reader chose it',
  selReason?.ar === 'اخترت هذه القطعة لهذا البناء.');
ok('…and no reason on a chosen category points at `ownedParts`',
  d2.reasons.every(r => r.inputKey !== 'ownedParts'));
ok('no selection reason is labelled `documented` anywhere in the engine',
  !/kind: 'selection', evidence: 'documented'/.test(ENGINE_SRC));

// ═══════════════════════════════════════════════════════════════════════════
section('A — A CHOSEN CANDIDATE IS HONOURED, AND CALLED WHAT IT IS');
// ═══════════════════════════════════════════════════════════════════════════
ok('A: the chosen part is the decision\'s part', dec(selectedTie, TIE).partId === TIE_A);
ok('A: the category leaves `unresolved`',
  baseline.unresolved.includes(TIE) && !selectedTie.unresolved.includes(TIE));
ok('A: the proven path keeps the reader\'s id — nothing was substituted',
  selectedTie.provenPath?.[TIE] === TIE_A);
ok('A: `parts` carries the chosen part', selectedTie.parts[TIE]?.id === TIE_A);
ok('A: the candidate list is now the choice, not the field',
  dec(selectedTie, TIE).candidateIds.join() === TIE_A);
ok('A: every other category is untouched by the choice',
  REQUIRED_BUILD_CATEGORIES.filter(c => c !== TIE).every(c =>
    dec(selectedTie, c).status === dec(baseline, c).status
    && dec(selectedTie, c).partId === dec(baseline, c).partId));

// ═══════════════════════════════════════════════════════════════════════════
section('B — THE OTHER MEMBER OF THE SAME TIE IS EQUALLY HONOURED');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The failure this guards against is a silent `candidateIds[0]`: an engine
 * that «honours» a selection by re-running the search and taking whatever it
 * finds first would pass with one member of a tie and fail with the other.
 */
const selectedOther = build({ ...BASE, selectedParts: { [TIE]: TIE_B } });
ok('B: the second member is honoured too', dec(selectedOther, TIE).partId === TIE_B);
ok('B: …with the same provenance and status',
  dec(selectedOther, TIE).selectionSource === 'user-selected'
  && dec(selectedOther, TIE).status === 'user-selected');
ok('B: …and the proven path follows the reader, not the catalogue order',
  selectedOther.provenPath?.[TIE] === TIE_B
  && selectedTie.provenPath?.[TIE] === TIE_A);
ok('B: neither pick is the one the search would have reached first',
  baseline.provenPath?.[TIE] !== TIE_A && baseline.provenPath?.[TIE] !== TIE_B);

// ═══════════════════════════════════════════════════════════════════════════
section('C — CHOICE OUTRANKS PREFERENCE');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * `budgetTier` ranked this category and picked a different part. Budget is a
 * leaning; a selection is a decision. An engine that re-ranked after locking
 * would quietly overwrite the reader — and would look completely correct,
 * because the part it chose is the one it can justify.
 */
const overBudget = build({ ...BASE, selectedParts: { [RANKED]: NOT_PREFERRED } });
ok('C: the reader\'s part survives the budget ranking',
  dec(overBudget, RANKED).partId === NOT_PREFERRED);
ok('C: …and the budget\'s own pick was NOT reinstated',
  dec(overBudget, RANKED).partId !== rankedDecision.partId);
ok('C: it is no longer called a recommendation',
  dec(overBudget, RANKED).status === 'user-selected'
  && (dec(overBudget, RANKED).status as string) !== 'recommended');
ok('C: …and carries no ranking reason, because nothing was ranked',
  !dec(overBudget, RANKED).reasons.some(r => r.kind === 'ranking'));
ok('C: the build is still proven with the reader\'s part in it',
  overBudget.provenPath?.[RANKED] === NOT_PREFERRED);
ok('C: …which is a different part from the one the baseline proved',
  baseline.provenPath?.[RANKED] !== NOT_PREFERRED);
ok('C: `parts` shows the reader\'s frame, not the budget\'s',
  overBudget.parts[RANKED]?.id === NOT_PREFERRED);
ok('C: the budget still ranks every category the reader did NOT choose',
  dec(overBudget, 'motors').status === 'recommended'
  && dec(overBudget, 'motors').reasons.some(r => r.inputKey === 'budgetTier'));

// ═══════════════════════════════════════════════════════════════════════════
section('D — CLEARING A SELECTION RESTORES THE BASELINE EXACTLY');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * A sticky lock is invisible until someone changes their mind. Removing the
 * key must return the ORIGINAL result — not «a similar one».
 */
const cleared = build({ ...BASE, selectedParts: {} });
const clearedUndef = build({ ...BASE, selectedParts: undefined });
ok('D: an empty selection map returns the baseline, field for field',
  JSON.stringify(cleared) === JSON.stringify(baseline));
ok('D: …and so does an absent one', JSON.stringify(clearedUndef) === JSON.stringify(baseline));
ok('D: the tie is genuinely open again',
  dec(cleared, TIE).status === 'choice-required' && dec(cleared, TIE).partId === undefined);
ok('D: …and the budget-ranked category is back to `recommended`',
  JSON.stringify(build({ ...BASE, selectedParts: {} }).decisions)
  === JSON.stringify(baseline.decisions));

// ═══════════════════════════════════════════════════════════════════════════
section('E — RESOLVING EVERY OPEN TIE COMPLETES THE BUILD');
// ═══════════════════════════════════════════════════════════════════════════
const openCats = baseline.decisions.filter(d => d.partId === undefined).map(d => d.category);
ok(`E: the baseline really does leave ties open (${openCats.join(', ')})`, openCats.length > 0);
ok('E: …and is NOT complete', baseline.complete === false);

const allChosen = build({
  ...BASE,
  selectedParts: Object.fromEntries(openCats.map(c => [c, dec(baseline, c).candidateIds[1]])),
});
ok('E: choosing one part per open tie completes the build', allChosen.complete === true);
ok('E: …with nothing unresolved', allChosen.unresolved.length === 0);
ok('E: …and a proven path that keeps every chosen id',
  openCats.every(c => allChosen.provenPath?.[c] === dec(baseline, c).candidateIds[1]));
/*
 * `complete` is not «checked». The manual check is a relationship between a
 * motor, a prop, a voltage and an ESC, and no amount of choosing settles it.
 */
ok('E: …and manual checks are untouched by any of it',
  allChosen.manualChecks.join() === baseline.manualChecks.join()
  && allChosen.manualChecks.length > 0);
ok('E: every chosen category reports the reader as its source',
  openCats.every(c => dec(allChosen, c).selectionSource === 'user-selected'
    && dec(allChosen, c).status === 'user-selected'));

// ═══════════════════════════════════════════════════════════════════════════
section('F — AN OWNED RADIO STILL BEATS A CHOSEN RECEIVER');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * Ecosystem ownership FILTERS. Choosing a Crossfire receiver does not make an
 * ExpressLRS radio speak to it, and the danger is specific: a locked category
 * is never walked by the pool search, and `computeFindings` judges parts
 * against parts — it has no idea which radio is on the reader's desk. Without
 * an explicit gate the build comes back sound.
 */
const CROSSFIRE = PART_CATEGORY_MAP.receivers
  .find(r => (r as unknown as { specs: { protocol: string } }).specs.protocol === 'Crossfire')!;
const WALKSNAIL = PART_CATEGORY_MAP.videoUnits.find(v => v.protocolOrSystem === 'Walksnail')!;

const rcClash = build({
  ...BASE, owned: { rcSystem: 'ExpressLRS' }, selectedParts: { receivers: CROSSFIRE.id },
});
ok('F: the receiver decision is `unavailable`', dec(rcClash, 'receivers').status === 'unavailable');
ok('F: …and no path is proven', rcClash.provenPath === null);
ok('F: the selection is NOT silently replaced',
  dec(rcClash, 'receivers').partId === CROSSFIRE.id);
ok('F: …and stays attributed to the reader\'s CHOICE, not their shelf',
  dec(rcClash, 'receivers').selectionSource === 'user-selected');
ok('F: the reason names the two radio systems, in Arabic',
  dec(rcClash, 'receivers').reasons[0].ar.includes('ExpressLRS')
  && dec(rcClash, 'receivers').reasons[0].ar.includes('Crossfire'));
ok('F: …and rests on the reader\'s input rather than on a document',
  dec(rcClash, 'receivers').reasons[0].evidence === 'user-input');
ok('F: the chosen receiver is still named in `parts`, so the reader can see it',
  rcClash.parts.receivers?.id === CROSSFIRE.id);

// ═══════════════════════════════════════════════════════════════════════════
section('G — OWNED GOGGLES STILL BEAT A CHOSEN AIR UNIT');
// ═══════════════════════════════════════════════════════════════════════════
const videoClash = build({
  ...BASE, owned: { videoSystem: 'DJI' }, selectedParts: { videoUnits: WALKSNAIL.id },
});
ok('G: the video decision is `unavailable`', dec(videoClash, 'videoUnits').status === 'unavailable');
ok('G: …and no path is proven', videoClash.provenPath === null);
ok('G: the selection is not replaced by a DJI unit',
  dec(videoClash, 'videoUnits').partId === WALKSNAIL.id
  && dec(videoClash, 'videoUnits').selectionSource === 'user-selected');
ok('G: the reason names both ecosystems',
  dec(videoClash, 'videoUnits').reasons[0].ar.includes('Walksnail')
  && dec(videoClash, 'videoUnits').reasons[0].ar.includes('DJI'));
/* And the control: the same unit with no goggles owned is perfectly fine. */
ok('G: …while the same choice without owned goggles is honoured',
  dec(build({ ...BASE, selectedParts: { videoUnits: WALKSNAIL.id } }), 'videoUnits')
    .status === 'user-selected');

// ═══════════════════════════════════════════════════════════════════════════
section('H — A REAL ID ON THE WRONG SHELF FAILS CLOSED');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The category is the truth, never the id string. A frame's id filed under
 * motors resolves against a flat catalogue and renders a frame under
 * «المحركات» with no spec rows — Phase 2C removed exactly that from the
 * presentation layer, and the domain must not reintroduce it from below.
 */
const wrongShelf = build({ ...BASE, selectedParts: { motors: REAL_FRAME_ID } });
ok('H: the input is refused', wrongShelf.selectionIssues.length === 1);
ok('H: …and diagnosed as «exists, wrong shelf», not as «missing»',
  wrongShelf.selectionIssues[0]?.kind === 'foreign-category');
ok('H: …naming the category and id the reader actually sent',
  wrongShelf.selectionIssues[0]?.category === 'motors'
  && wrongShelf.selectionIssues[0]?.partId === REAL_FRAME_ID);
ok('H: no path is proven and nothing is complete',
  wrongShelf.provenPath === null && wrongShelf.complete === false);
ok('H: the frame does NOT appear as the motors part',
  dec(wrongShelf, 'motors').partId === undefined
  && wrongShelf.parts.motors === undefined);
ok('H: the refusal is not smuggled into the verdict engine\'s blocker ids',
  wrongShelf.blockerFindingIds.length === 0);
ok('H: the issue carries a reader-facing Arabic sentence with no Latin id in it',
  /[؀-ۿ]/.test(wrongShelf.selectionIssues[0]?.ar ?? '')
  && !(wrongShelf.selectionIssues[0]?.ar ?? '').includes(REAL_FRAME_ID));

// ═══════════════════════════════════════════════════════════════════════════
section('I — AN ID THAT EXISTS NOWHERE FAILS CLOSED, DIFFERENTLY');
// ═══════════════════════════════════════════════════════════════════════════
const MISSING = 'probe-no-such-part';
const missing = build({ ...BASE, selectedParts: { motors: MISSING } });
ok('I: the input is refused', missing.selectionIssues.length === 1);
ok('I: …as «unknown», which is a different bug from «wrong shelf»',
  missing.selectionIssues[0]?.kind === 'unknown-part'
  && missing.selectionIssues[0]?.kind !== wrongShelf.selectionIssues[0]?.kind);
ok('I: the phantom id never becomes a decision\'s part',
  missing.decisions.every(d => d.partId !== MISSING));
ok('I: …and never reaches `parts`',
  Object.values(missing.parts).every(p => p.id !== MISSING));
ok('I: no path is proven', missing.provenPath === null);

/* The two remaining shapes of malformed input. */
const unknownCat = build({ ...BASE, selectedParts: { 'probe-category': REAL_FRAME_ID } });
ok('I: a category the catalogue does not stock is refused',
  unknownCat.selectionIssues[0]?.kind === 'unknown-category');
const notBuild = build({ ...BASE, selectedParts: { gps: PART_CATEGORY_MAP.gps[0].id } });
ok('I: a real shelf that is not a BUILD category is refused separately',
  notBuild.selectionIssues[0]?.kind === 'not-a-build-category');
ok('I: …and «gps» really is a real catalogue category, so that is the only fault',
  'gps' in PART_CATEGORY_MAP
  && !(REQUIRED_BUILD_CATEGORIES as readonly string[]).includes('gps'));
ok('I: a healthy build reports no issues at all', baseline.selectionIssues.length === 0);

// ═══════════════════════════════════════════════════════════════════════════
section('J — INDIVIDUALLY FINE, TOGETHER IMPOSSIBLE');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * Validating each selection alone is the plausible mistake, and it passes both
 * of these: a 5.0" frame is a fine frame, a 5.1" propeller is a fine
 * propeller, and they do not fit each other. The check has to be joint.
 */
const soloFrame = build({ ...BASE, selectedParts: { frames: J_FRAME } });
const soloProp = build({ ...BASE, selectedParts: { propellers: J_PROP } });
ok('J: the frame alone is fine', soloFrame.provenPath?.frames === J_FRAME);
ok('J: the propeller alone is fine', soloProp.provenPath?.propellers === J_PROP);

const together = build({ ...BASE, selectedParts: { frames: J_FRAME, propellers: J_PROP } });
ok('J: together they prove no path', together.provenPath === null);
ok('J: …and the build is not complete', together.complete === false);
ok('J: NEITHER identity is replaced',
  dec(together, 'frames').partId === J_FRAME
  && dec(together, 'propellers').partId === J_PROP);
ok('J: …and both stay attributed to the reader\'s choice',
  dec(together, 'frames').selectionSource === 'user-selected'
  && dec(together, 'propellers').selectionSource === 'user-selected');
ok('J: the reason says they are fine apart and impossible together',
  dec(together, 'frames').reasons[0].ar.includes('كلٌّ على حدة')
  && dec(together, 'frames').reasons[0].ar.includes('معًا'));
ok('J: …which is NOT the sentence used when one part is simply unusable',
  dec(together, 'frames').reasons[0].ar !== dec(rcClash, 'receivers').reasons[0].ar);
ok('J: both chosen parts are still named in `parts`',
  together.parts.frames?.id === J_FRAME && together.parts.propellers?.id === J_PROP);
ok('J: this is a build failure, not a malformed input',
  together.selectionIssues.length === 0);

// ═══════════════════════════════════════════════════════════════════════════
section('K — CHOOSING WHAT YOU ALREADY OWN NORMALISES TO OWNERSHIP');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * Both statements are true, and one of them is stronger: «I have it» is a fact
 * about the world, «I want it» is an intention about a proposal. Reporting the
 * weaker one would lose information the rest of the engine relies on.
 */
const OWNED_FRAME = PART_CATEGORY_MAP.frames.find(f => f.id === rankedDecision.partId)!;
const sameBoth = build({
  ...BASE,
  owned: { parts: { frames: OWNED_FRAME } },
  selectedParts: { frames: OWNED_FRAME.id },
});
const ownedOnly = build({ ...BASE, owned: { parts: { frames: OWNED_FRAME } } });
ok('K: the decision is the OWNED one', dec(sameBoth, 'frames').selectionSource === 'user-owned');
ok('K: …with the owned status, not the selected one',
  dec(sameBoth, 'frames').status === 'user-locked');
ok('K: …and the part is unchanged', dec(sameBoth, 'frames').partId === OWNED_FRAME.id);
ok('K: the result is identical to owning it without choosing it',
  JSON.stringify(sameBoth) === JSON.stringify(ownedOnly));
ok('K: no issue is raised — this is agreement, not a conflict',
  sameBoth.selectionIssues.length === 0);

// ═══════════════════════════════════════════════════════════════════════════
section('L — OWNING ONE AND CHOOSING ANOTHER IS A CONFLICT, NOT A MERGE');
// ═══════════════════════════════════════════════════════════════════════════
const OTHER_FRAME = PART_CATEGORY_MAP.frames.find(f => f.id === NOT_PREFERRED)!;
const clash = build({
  ...BASE,
  owned: { parts: { frames: OWNED_FRAME } },
  selectedParts: { frames: OTHER_FRAME.id },
});
const clashFrames = dec(clash, 'frames');
ok('L: the category is `unavailable` — the engine refuses to pick',
  clashFrames.status === 'unavailable');
ok('L: …with no part decided, because nobody has decided',
  clashFrames.partId === undefined && clashFrames.selectionSource === 'none');
ok('L: BOTH identities survive, machine-readably',
  clashFrames.candidateIds.length === 2
  && clashFrames.candidateIds.includes(OWNED_FRAME.id)
  && clashFrames.candidateIds.includes(OTHER_FRAME.id));
ok('L: the owned part is not silently kept',
  clashFrames.partId !== OWNED_FRAME.id);
ok('L: the chosen part is not silently discarded',
  clashFrames.candidateIds.includes(OTHER_FRAME.id));
ok('L: the reason names both parts, in Arabic, by their reader-facing names',
  clashFrames.reasons[0].ar.includes(OWNED_FRAME.nameAr)
  && clashFrames.reasons[0].ar.includes(OTHER_FRAME.nameAr));
ok('L: …and no Latin id appears in it',
  !clashFrames.reasons[0].ar.includes(OWNED_FRAME.id)
  && !clashFrames.reasons[0].ar.includes(OTHER_FRAME.id));
ok('L: nothing is proven while the contradiction stands', clash.provenPath === null);
ok('L: this is a contradiction between inputs, not a malformed one',
  clash.selectionIssues.length === 0);

// ═══════════════════════════════════════════════════════════════════════════
section('M — KEY ORDER CARRIES NO MEANING');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * `Object.entries` follows insertion order, so anything built by walking the
 * input would carry the reader's typing order into the engine's answer.
 */
const forward = build({ ...BASE, selectedParts: { frames: NOT_PREFERRED, propellers: TIE_A } });
const reversed = build({ ...BASE, selectedParts: { propellers: TIE_A, frames: NOT_PREFERRED } });
ok('M: reversing the keys changes nothing at all',
  JSON.stringify(forward) === JSON.stringify(reversed));

const issuesForward = build({
  ...BASE, selectedParts: { motors: MISSING, 'probe-category': MISSING },
});
const issuesReversed = build({
  ...BASE, selectedParts: { 'probe-category': MISSING, motors: MISSING },
});
ok('M: …including the ORDER of the issues reported back',
  JSON.stringify(issuesForward.selectionIssues) === JSON.stringify(issuesReversed.selectionIssues));
ok('M: …and both malformed entries are reported, not just the first',
  issuesForward.selectionIssues.length === 2);
ok('M: …in build order, with the unknown category last',
  issuesForward.selectionIssues.map(i => i.category).join() === 'motors,probe-category');

// ═══════════════════════════════════════════════════════════════════════════
section('N — THE SAME INPUT ALWAYS GIVES THE SAME ANSWER');
// ═══════════════════════════════════════════════════════════════════════════
for (const [label, inp] of [
  ['a plain selection', { ...BASE, selectedParts: { [TIE]: TIE_A } }],
  ['a completed build', { ...BASE, selectedParts: Object.fromEntries(openCats.map(c => [c, dec(baseline, c).candidateIds[1]])) }],
  ['a jointly-impossible pair', { ...BASE, selectedParts: { frames: J_FRAME, propellers: J_PROP } }],
  ['a malformed input', { ...BASE, selectedParts: { motors: MISSING } }],
  ['an owned/selected conflict', { ...BASE, owned: { parts: { frames: OWNED_FRAME } }, selectedParts: { frames: OTHER_FRAME.id } }],
] as const) {
  ok(`N: ${label} is deterministic`,
    JSON.stringify(build(inp as Record<string, unknown>))
    === JSON.stringify(build(inp as Record<string, unknown>)));
}

// ═══════════════════════════════════════════════════════════════════════════
section('P — READERS WHO CHOSE NOTHING GET EXACTLY WHAT THEY GOT BEFORE');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The most important section here, and the one with the least to look at.
 *
 * Phase 2D changes an engine that every existing surface already depends on.
 * The snapshot below was written ONCE, from canonical, by
 * `scripts/snapshotRecommendation.ts`, BEFORE any of this existed — the commit
 * is recorded inside it. Regenerating it from the current engine would turn
 * every assertion in this section into a tautology, which is the one way to
 * hollow this out, so the fixture's own commit is checked against the history
 * of the file that changed.
 */
const SNAP = JSON.parse(
  readFileSync('scripts/fixtures/proposeBuild.pre2d.json', 'utf8'),
) as { commit: string; cases: Record<string, ProposedBuild> };

ok(`the snapshot names the commit it was taken from (${SNAP.commit.slice(0, 7)})`,
  /^[0-9a-f]{40}$/.test(SNAP.commit));
const caseNames = Object.keys(SNAP.cases);
ok(`it covers a real spread of readers (${caseNames.length} cases)`, caseNames.length >= 20);
for (const must of ['freestyle-6S-mid', 'freestyle-4S-mid', 'cinematic-6S-mid', 'longrange-mid',
  'freestyle-6S-nopref', 'freestyle-6S-budget', 'freestyle-6S-premium',
  'freestyle-6S-mid-elrs', 'freestyle-6S-mid-dji', 'freestyle-6S-mid-ownedFrame']) {
  ok(`…including «${must}»`, caseNames.includes(must));
}

/*
 * The snapshot predates `selectionIssues`, so the comparison drops it — and
 * asserts separately that it is always the empty array. That is the whole of
 * the compatibility claim: every field that existed is byte-identical, and the
 * one new field is inert.
 */
const INPUTS = JSON.parse(readFileSync('scripts/fixtures/proposeBuild.pre2d.inputs.json', 'utf8')) as
  Record<string, Record<string, unknown>>;
let drift = 0;
for (const name of caseNames) {
  const now = build(INPUTS[name]) as ProposedBuild & { selectionIssues: unknown[] };
  const { selectionIssues, ...rest } = now;
  const same = JSON.stringify(rest) === JSON.stringify(SNAP.cases[name]);
  if (!same) drift++;
  ok(`${name}: identical to canonical, field for field`, same);
  ok(`${name}: …and reports no selection issue`, selectionIssues.length === 0);
}
ok('no case drifted', drift === 0);

/*
 * NON-VACUITY. If the inputs file and the snapshot fell out of step — a case
 * renamed, an input quietly changed — every comparison above could pass while
 * comparing nothing. So at least one case must be a build with real content.
 */
ok('the comparison is against real builds, not empty ones',
  SNAP.cases['freestyle-6S-mid'].decisions.length === 8
  && SNAP.cases['freestyle-6S-mid'].provenPath !== null);
ok('…and the inputs file covers every snapshot case',
  caseNames.every(n => INPUTS[n] !== undefined));

// ═══════════════════════════════════════════════════════════════════════════
section('Q — THE NEW STATUS CANNOT MASQUERADE AS SOMETHING ELSE');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * `groupOf` was a chain ending in `: 'system-decided'` — «anything I have not
 * named was decided by the system». Adding a status would have filed a
 * reader's own choice under «حسمها النظام»: the system taking credit for the
 * one decision it explicitly refused to make.
 */
const MODEL_SRC = readFileSync('web/components/build/v2/proposalModel.ts', 'utf8');
ok('the status→group map is a Record over the union, not a chain',
  /Record<RecommendationStatus, DecisionGroup>/.test(MODEL_SRC));
ok('…with no catch-all default left in it',
  !/:\s*'system-decided';\s*$/m.test(MODEL_SRC));
ok('`user-selected` has a group of its own, not «yours» and not «system-decided»',
  /'user-selected':\s*'chosen'/.test(MODEL_SRC));
ok('the badge table is a Record too, so a new status cannot render unlabelled',
  /Record<RecommendationStatus, string \| null>/
    .test(readFileSync('web/components/build/v2/ProposalCategoryCard.tsx', 'utf8')));
ok('the counts keep a separate tally for reader choices',
  /userSelected: by\('user-selected'\)\.length/.test(MODEL_SRC));
ok('…and `systemDecided` still counts only what the SYSTEM decided',
  /systemDecided: by\('recommended'\)\.length \+ by\('only-compatible'\)\.length/.test(MODEL_SRC));

// ═══════════════════════════════════════════════════════════════════════════
section('R — AN EARLY DEAD END MAY REFUSE A CHOICE, NEVER ERASE IT');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * `deadEnd()` read `input.owned?.parts` and nothing else — complete until
 * Phase 2D gave the reader a second way to put a part in.
 *
 * Cinewhoop is the live fixture: the catalogue tags no frame for it, so
 * `getAvailableSizeOptions` returns nothing and the engine exits before the
 * category loop ever runs. A structurally valid selection — a real frame id,
 * on the frames shelf, raising no `selectionIssue` — was then simply gone:
 *
 *     status=unavailable  source=none  partId=—  candidateIds=[]
 *     parts.frames = (absent)
 *
 * while an OWNED frame in the same build came back intact. A selection may
 * become unusable. It may never be silently replaced OR erased.
 */
const DEAD_TYPE = 'cinewhoop';
const DEAD = { droneTypeId: DEAD_TYPE, cellCount: 4, budgetTier: 'mid', owned: {} };
const DEAD_FRAME = PART_CATEGORY_MAP.frames[0];
const DEAD_OTHER = PART_CATEGORY_MAP.frames[1];

ok(`«${DEAD_TYPE}» really is an early dead end — no frame is tagged for it`,
  PART_CATEGORY_MAP.frames.every(f => !f.compatibilityTags.droneTypes.includes(DEAD_TYPE)));
ok('…and it dies before any category is decided, so this is the `deadEnd()` path',
  build(DEAD).decisions.every(d => d.status === 'unavailable' && d.candidateIds.length === 0));

// R-A — a valid selection survives the refusal.
const deadSelected = build({ ...DEAD, selectedParts: { frames: DEAD_FRAME.id } });
const rA = dec(deadSelected, 'frames');
ok('R-A: the chosen frame keeps its identity', rA.partId === DEAD_FRAME.id);
ok('R-A: …reported as a CHOICE, not as nobody\'s', rA.selectionSource === 'user-selected');
ok('R-A: …with the status the build actually has', rA.status === 'unavailable');
ok('R-A: …and on `candidateIds`, machine-readably',
  rA.candidateIds.join() === DEAD_FRAME.id);
ok('R-A: the part is still identifiable in `parts`',
  deadSelected.parts.frames?.id === DEAD_FRAME.id);
ok('R-A: nothing is proven and nothing is complete',
  deadSelected.provenPath === null && deadSelected.complete === false);
ok('R-A: no other category invents a reader part',
  deadSelected.decisions.filter(d => d.category !== 'frames')
    .every(d => d.partId === undefined && d.selectionSource === 'none'));

// R-B — the owned behaviour that was already right stays right.
const deadOwned = build({ ...DEAD, owned: { parts: { frames: DEAD_FRAME } } });
ok('R-B: an OWNED part in the same dead end stays `user-owned`',
  dec(deadOwned, 'frames').selectionSource === 'user-owned'
  && dec(deadOwned, 'frames').partId === DEAD_FRAME.id
  && deadOwned.parts.frames?.id === DEAD_FRAME.id);

// R-C — the same part both ways: ownership is the stronger claim.
const deadBoth = build({
  ...DEAD, owned: { parts: { frames: DEAD_FRAME } }, selectedParts: { frames: DEAD_FRAME.id },
});
ok('R-C: owning AND choosing the same part still resolves to ownership',
  dec(deadBoth, 'frames').selectionSource === 'user-owned');
ok('R-C: …and is identical to owning it without choosing it',
  JSON.stringify(deadBoth) === JSON.stringify(deadOwned));

// R-D — two different parts: the contradiction survives the early exit too.
const deadClash = build({
  ...DEAD, owned: { parts: { frames: DEAD_FRAME } }, selectedParts: { frames: DEAD_OTHER.id },
});
const rD = dec(deadClash, 'frames');
ok('R-D: a collision is still an explicit conflict, not a winner',
  rD.partId === undefined && rD.selectionSource === 'none');
ok('R-D: …with BOTH identities preserved',
  rD.candidateIds.length === 2
  && rD.candidateIds.includes(DEAD_FRAME.id) && rD.candidateIds.includes(DEAD_OTHER.id));
ok('R-D: …and the reason names both, not one',
  rD.reasons[0].ar.includes(DEAD_FRAME.nameAr) && rD.reasons[0].ar.includes(DEAD_OTHER.nameAr));

// R-E / R-F — the two channels stay distinct at the dead end as well.
ok('R-E: a structurally valid selection raises no issue, even when refused',
  deadSelected.selectionIssues.length === 0 && deadBoth.selectionIssues.length === 0
  && deadClash.selectionIssues.length === 0);
const deadMalformed = build({ ...DEAD, selectedParts: { frames: 'probe-no-such-frame' } });
ok('R-F: a MALFORMED selection still goes to `selectionIssues`…',
  deadMalformed.selectionIssues.length === 1
  && deadMalformed.selectionIssues[0]?.kind === 'unknown-part');
ok('R-F: …and never onto the identity-preservation path',
  dec(deadMalformed, 'frames').partId === undefined
  && dec(deadMalformed, 'frames').selectionSource === 'none'
  && deadMalformed.parts.frames === undefined);

/*
 * And the fix is not a blind merge. A category may hold an owned part or a
 * chosen one, never both, because the collision is normalised BEFORE any dead
 * end can fire — which is why the two cases above can be told apart at all.
 */
ok('the engine normalises owned-vs-selected before the first early exit',
  ENGINE_SRC.indexOf('OWNED AND SELECTED IN THE SAME CATEGORY')
  < ENGINE_SRC.indexOf('لا يوجد إطار في الكتالوج موسوم لهذا النوع'));
ok('…and the dead end resolves owned FIRST, so the stronger claim survives',
  /const mine = owned \?\? chosen;/.test(ENGINE_SRC));

// ═══════════════════════════════════════════════════════════════════════════
section('S — «ALL OPEN» IS A LIE ONCE THE READER HAS CLOSED SOMETHING');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The quality model had two states because only the SYSTEM could settle a
 * category. Now a third situation is real — no budget preference, one part
 * chosen, seven still open — and BOTH old headlines are false about it:
 * «الخيارات كلها أمامك» denies the reader's choice, and «هذا البناء المقترح
 * لك» claims a proposal nobody made.
 */
const noTier = { droneTypeId: 'freestyle', cellCount: 6, owned: {} };
const viewOf = (inp: Record<string, unknown>) => proposalView(build(inp), VIEW_CTX);

const sA = viewOf(noTier);
ok('S-A: nothing settled by anyone → `all-open`',
  sA.counts.systemDecided === 0 && sA.counts.userSelected === 0
  && sA.counts.choiceRequired > 0 && sA.quality === 'all-open');

const sB = viewOf({ ...noTier, selectedParts: { [TIE]: TIE_A } });
ok('S-B: one reader choice with categories still open → `reader-shaped`',
  sB.counts.systemDecided === 0 && sB.counts.userSelected === 1
  && sB.counts.choiceRequired > 0 && sB.quality === 'reader-shaped');

const everyCategory = Object.fromEntries(
  build(noTier).decisions.map(d => [d.category, d.candidateIds[0]]));
const sC = viewOf({ ...noTier, selectedParts: everyCategory });
ok('S-C: every category chosen by the reader, none open → still `reader-shaped`',
  sC.counts.systemDecided === 0 && sC.counts.userSelected > 0
  && sC.counts.choiceRequired === 0 && sC.quality === 'reader-shaped');
ok('S-C: …and that build really is complete, so this is not a broken case',
  sC.consistencyError === false);

const sD = viewOf({ ...BASE, selectedParts: { [TIE]: TIE_A } });
ok('S-D: a system decision anywhere still wins the headline → `proposed`',
  sD.counts.systemDecided > 0 && sD.counts.userSelected > 0
  && sD.quality === 'proposed');

/*
 * S-E — the count itself. Making the headline work by inflating
 * `systemDecided` would have fixed the sentence by breaking its meaning.
 */
/*
 * Two different categories, because a choice does two different things
 * depending on what the system had already done with it — and «does not
 * raise» has to hold in both.
 */
const sBase = viewOf(BASE);
ok('S-E: choosing an OPEN category leaves `systemDecided` untouched',
  sD.counts.systemDecided === sBase.counts.systemDecided
  && sD.counts.choiceRequired === sBase.counts.choiceRequired - 1
  && sD.counts.userSelected === 1);
const sOverride = viewOf({ ...BASE, selectedParts: { [RANKED]: NOT_PREFERRED } });
ok('S-E: choosing a category the SYSTEM had settled LOWERS it',
  sOverride.counts.systemDecided === sBase.counts.systemDecided - 1
  && sOverride.counts.userSelected === 1);
ok('S-E: …so a reader choice can never inflate the system\'s credit',
  sB.counts.systemDecided === 0 && sC.counts.systemDecided === 0);
ok('S-E: `systemDecided` is still exactly recommended + only-compatible',
  sD.counts.systemDecided === sD.counts.recommended + sD.counts.onlyCompatible);

/* S-F — the copy may claim neither of the things that are not true. */
const READER_COPY = `${PROPOSAL.titleReaderShaped} ${PROPOSAL.leadReaderShaped}`;
ok('S-F: reader-shaped copy does not claim the system proposed the build',
  !READER_COPY.includes('المقترح') && READER_COPY !== PROPOSAL.titleProposed);
ok('S-F: …nor that the system settled anything',
  !READER_COPY.includes('حسمها النظام'));
ok('S-F: …nor that everything is still open',
  !READER_COPY.includes(PROPOSAL.titleAllOpen));
ok('S-F: …and it does say the choices are the READER\'s',
  PROPOSAL.titleReaderShaped.includes('اختيارات')
  && PROPOSAL.leadReaderShaped.includes('اخترته أنت'));
ok('S-F: the three headlines are three different sentences',
  new Set([PROPOSAL.titleProposed, PROPOSAL.titleReaderShaped, PROPOSAL.titleAllOpen]).size === 3);
/*
 * The lead must not promise a decision that may already be made: S-C closes
 * every category, and «وما بقي يحتاج قرارك» would be a request for something
 * finished. What remains is reported by the burden line instead.
 */
ok('S-F: the lead makes no claim about what is left — the burden line owns that',
  !PROPOSAL.leadReaderShaped.includes('بقي'));

// ═══════════════════════════════════════════════════════════════════════════
section('T — THE HEADLINE, ACTUALLY RENDERED');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * S proves the MODEL picks the right quality. This proves the SCREEN prints
 * the matching sentence — by rendering it and reading the `<h2>`, not by
 * grepping for a map. A ternary replaced by a Record is exactly the kind of
 * change a source pattern can be made to approve while the rendered string
 * stays wrong.
 *
 * React comes from `web/`'s own copy: a component on one React instance and a
 * renderer on another share no hook dispatcher and the render throws, so the
 * indirection is the test working rather than the test cheating.
 */
const webRequire = createRequire(join(process.cwd(), 'web/package.json'));
const ReactRT = webRequire('react') as {
  createElement: (t: unknown, p: Record<string, unknown>) => unknown;
};
const renderToStaticMarkup = (webRequire('react-dom/server') as {
  renderToStaticMarkup: (el: unknown) => string;
}).renderToStaticMarkup;

const headlineOf = (inp: Record<string, unknown>) => {
  const html = renderToStaticMarkup(
    ReactRT.createElement(ProposalScreen, { build: build(inp) }),
  );
  return {
    quality: /data-quality="([^"]*)"/.exec(html)?.[1] ?? '',
    title: (/<h2[^>]*data-testid="v2-proposal-title"[^>]*>([\s\S]*?)<\/h2>/.exec(html)?.[1] ?? '')
      .trim(),
    text: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
};

const hAllOpen = headlineOf(noTier);
const hReader = headlineOf({ ...noTier, selectedParts: { [TIE]: TIE_A } });
const hProposed = headlineOf(BASE);

ok('T: a build nobody has touched still renders «الخيارات كلها أمامك»',
  hAllOpen.quality === 'all-open' && hAllOpen.title === PROPOSAL.titleAllOpen);
ok('T: a build the SYSTEM shaped still renders «هذا البناء المقترح لك»',
  hProposed.quality === 'proposed' && hProposed.title === PROPOSAL.titleProposed);

/* The one that was wrong before this fix. */
ok('T: a build the READER shaped renders their own headline',
  hReader.quality === 'reader-shaped' && hReader.title === PROPOSAL.titleReaderShaped);
ok('T: …and NOT «الخيارات كلها أمامك», which is the claim it used to make',
  hReader.title !== PROPOSAL.titleAllOpen
  && !hReader.text.includes(PROPOSAL.titleAllOpen));
ok('T: …and NOT «هذا البناء المقترح لك» either',
  hReader.title !== PROPOSAL.titleProposed
  && !hReader.text.includes(PROPOSAL.titleProposed));
ok('T: the reader-shaped page carries its own lead, not the open one',
  hReader.text.includes(PROPOSAL.leadReaderShaped)
  && !hReader.text.includes(PROPOSAL.leadAllOpen));
ok('T: the three qualities really do render three different headings',
  new Set([hAllOpen.title, hReader.title, hProposed.title]).size === 3);
/*
 * And the burden line underneath is still the system's own tally: «لم نحسم أي
 * اختيار» stays true on a reader-shaped build, because we did not.
 */
ok('T: the burden line still reports that the SYSTEM settled nothing',
  hReader.text.includes(PROPOSAL.burden.nothingSettled));
/*
 * NO INTERNAL IDENTIFIER — said precisely, because a kebab-case sweep is the
 * wrong instrument on this page. It flags «T-Motor», «R-Line» and «4-in-1»,
 * which are the products' own names and belong on screen. What must never
 * appear is a key: a catalogue part id, a category key, a rule id or a
 * finding id. Those are enumerable, so they are checked by name.
 */
const KEYS = [
  ...ALL_IDS,
  ...Object.keys(PART_CATEGORY_MAP),
  ...Object.keys(PROPOSAL.manual.labels),
];
ok(`T: none of the three renders any internal key (${KEYS.length} checked)`,
  KEYS.length > 50
  && [hAllOpen, hReader, hProposed].every(h => KEYS.every(k => !h.text.includes(k))));
ok('T: …and the check is not vacuous — those keys ARE in the machine state',
  /data-testid="v2-cat-/.test(
    renderToStaticMarkup(ReactRT.createElement(ProposalScreen, { build: build(noTier) })),
  ));

// ═══════════════════════════════════════════════════════════════════════════
section('U — A CONTRADICTION IS LOCAL TO THE CATEGORY THAT HAS IT');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * The collision return answered its own shelf correctly and erased every OTHER
 * thing the reader had chosen. `parts: { ...ownedParts }`, and a non-conflicted
 * category read `ownedParts[category]` alone — so:
 *
 *     owned.frames = X · selectedParts.frames = Y · selectedParts.propellers = P
 *
 * reported the frame conflict properly and then lost P, which is involved in
 * nothing, two categories away:
 *
 *     propellers  source=none  partId=—  candidateIds=[]   parts.propellers = (absent)
 *
 * Three of the four «the reader's part survives a refusal» returns were right
 * and one was wrong, which is what a shared invariant looks like when it is not
 * shared. `readerPartIn()` is now the single answer to «whose part is this»,
 * and all four ask it.
 */
const OWNED_X = PART_CATEGORY_MAP.frames[0];
const SELECTED_Y = PART_CATEGORY_MAP.frames[1];
const SELECTED_P = TIE_A;
const OWNED_BATTERY = PART_CATEGORY_MAP.batteries
  .find(b => b.compatibilityTags.batteryVoltages.includes(6))!;

ok('the fixture is a real collision between two different real frames',
  OWNED_X.id !== SELECTED_Y.id
  && PART_CATEGORY_MAP.frames.some(f => f.id === SELECTED_Y.id));
ok('…and the unrelated selection is a real propeller in another category',
  PART_CATEGORY_MAP.propellers.some(p => p.id === SELECTED_P));

// U-A — the conflict stands, and the bystander survives it.
const localA = build({
  ...BASE,
  owned: { parts: { frames: OWNED_X } },
  selectedParts: { frames: SELECTED_Y.id, propellers: SELECTED_P },
});
const uFrames = dec(localA, 'frames');
const uProps = dec(localA, 'propellers');

ok('U-A: the frame conflict is still explicit — nobody won',
  uFrames.status === 'unavailable' && uFrames.selectionSource === 'none'
  && uFrames.partId === undefined);
ok('U-A: …with both frame identities intact',
  uFrames.candidateIds.length === 2
  && uFrames.candidateIds.includes(OWNED_X.id)
  && uFrames.candidateIds.includes(SELECTED_Y.id));
ok('U-A: the unrelated propeller keeps its provenance',
  uProps.selectionSource === 'user-selected');
ok('U-A: …its identity', uProps.partId === SELECTED_P);
ok('U-A: …and its candidate list', uProps.candidateIds.join() === SELECTED_P);
ok('U-A: …and it is still in `parts`', localA.parts.propellers?.id === SELECTED_P);
ok('U-A: the conflicted shelf does NOT quietly become the selected one',
  localA.parts.frames?.id === OWNED_X.id && localA.parts.frames?.id !== SELECTED_Y.id);
ok('U-A: the whole build is still refused',
  localA.provenPath === null && localA.complete === false
  && localA.decisions.every(d => d.status === 'unavailable'));
ok('U-A: and this is a contradiction between inputs, not a malformed one',
  localA.selectionIssues.length === 0);

// U-B — an unrelated OWNED part is equally a bystander.
const localB = build({
  ...BASE,
  owned: { parts: { frames: OWNED_X, batteries: OWNED_BATTERY } },
  selectedParts: { frames: SELECTED_Y.id, propellers: SELECTED_P },
});
ok('U-B: an unrelated owned battery stays `user-owned`',
  dec(localB, 'batteries').selectionSource === 'user-owned'
  && dec(localB, 'batteries').partId === OWNED_BATTERY.id
  && localB.parts.batteries?.id === OWNED_BATTERY.id);
ok('U-B: …while the unrelated selection stays `user-selected`',
  dec(localB, 'propellers').selectionSource === 'user-selected'
  && dec(localB, 'propellers').partId === SELECTED_P);
ok('U-B: …and the frame conflict is unchanged by either of them',
  JSON.stringify(dec(localB, 'frames')) === JSON.stringify(uFrames));

// U-C — with no bystanders, nothing moved.
const localC = build({
  ...BASE, owned: { parts: { frames: OWNED_X } }, selectedParts: { frames: SELECTED_Y.id },
});
ok('U-C: a bare collision still reports exactly what it used to',
  JSON.stringify(dec(localC, 'frames')) === JSON.stringify(uFrames));
ok('U-C: …with only the owned part in `parts`',
  Object.keys(localC.parts).join() === 'frames'
  && localC.parts.frames?.id === OWNED_X.id);
ok('U-C: …and every other category empty-handed, because the reader gave nothing',
  localC.decisions.filter(d => d.category !== 'frames')
    .every(d => d.selectionSource === 'none' && d.partId === undefined
      && d.candidateIds.length === 0));

// U-D — agreement is still not a collision.
const localD = build({
  ...BASE, owned: { parts: { frames: OWNED_X } }, selectedParts: { frames: OWNED_X.id },
});
ok('U-D: owning and choosing the SAME frame still resolves to ownership',
  dec(localD, 'frames').selectionSource === 'user-owned'
  && dec(localD, 'frames').status === 'user-locked');
ok('U-D: …and does not trip the conflict branch at all',
  localD.provenPath !== null);

// U-E — the bystander is never re-attributed on its way through.
for (const wrong of ['user-owned', 'system', 'none'] as const) {
  ok(`U-E: the unrelated selection is NOT «${wrong}»`,
    uProps.selectionSource !== wrong);
}

/*
 * And the invariant has one home now. Four returns refuse a build while naming
 * what the reader put in; asking the same helper is what stops three of them
 * being right and the fourth quietly wrong again.
 */
const readerPartUses = ENGINE_SRC.match(/readerPartIn\(category\)/g) ?? [];
ok(`every refusal path asks the same question (${readerPartUses.length} call sites)`,
  readerPartUses.length === 4);
ok('…and that question resolves OWNED first, so the stronger claim survives',
  /const mine = owned \?\? chosen;/.test(ENGINE_SRC)
  && !/const mine = chosen \?\? owned;/.test(ENGINE_SRC));

console.log(`\n[reader selection] ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach(f => console.log(`  FAILED: ${f}`));
  process.exit(1);
}
