/**
 * BUILD V2 PHASE 2C — THE PROPOSAL, AND WHAT IT IS ALLOWED TO CLAIM
 * =================================================================
 *
 * The first screen in V2 that shows a part. Everything on it is a claim about
 * what the system decided and why, so this suite is mostly about restraint:
 *
 *   · «اقترحناه لك», never «الأفضل» — nothing in the data ranks products
 *   · «الخيار الوحيد المتوافق في الكتالوج», never «أفضل خيار» — and never a
 *     statement about the market
 *   · a `choice-required` category shows EVERY surviving candidate with NONE
 *     preferred: not `candidateIds[0]`, and not the `provenPath` member, which
 *     proves a build exists and broke each tie arbitrarily to do it
 *   · no reader selection at all, because the domain cannot represent
 *     «chose but does not own»
 *   · no «متوافق بالكامل» while a manual check is open
 *
 * It also PRINTS the decision burden for every representative build, because
 * the question Phase 2C exists to answer — did V2 reduce the decisions or just
 * move them? — is a measurement, not an opinion.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testBuildV2Proposal.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { proposeBuild } from '../src/data/assembly/recommendation/proposeBuild';
import type { ProposedBuild } from '../src/data/assembly/recommendation/types';
import { PART_CATEGORY_MAP } from '../src/data/project/store';
import { proposalView, proposalBurdenAr, groupOf } from '../web/components/build/v2/proposalModel';
import { arabicCount, CHOICE_NOUN, arabicNumber } from '../web/components/build/v2/arabicCount';
import { partFacts } from '../web/components/build/v2/partFacts';
import { PROPOSAL, SUMMARY } from '../web/components/build/v2/copy';
import { readinessOf } from '../web/components/build/v2/readiness';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}
const section = (t: string) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 62 - t.length))}`);

const V2 = 'web/components/build/v2';
const read = (p: string) => readFileSync(p, 'utf8');
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const src = Object.fromEntries(readdirSync(V2).filter(f => /\.tsx?$/.test(f))
  .map(f => [f, code(read(join(V2, f)))]));
const allCode = Object.values(src).join('\n');

const b = (input: Record<string, unknown>) => proposeBuild(input as never);
const FREESTYLE_MID = { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: {} };
const FREESTYLE_NONE = { droneTypeId: 'freestyle', cellCount: 6, owned: {} };
const FREESTYLE_DJI = {
  droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: { videoSystem: 'DJI' },
};
const CINEMATIC_MID = { droneTypeId: 'cinematic', cellCount: 6, budgetTier: 'mid', owned: {} };
const LONGRANGE_MID = { droneTypeId: 'long-range', budgetTier: 'mid', owned: {} };
const CROSSFIRE = {
  droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: { rcSystem: 'Crossfire' },
};

// ═══════════════════════════════════════════════════════════════════════════
section('THE DECISION BURDEN — MEASURED, NOT CLAIMED');
// ═══════════════════════════════════════════════════════════════════════════
const BURDEN_CASES: Array<[string, Record<string, unknown>]> = [
  ['Freestyle · 6S · متوازن', FREESTYLE_MID],
  ['Freestyle · 6S · لا تفضيل', FREESTYLE_NONE],
  ['Freestyle · 6S · متوازن · DJI', FREESTYLE_DJI],
  ['Freestyle · 4S · متوازن', { droneTypeId: 'freestyle', cellCount: 4, budgetTier: 'mid', owned: {} }],
  ['Cinematic · 6S · متوازن', CINEMATIC_MID],
  ['Cinematic · 6S · لا تفضيل', { droneTypeId: 'cinematic', cellCount: 6, owned: {} }],
  ['Long-range · متوازن', LONGRANGE_MID],
  ['Long-range · لا تفضيل', { droneTypeId: 'long-range', owned: {} }],
];
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
console.log(`  ${pad('build', 32)}req rec only choice lock unav manual  quality`);
for (const [label, input] of BURDEN_CASES) {
  const v = proposalView(b(input));
  const c = v.counts;
  console.log(`  ${pad(label, 32)}${pad(String(c.required), 4)}${pad(String(c.recommended), 4)}`
    + `${pad(String(c.onlyCompatible), 5)}${pad(String(c.choiceRequired), 7)}`
    + `${pad(String(c.userLocked), 5)}${pad(String(c.unavailable), 5)}`
    + `${pad(String(c.manualChecks), 8)}${v.quality}`);
  console.log(`  ${' '.repeat(32)}→ ${proposalBurdenAr(c, PROPOSAL.burden, n => arabicCount(n, CHOICE_NOUN))}`);
}

// ═══════════════════════════════════════════════════════════════════════════
section('1 — ONLY A READY BUILD MAY OPEN THE PROPOSAL');
// ═══════════════════════════════════════════════════════════════════════════
const preview = src['BuildV2Preview.tsx'];
ok('the door is the readiness state itself', /readiness\.state === 'ready' && \(/.test(preview));
ok('there is exactly one way in', (preview.match(/setScreen\('proposal'\)/g) ?? []).length === 1);
ok('the proposal screen renders only on that screen name',
  /screen === 'proposal' && build && <ProposalScreen/.test(preview));

/*
 * The three readiness states, checked at the source rather than trusted: an
 * unsure ecosystem and a dead build are BOTH non-ready, so neither can reach
 * the one condition that opens the door.
 */
const viable = b(FREESTYLE_MID);
ok('an explicitly unsure radio is not ready — so it cannot open the proposal',
  readinessOf(viable, { answer: 'radio', rc: { kind: 'unsure' } }).state
    === 'needs-equipment-identification');
ok('an explicitly unsure goggle system likewise',
  readinessOf(viable, { answer: 'goggles', video: { kind: 'unsure' } }).state
    === 'needs-equipment-identification');
ok('a build with no proven path is not ready either',
  readinessOf(b(CROSSFIRE), { answer: 'none' }).state === 'no-viable-build');
ok('and the ordinary case is', readinessOf(viable, { answer: 'none' }).state === 'ready');

// ═══════════════════════════════════════════════════════════════════════════
section('2 — THE COUNTS ARE DERIVED FROM THE DECISIONS');
// ═══════════════════════════════════════════════════════════════════════════
for (const [label, input] of BURDEN_CASES) {
  const build = b(input);
  const c = proposalView(build).counts;
  const real = (s: string) => build.decisions.filter(d => d.status === s).length;
  ok(`${label}: every count matches the engine`,
    c.recommended === real('recommended') && c.onlyCompatible === real('only-compatible')
    && c.choiceRequired === real('choice-required') && c.userLocked === real('user-locked')
    && c.unavailable === real('unavailable') && c.required === build.decisions.length
    && c.systemDecided === real('recommended') + real('only-compatible')
    && c.manualChecks === build.manualChecks.length);
}
/*
 * The grouping is a PARTITION: every decision lands in exactly one group, and
 * the mapping is by status, not by category. A category quietly dropped from
 * all four groups would vanish from the screen without failing anything else.
 */
for (const [label, input] of BURDEN_CASES) {
  const build = b(input);
  const v = proposalView(build);
  const placed = Object.values(v.groups).flat();
  ok(`${label}: every decision is placed exactly once`,
    placed.length === build.decisions.length
    && new Set(placed.map(d => d.category)).size === build.decisions.length
    && placed.every(d => v.groups[groupOf(d.status)].includes(d)));
}
ok('the four statuses map to the groups a reader can act on',
  groupOf('choice-required') === 'needs-you' && groupOf('recommended') === 'system-decided'
  && groupOf('only-compatible') === 'system-decided' && groupOf('user-locked') === 'yours'
  && groupOf('unavailable') === 'problem');

ok('no count is written into the copy',
  !/[0-9٠-٩]/.test(JSON.stringify(PROPOSAL.burden) + JSON.stringify(PROPOSAL.groups)));

/*
 * ARABIC COUNTS ARE NOT ENGLISH COUNTS. The engine returns 0-8 on either side
 * of the burden sentence, so the singular, the dual, the 3-10 plural and the
 * 11+ accusative are all reachable — and «٦ اختيار» or «٢ اختيارات» is the
 * tell that nobody who reads Arabic read the screen.
 */
ok('1 uses the singular', arabicCount(1, CHOICE_NOUN) === 'اختيار واحد');
ok('2 uses the DUAL, which English does not have', arabicCount(2, CHOICE_NOUN) === 'اختيارين');
ok('3-10 use the plural', arabicCount(6, CHOICE_NOUN) === '٦ اختيارات'
  && arabicCount(10, CHOICE_NOUN) === '١٠ اختيارات');
ok('11+ uses the accusative singular', arabicCount(11, CHOICE_NOUN) === '١١ اختيارًا');
ok('digits are Arabic-Indic, like the rest of the product', arabicNumber(2026) === '٢٠٢٦');

// ═══════════════════════════════════════════════════════════════════════════
section('3 — WHAT EACH STATUS IS ALLOWED TO SAY');
// ═══════════════════════════════════════════════════════════════════════════
ok('«recommended» is «اقترحناه لك»', PROPOSAL.recommendedBadge === 'اقترحناه لك');
ok('nothing in the proposal copy claims a best product',
  !/الأفضل|أفضل خيار|الأمثل/.test(JSON.stringify(PROPOSAL)));
ok('«only-compatible» says it is about the CATALOGUE',
  PROPOSAL.onlyCompatibleBadge.includes('الكتالوج'));
ok('…and explicitly disclaims the market',
  /لا يعني أنه الوحيد في السوق/.test(PROPOSAL.onlyCompatibleNote));
ok('an owned part is «قطعة لديك», never «اقترحناها»',
  PROPOSAL.ownedBadge === 'قطعة لديك' && !PROPOSAL.ownedBadge.includes('اقترح'));
/*
 * A tied category has no «هذه القطعة». Asking «لماذا هذه القطعة؟» over an
 * empty selection points the reader at a part that is not on the card.
 */
ok('a tie explains why nothing was chosen, not why something was',
  PROPOSAL.whyTieTitle === 'لماذا لم نرجّح واحدة؟'
  && /decision\.status === 'choice-required' \? PROPOSAL\.whyTieTitle/
    .test(src['ProposalCategoryCard.tsx']));

ok('a choice-required category admits it needs the reader',
  PROPOSAL.groups['needs-you'].title === 'نحتاج اختيارك');
ok('…and says the options are tied, not that one is better',
  /لا نملك ما يرجّح بينها/.test(PROPOSAL.groups['needs-you'].note));

const recommended = b(FREESTYLE_MID).decisions.find(d => d.status === 'recommended')!;
ok('a recommended decision really carries the part it selected',
  recommended.partId !== undefined && recommended.selectionSource === 'system');
ok('the card renders the selected part from `build.parts`',
  /parts\[decision\.category\]/.test(src['ProposalCategoryCard.tsx']));

// ═══════════════════════════════════════════════════════════════════════════
section('4 — A TIE IS SHOWN AS A TIE');
// ═══════════════════════════════════════════════════════════════════════════
const tied = b(FREESTYLE_MID).decisions.find(d => d.status === 'choice-required')!;
ok('the tied category has more than one survivor', tied.candidateIds.length > 1);
ok('EVERY candidate is rendered, none filtered',
  /decision\.candidateIds\.map/.test(src['ProposalCategoryCard.tsx']));
ok('every candidate carries data-selected="false"',
  /data-selected="false"/.test(src['ProposalCategoryCard.tsx']));
ok('no candidate is ever marked selected',
  !/data-selected=\{/.test(src['ProposalCategoryCard.tsx'])
  && !/data-selected="true"/.test(src['ProposalCategoryCard.tsx']));

/*
 * THE TWO FAKE WINNERS.
 *
 * `candidateIds[0]` is the catalogue's order, which is not a ranking. And the
 * `provenPath` member is the arbitrary tie-break the existence search happened
 * to make — presenting either as «the system's pick» manufactures a
 * recommendation the engine explicitly refused to give.
 */
ok('no component indexes into candidateIds', !/candidateIds\s*\[\s*0\s*\]/.test(allCode));
/*
 * Scoped to COMPONENTS. `readiness.ts` reads `provenPath` and must — it is the
 * existence receipt the whole readiness model rests on. What must never happen
 * is a component treating that proof as a pick, so the check is on the files
 * that render.
 */
const componentCode = Object.entries(src)
  .filter(([f]) => f.endsWith('.tsx')).map(([, c]) => c).join('\n');
ok('no COMPONENT reads provenPath', !/provenPath/.test(componentCode));
ok('…and the readiness module still does, which is the point',
  /provenPath/.test(src['readiness.ts']));
const withPath = b(FREESTYLE_MID);
ok('the proven path really does pick a member of the tie (so this matters)',
  withPath.provenPath !== null && tied.candidateIds.includes(withPath.provenPath![tied.category]));
ok('…and the decision still reports NO selection for that category',
  tied.partId === undefined && tied.selectionSource === 'none');

// ═══════════════════════════════════════════════════════════════════════════
section('5 — NO READER SELECTION, BECAUSE THE DOMAIN HAS NO WORD FOR IT');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * `RecommendationInput.owned.parts` means «already in hand» and produces
 * `user-locked` / `selectionSource: 'user-owned'`. Using it for a part the
 * reader merely picked in a wizard would tell them they own something they do
 * not, and make the engine refuse to replace it. There is no third channel, so
 * Phase 2C shows candidates read-only and the contract is designed later.
 */
ok('nothing in the V2 layer writes owned.parts', !/owned\s*:\s*\{[^}]*parts/.test(allCode));
ok('nothing in the V2 layer even mentions owned.parts', !/owned\.parts/.test(allCode));
ok('no candidate is clickable', !/onSelect|onClick=\{\(\) => set[A-Z]\w*Candidate/.test(
  src['ProposalCategoryCard.tsx']));
ok('the screen says the list is read-only for now',
  /هذه القائمة للعرض في هذه المرحلة/.test(PROPOSAL.candidates.readOnly));
ok('the model documents why selection is absent',
  /owned\.parts` means «already in hand»/.test(read(`${V2}/proposalModel.ts`).replace(/\n\s*\*\s?/g, ' ')));

// ═══════════════════════════════════════════════════════════════════════════
section('6 — EXPLANATIONS AND EVIDENCE ARE THE ENGINE\'S');
// ═══════════════════════════════════════════════════════════════════════════
ok('reasons are rendered straight from decision.reasons',
  /decision\.reasons\.map/.test(src['ProposalCategoryCard.tsx']));
ok('no component composes an explanation from a rule id',
  !/ruleId.*(replace|split|toUpperCase|charAt)/.test(allCode));
/*
 * ARABIC PROSE IN A COMPONENT, DETECTED PROPERLY.
 *
 * The first version of this test looked for twelve consecutive Arabic
 * characters — and no Arabic word is twelve letters long, so it matched
 * nothing and passed against a probe that hard-coded a full sentence into the
 * card. A test that cannot fail is worse than no test.
 *
 * What it should find is a STRING LITERAL holding more than one Arabic word.
 * Separators like ' · ' and ' — ' carry no Arabic letters and are fine; every
 * real sentence belongs in `copy.ts` or comes from the engine.
 */
const arabicProseLiterals = (file: string): string[] =>
  (file.match(/'[^'\n]*'|"[^"\n]*"/g) ?? [])
    .filter(lit => (lit.match(/[\u0621-\u064A]+/g) ?? []).length >= 2);
ok('the card writes no Arabic sentence of its own',
  arabicProseLiterals(src['ProposalCategoryCard.tsx']).length === 0);
ok('nor does the proposal screen',
  arabicProseLiterals(src['ProposalScreen.tsx']).length === 0);
ok('…and the detector is not vacuous — it finds prose in copy.ts',
  arabicProseLiterals(src['copy.ts']).length > 20);
ok('the recommended decision really has an Arabic reason to show',
  recommended.reasons.length > 0 && recommended.reasons.every(r => r.ar.trim().length > 0));

ok('compatibility is rendered only from decision.compatibility',
  /decision\.compatibility/.test(src['ProposalCategoryCard.tsx'])
  && !/SHARED_COMPAT_RULES/.test(allCode));
ok('a rule that was not evaluated cannot render as a pass',
  /ev\.map\(e =>/.test(src['ProposalCategoryCard.tsx'])
  && !/status:\s*'pass'/.test(src['ProposalCategoryCard.tsx']));
ok('the headline downgrades when any rule is violated or unknown',
  /someViolated/.test(src['ProposalCategoryCard.tsx'])
  && /someUnknown/.test(src['ProposalCategoryCard.tsx']));
ok('a decision with no shared rule says so rather than claiming a pass',
  /PROPOSAL\.compat\.none/.test(src['ProposalCategoryCard.tsx']));
ok('the evidence really is per-decision and small',
  recommended.compatibility.length >= 1 && recommended.compatibility.length <= 4);

// ═══════════════════════════════════════════════════════════════════════════
section('7 — MANUAL CHECKS BLOCK THE «FULLY COMPATIBLE» CLAIM');
// ═══════════════════════════════════════════════════════════════════════════
const manual = b(FREESTYLE_MID);
ok('this build really does carry a manual check', manual.manualChecks.length > 0);
ok('the proposal copy never claims full compatibility',
  !/متوافق بالكامل|متوافق تمامًا|توافق كامل/.test(JSON.stringify(PROPOSAL)));
ok('the manual check is announced as a check before the build is trusted',
  /هناك فحص يدوي قبل اعتماد البناء/.test(PROPOSAL.manual.title));
ok('current-headroom has honest wording and NO invented amp number',
  PROPOSAL.manual.labels['current-headroom'] !== undefined
  && !/[0-9٠-٩]+\s*(A|أمبير)/.test(PROPOSAL.manual.labels['current-headroom']));
ok('the manual section renders from build.manualChecks, not a hard-coded list',
  /view\.manualChecks\.map/.test(src['ProposalScreen.tsx']));

// ═══════════════════════════════════════════════════════════════════════════
section('8 — AN INCONSISTENT PROPOSAL IS REFUSED, NOT DRAWN');
// ═══════════════════════════════════════════════════════════════════════════
/*
 * A proven build cannot contain an unavailable REQUIRED category — the engine
 * found a complete blocker-free assignment, so every category had something to
 * offer. If both are ever true, the screen must not render a plausible-looking
 * proposal over the contradiction.
 */
const fakeInconsistent = {
  ...b(FREESTYLE_MID),
  decisions: b(FREESTYLE_MID).decisions.map((d, i) =>
    (i === 0 ? { ...d, status: 'unavailable' as const } : d)),
} as ProposedBuild;
ok('an unavailable category sets the consistency flag',
  proposalView(fakeInconsistent).consistencyError);
ok('a healthy build does not', !proposalView(b(FREESTYLE_MID)).consistencyError);
ok('the screen refuses to render a proposal in that state',
  /if \(view\.consistencyError\)/.test(src['ProposalScreen.tsx']));
ok('…and says so out loud, with role="alert"',
  /role="alert"/.test(src['ProposalScreen.tsx']));
ok('no real representative build is inconsistent',
  BURDEN_CASES.every(([, i]) => !proposalView(b(i)).consistencyError));

// ═══════════════════════════════════════════════════════════════════════════
section('9 — «PROPOSED» IS NOT CLAIMED WHEN NOTHING WAS PROPOSED');
// ═══════════════════════════════════════════════════════════════════════════
ok('Freestyle with a budget tier IS a proposal',
  proposalView(b(FREESTYLE_MID)).quality === 'proposed');
ok('Freestyle with «لا تفضيل» recommends nothing at all',
  proposalView(b(FREESTYLE_NONE)).counts.systemDecided === 0);
ok('…so the headline weakens instead of lying',
  proposalView(b(FREESTYLE_NONE)).quality === 'all-open');
ok('…and it still has a proven path — it is open, not broken',
  b(FREESTYLE_NONE).provenPath !== null);
ok('the weaker headline does not say «المقترح لك»',
  !PROPOSAL.titleAllOpen.includes('المقترح'));
ok('…and it explains what would let the system rank',
  /فئة ميزانية/.test(PROPOSAL.leadAllOpen));

// ═══════════════════════════════════════════════════════════════════════════
section('10 — PART DATA A BEGINNER CAN READ');
// ═══════════════════════════════════════════════════════════════════════════
const byId: Record<string, unknown> = {};
for (const list of Object.values(PART_CATEGORY_MAP)) for (const p of list) byId[p.id] = p;

let factRows = 0;
for (const [, input] of BURDEN_CASES) {
  const build = b(input);
  for (const d of build.decisions) {
    const part = d.partId ? build.parts[d.category] : undefined;
    if (!part) continue;
    const facts = partFacts(d.category, part);
    factRows += facts.length;
    ok(`${d.category}: at most three facts, none empty`,
      facts.length <= 3 && facts.every(f => f.value.trim() !== '' && f.labelAr.trim() !== ''));
    ok(`${d.category}: no fact leaks a raw id or an undefined`,
      facts.every(f => !/undefined|null|^\s*-\s*$/.test(f.value) && !f.value.includes(part.id)));
  }
}
ok(`the fact rows are not vacuously empty (${factRows} rendered across the cases)`, factRows > 10);
ok('no component renders a part id', !/part\.id|\.partId\}/.test(allCode));
ok('no component renders the tier back at the reader', !/part\.tier|\.tier\}/.test(allCode));
ok('no component dumps the whole spec bag',
  !/Object\.(keys|entries)\(\s*(part|p)\.specs/.test(allCode));
ok('the English product name is bidi-isolated',
  /<bdi dir="ltr"/.test(src['ProposalCategoryCard.tsx']));

// ═══════════════════════════════════════════════════════════════════════════
section('11 — ACCESSIBILITY AT THE SOURCE');
// ═══════════════════════════════════════════════════════════════════════════
const cardCode = src['ProposalCategoryCard.tsx'];
ok('every disclosure is a real button with aria-expanded',
  /<button\s+type="button"/.test(cardCode) && /aria-expanded=\{open\}/.test(cardCode));
ok('…and points at the panel it controls', /aria-controls=\{panelId\}/.test(cardCode));
ok('no clickable div anywhere in the proposal',
  !/<div[^>]*onClick/.test(cardCode) && !/<div[^>]*onClick/.test(src['ProposalScreen.tsx']));
ok('disclosure targets clear 44px', /minHeight: 44/.test(cardCode));
ok('the heading hierarchy descends h2 → h3 → h4',
  /<h2 /.test(src['ProposalScreen.tsx']) && /<h3 /.test(src['ProposalScreen.tsx'])
  && /<h4 /.test(cardCode));
ok('status is carried by words, not colour alone',
  /StatusBadge/.test(cardCode) && /PROPOSAL\.recommendedBadge/.test(cardCode));
ok('every design token the proposal names exists', (() => {
  const globals = read('web/app/globals.css');
  const used = [...new Set(allCode.match(/var\(--[a-zA-Z0-9-]+/g) ?? [])].map(t => t.slice(4));
  return used.every(t => globals.includes(`${t}:`));
})());

// ═══════════════════════════════════════════════════════════════════════════
section('12 — SCOPE: NOTHING PHASE 2C WAS NOT ASKED FOR');
// ═══════════════════════════════════════════════════════════════════════════
for (const [pattern, what] of [
  [/localStorage|sessionStorage|indexedDB/i, 'persistence'],
  [/firebase|firestore|setDoc/i, 'Firebase'],
  [/mirrorToProject|saveProject|saveDraft/, 'a project write'],
  [/\bfetch\s*\(/, 'a network call'],
  [/addToCart|checkout|buyNow/i, 'store behaviour'],
  [/buildStages|wiring|betaflight/i, 'assembly or setup'],
] as const) {
  ok(`the proposal adds no ${what}`, !pattern.test(allCode));
}
ok('the summary still owns the readiness copy, unchanged',
  SUMMARY.status.ready.title === 'جاهزون لبناء اقتراح القطع');

console.log(`\n[build v2 proposal] ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach(f => console.log(`  FAILED: ${f}`));
  process.exit(1);
}
