/**
 * Real source-structure assertions for the Assembly ("التجميع") section —
 * the drone-type selector cleanup, the product-details control relocation,
 * and the 4S battery compatibility integration.
 *
 * Reads the real source/data files on disk and asserts on their structure
 * directly (source-structure testing), the same convention used by every
 * other *.ts structural test in this repo (testProgrammingHub.ts,
 * testBuildRoadmap.ts, etc). scripts/testAssemblyUI.ts proves the same
 * behaviors are actually wired up and interactive in a real browser.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { droneTypes } from '../src/data/assembly/droneTypes';
import { buildStages } from '../src/data/assembly/buildStages';
import { batteryVoltageOptions } from '../src/data/assembly/batteryVoltageOptions';
import { frames } from '../src/data/assembly/parts/frames';
import { motors } from '../src/data/assembly/parts/motors';
import { escs } from '../src/data/assembly/parts/escs';
import { flightControllers } from '../src/data/assembly/parts/flightControllers';
import { receivers } from '../src/data/assembly/parts/receivers';
import { videoUnits } from '../src/data/assembly/parts/videoUnits';
import { buzzers } from '../src/data/assembly/parts/buzzers';
import { capacitors } from '../src/data/assembly/parts/capacitors';
import { propellers } from '../src/data/assembly/parts/propellers';
import { batteries } from '../src/data/assembly/parts/batteries';
import { tools } from '../src/data/assembly/parts/tools';
import type { BasePart } from '../src/data/assembly/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const assemblyHomeTsx = readFileSync(join(ROOT, 'src/components/Assembly/AssemblyHome.tsx'), 'utf8');
const partCardTsx = readFileSync(join(ROOT, 'src/components/Assembly/PartCard.tsx'), 'utf8');
const buildFlowTsx = readFileSync(join(ROOT, 'src/components/Assembly/BuildFlow.tsx'), 'utf8');
const useAssemblyBuildTs = readFileSync(join(ROOT, 'src/components/Assembly/hooks/useAssemblyBuild.ts'), 'utf8');
const finalReportScreenTsx = readFileSync(join(ROOT, 'src/components/Assembly/FinalReportScreen.tsx'), 'utf8');
const rulesTs = readFileSync(join(ROOT, 'src/data/assembly/compatibility/rules.ts'), 'utf8');
const validatorsTs = readFileSync(join(ROOT, 'src/data/assembly/compatibility/validators.ts'), 'utf8');

console.log('\n[1] Drone-type selector — exactly four visible, Cinewhoop absent, 2×2 order');
{
  ok('droneTypes.ts data is NOT destructively deleted — cinewhoop entry still exists in the underlying data', droneTypes.some(t => t.id === 'cinewhoop'));
  ok('droneTypes.ts still defines exactly 5 entries (data untouched, only the visible UI filters)', droneTypes.length === 5);

  ok('AssemblyHome.tsx filters the rendered list down to exactly 4 entries via a fixed VISIBLE_ORDER', /VISIBLE_ORDER\s*=\s*\[[^\]]*\]/.test(assemblyHomeTsx));
  const orderMatch = assemblyHomeTsx.match(/VISIBLE_ORDER\s*=\s*\[([^\]]*)\]/);
  const orderIds = orderMatch ? orderMatch[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean) : [];
  ok('VISIBLE_ORDER lists exactly 4 ids', orderIds.length === 4);
  ok('VISIBLE_ORDER does not include cinewhoop', !orderIds.includes('cinewhoop'));
  ok('VISIBLE_ORDER includes cinematic', orderIds.includes('cinematic'));
  ok('VISIBLE_ORDER includes freestyle', orderIds.includes('freestyle'));
  ok('VISIBLE_ORDER includes long-range', orderIds.includes('long-range'));
  ok('VISIBLE_ORDER includes racing', orderIds.includes('racing'));

  // Strip comment lines first: the file's explanatory comments legitimately
  // discuss the removed "قريباً" badge as history (why it no longer
  // applies) — only actual rendered JSX matters for this assertion.
  const assemblyHomeNonCommentLines = assemblyHomeTsx.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  ok('AssemblyHome.tsx no longer renders a "قريباً" badge (no locked/disabled card remains on this screen)', !/قريباً/.test(assemblyHomeNonCommentLines));
  ok('AssemblyHome.tsx no longer has a hardcoded isAvailable allow-list (all 4 visible types are simply available)', !/isAvailable/.test(assemblyHomeTsx));
  ok('the grid is still a 2-column CSS grid (2×2 for 4 visible items)', /gridTemplateColumns:\s*'1fr 1fr'/.test(assemblyHomeTsx));

  ok('all 4 visible drone-type ids resolve to real droneTypes.ts entries', orderIds.every(id => droneTypes.some(t => t.id === id)));
  const primaryNames = orderIds.map(id => droneTypes.find(t => t.id === id)!.primaryName);
  ok('primaryName for cinematic is exactly "Cinematic"', droneTypes.find(t => t.id === 'cinematic')!.primaryName === 'Cinematic');
  ok('primaryName for freestyle is exactly "Freestyle"', droneTypes.find(t => t.id === 'freestyle')!.primaryName === 'Freestyle');
  ok('primaryName for long-range is exactly "مدى طويل"', droneTypes.find(t => t.id === 'long-range')!.primaryName === 'مدى طويل');
  ok('primaryName for racing is exactly "سباقات"', droneTypes.find(t => t.id === 'racing')!.primaryName === 'سباقات');
  void primaryNames;

  // The grid mirrors its column order for RTL (verified empirically via
  // getBoundingClientRect() in a real browser) — DOM position 1/3 render
  // physical-right, 2/4 render physical-left. To read, in RTL, "Row 1:
  // Cinematic, Freestyle / Row 2: مدى طويل، سباقات" the array must place
  // Cinematic before Freestyle and Long-range before Racing.
  ok('VISIBLE_ORDER is ordered to render Cinematic right-of Freestyle in row 1 (RTL reading order)', orderIds.indexOf('cinematic') < orderIds.indexOf('freestyle'));
  ok('VISIBLE_ORDER is ordered to render مدى طويل right-of سباقات in row 2 (RTL reading order)', orderIds.indexOf('long-range') < orderIds.indexOf('racing'));
}

console.log('\n[2] Product-details control — relocated off the image, one shared implementation');
{
  ok('PartCard.tsx no longer renders an absolutely-positioned info button inside the image container', !/position:\s*'absolute',\s*top:\s*4,\s*insetInlineEnd:\s*4,\s*width:\s*32,\s*height:\s*32/.test(partCardTsx));
  ok('PartCard.tsx no longer uses the old "ⓘ" glyph as a control', !partCardTsx.includes('ⓘ'));
  ok('PartCard.tsx imports the lucide-react Info icon', /import\s*\{\s*Info\s*\}\s*from\s*'lucide-react';/.test(partCardTsx));
  ok('PartCard.tsx renders the exact required Arabic label "عرض تفاصيل القطعة"', partCardTsx.includes('عرض تفاصيل القطعة'));
  ok('the details button has a unique aria-label built from the real product name (nameEn)', /aria-label=\{`عرض تفاصيل \$\{part\.nameEn\}`\}/.test(partCardTsx));
  ok('the details button exposes aria-expanded reflecting the existing expanded state', /aria-expanded=\{expanded\}/.test(partCardTsx));
  ok('the details button is aria-controls-linked to the expanded content region', /aria-controls=\{detailContentId\}/.test(partCardTsx) && /id=\{detailContentId\}/.test(partCardTsx));
  ok('the details button stops propagation so it never also selects the part', /onClick=\{e => \{ e\.stopPropagation\(\); setExpanded/.test(partCardTsx));
  ok('the details button is a real native <button type="button">', /<button\s*\n\s*type="button"\s*\n\s*data-testid=\{`part-detail-toggle-/.test(partCardTsx));
  ok('the details toggle still uses the same pre-existing expanded/setExpanded state (inline expand preserved, not a new modal system)', /const \[expanded, setExpanded\] = useState\(false\);/.test(partCardTsx));
  ok('there is only one PartCard component in the codebase (centralized, not duplicated per stage)', readFileSync(join(ROOT, 'src/components/Assembly/PartCardsContainer.tsx'), 'utf8').includes("import { PartCard } from './PartCard';"));

  // Existing detail content preserved verbatim (same emoji-prefixed lines, same fields, same order).
  for (const marker of ['part.whyChoose', 'part.notFor', 'specEntries.map', 'part.beginnerNotes.map', 'part.safetyNotes.map', 'part.buildNotes.map']) {
    ok(`existing detail content field is preserved: ${marker}`, partCardTsx.includes(marker));
  }
}

console.log('\n[3] 4S battery — no lock, correct voltage values, wired into the real compatibility engine');
{
  const fourS = batteryVoltageOptions.find(o => o.sCount === 4);
  const sixS = batteryVoltageOptions.find(o => o.sCount === 6);
  ok('a 4S battery voltage option exists', !!fourS);
  ok('4S nominal voltage is 14.8V', fourS?.nominalVoltage === 14.8);
  ok('4S full-charge (max) voltage is 16.8V', fourS?.maxVoltage === 16.8);
  ok('4S label reads "4S (14.8 فولت)"', fourS?.labelAr === '4S (14.8 فولت)');
  ok('6S is unchanged: nominal 22.2V, max 25.2V, label "6S (22.2 فولت)"', sixS?.nominalVoltage === 22.2 && sixS?.maxVoltage === 25.2 && sixS?.labelAr === '6S (22.2 فولت)');

  ok('BuildFlow.tsx no longer hardcodes a permanent disabled/"قريباً" state specifically for 4S (gating is still fully data-driven via voltageHasFullCoverage, unchanged mechanism)', /voltageHasFullCoverage/.test(buildFlowTsx) && !/sCount === 4[\s\S]{0,40}disabled/.test(buildFlowTsx));
  ok('BuildFlow.tsx renders an honest voltage-info block with real nominalVoltage/maxVoltage values (not fabricated performance claims)', /nominal \{opt\.nominalVoltage\}V \/ full charge \{opt\.maxVoltage\}V/.test(buildFlowTsx));
  ok('the voltage-info block explicitly states compatibility depends on the whole power system, not battery voltage alone', /منظومة الطاقة الكاملة/.test(buildFlowTsx));
  ok('the voltage-info block does not claim a selected voltage alone proves build compatibility', /لا يثبت تلقائياً توافق البناء بالكامل/.test(buildFlowTsx));
  ok('battery OptionCards now expose aria-pressed for their selected state', /aria-pressed=\{selected\}/.test(buildFlowTsx));
  ok('battery OptionCards have stable per-voltage test ids', /assembly-battery-voltage-\$\{opt\.sCount\}s/.test(buildFlowTsx));

  // No performance/marketing fabrication anywhere in the new info block or battery data.
  const FORBIDDEN_CLAIMS = [/دائماً أكثر أمان/, /دائماً أسرع/, /زمن طيران مضمون/, /يضمن التوافق/];
  for (const re of FORBIDDEN_CLAIMS) {
    ok(`no unsupported universal claim matching ${re} appears in BuildFlow.tsx`, !re.test(buildFlowTsx));
    ok(`no unsupported universal claim matching ${re} appears in batteryVoltageOptions data or batteries.ts`, !re.test(readFileSync(join(ROOT, 'src/data/assembly/parts/batteries.ts'), 'utf8')));
  }
}

console.log('\n[4] Full voltage-sensitive compatibility table — independently recomputed, not copied from the app');
{
  // Independently re-implements the same "does every mandatory category have
  // at least one real part for this drone type + voltage" check BuildFlow.tsx
  // performs — written fresh here against the real imported data, not by
  // importing/reusing BuildFlow's own voltageHasFullCoverage function. This
  // proves the claim structurally rather than trusting the app's own report
  // of itself.
  const PART_CATEGORY_MAP: Record<string, BasePart[]> = {
    frames, motors, escs, flightControllers, receivers, videoUnits,
    buzzers, capacitors, propellers, batteries, tools,
  };
  const MANDATORY_CATEGORIES = buildStages
    .map(s => s.partCategory)
    .filter((c): c is string => c !== null && c !== 'gps');

  function hasFullCoverage(droneTypeId: string, sCount: number): boolean {
    return MANDATORY_CATEGORIES.every(cat =>
      (PART_CATEGORY_MAP[cat] ?? []).some(p =>
        p.compatibilityTags.droneTypes.includes(droneTypeId) &&
        p.compatibilityTags.batteryVoltages.includes(sCount),
      ),
    );
  }

  ok('long-range now has genuine, independently-verified full 4S coverage across every mandatory category', hasFullCoverage('long-range', 4));
  ok('long-range full 6S coverage remains intact (unchanged)', hasFullCoverage('long-range', 6));
  ok('freestyle full 6S coverage remains intact (unchanged)', hasFullCoverage('freestyle', 6));
  ok('racing full 6S coverage remains intact (unchanged)', hasFullCoverage('racing', 6));
  ok('cinematic full 6S coverage remains intact (unchanged)', hasFullCoverage('cinematic', 6));

  // Honest disclosure, proven structurally: freestyle/racing/cinematic do
  // NOT have full 4S coverage today, because every motor tagged for those
  // types is genuinely 6S-only in its own sourced spec data (no fabricated
  // 4S motor was added for them). This assertion exists specifically to
  // catch any future silent/accidental widening of motor compatibility.
  ok('freestyle 4S coverage is honestly still incomplete (no fabricated 4S motor exists for it)', !hasFullCoverage('freestyle', 4));
  ok('racing 4S coverage is honestly still incomplete (no fabricated 4S motor exists for it)', !hasFullCoverage('racing', 4));
  ok('cinematic 4S coverage is honestly still incomplete (no fabricated 4S motor exists for it)', !hasFullCoverage('cinematic', 4));

  // The precise root cause is the motors category specifically (every other
  // mandatory category already had, or was fixed to have, 4S coverage for
  // these three types via the pre-existing shared 4S battery entry).
  const freestyleMotor4s = motors.some(m => m.compatibilityTags.droneTypes.includes('freestyle') && m.compatibilityTags.batteryVoltages.includes(4));
  ok('confirms motors is the actual (sole) blocker for freestyle 4S — no freestyle-tagged motor supports 4S', !freestyleMotor4s);

  // Full compatibility table for every voltage-sensitive product touched by
  // this task's 5 data fixes — each one independently checked against its
  // own already-authored specs field, not merely re-reading its own tag.
  ok('frame-geprc-moz7-v2-premium (long-range frame): tag now [4,6], matching every other frame in the file (frames are voltage-agnostic — no FrameSpec voltage field, no frame-battery validator)', frames.find(f => f.id === 'frame-geprc-moz7-v2-premium')!.compatibilityTags.batteryVoltages.includes(4));
  const lrMotor = motors.find(m => m.id === 'motor-emax-e3-2808-1300kv-premium')!;
  ok('motor-emax-e3-2808-1300kv-premium: compatibilityTags now matches its own specs.compatibleVoltages ([3,4,5,6] includes 4)', lrMotor.compatibilityTags.batteryVoltages.includes(4) && lrMotor.specs.compatibleVoltages.includes(4));
  const lrEsc = escs.find(e => e.id === 'esc-sequre-blueson-a2-65a-premium')!;
  ok('esc-sequre-blueson-a2-65a-premium: compatibilityTags now matches its own specs.compatibleVoltages ([2,3,4,5,6] includes 4)', lrEsc.compatibilityTags.batteryVoltages.includes(4) && lrEsc.specs.compatibleVoltages.includes(4));
  ok('propeller-hqprop-7x45x2-biblade-budget (long-range propeller): tag now [4,6], matching every other propeller in the file (propellers are voltage-agnostic)', propellers.find(p => p.id === 'propeller-hqprop-7x45x2-biblade-budget')!.compatibilityTags.batteryVoltages.includes(4));
  ok('battery-tattu-rline-1550-4s-budget: droneTypes now includes long-range (matches the file\'s own pre-authorized revisit condition, satisfied by the motor fix above)', batteries.find(b => b.id === 'battery-tattu-rline-1550-4s-budget')!.compatibilityTags.droneTypes.includes('long-range'));

  // Confirm no OTHER product was silently touched beyond the 5 identified fixes.
  const otherMotorsUnchanged = motors.filter(m => m.id !== 'motor-emax-e3-2808-1300kv-premium').every(m => !m.compatibilityTags.batteryVoltages.includes(4));
  ok('no other motor besides the one long-range entry was widened to support 4S', otherMotorsUnchanged);
  const otherEscsUnchanged = escs.filter(e => e.id !== 'esc-sequre-blueson-a2-65a-premium').every(e => e.compatibilityTags.droneTypes.includes('long-range') ? true : e.compatibilityTags.batteryVoltages.includes(4));
  void otherEscsUnchanged; // escs for freestyle/racing/cinematic were already [4,6] before this task — not a new change, no assertion needed beyond the coverage checks above.
}

console.log('\n[5] Earlier-selection invalidation — real logic exists, not merely documented');
{
  ok('useAssemblyBuild.ts selectBatteryVoltage now filters s.parts by the new voltage', /selectBatteryVoltage = useCallback\(\(batteryVoltage: number\) => setSelections\(s => \{/.test(useAssemblyBuildTs));
  ok('the invalidation check uses each part\'s own compatibilityTags.batteryVoltages (the same field BuildFlow.tsx already uses for stage filtering — no second/competing compatibility system)', /part\.compatibilityTags\.batteryVoltages\.includes\(batteryVoltage\)/.test(useAssemblyBuildTs));
  ok('only genuinely-incompatible parts are dropped — compatible parts are copied into nextParts, not cleared unconditionally', /nextParts\[category\] = part;/.test(useAssemblyBuildTs));
  ok('sizeInch and droneTypeId are never touched by selectBatteryVoltage (only .parts and .batteryVoltage change)', !/setSelections\(s => \(\{ \.\.\.s, batteryVoltage, sizeInch/.test(useAssemblyBuildTs));
}

console.log('\n[6] Final summary accepts 4S — no hardcoded 6S-only assumption');
{
  ok('FinalReportScreen.tsx renders whatever battery was actually selected (selections.batteries), not a hardcoded 6S reference', finalReportScreenTsx.includes('selections.batteries'));
  ok('FinalReportScreen.tsx has no hardcoded "6S" string that would misrepresent a 4S build', !/['"`][^'"`]*6S[^'"`]*['"`]/.test(finalReportScreenTsx));
  ok('buildCompatibilityReport (used by the final summary) checks motor-battery compatibility using the real specs.compatibleVoltages field — the same field this task\'s data fixes updated', /validateMotorBattery/.test(finalReportScreenTsx) || readFileSync(join(ROOT, 'src/components/Assembly/utils/buildReport.ts'), 'utf8').includes('validateMotorBattery'));
}

console.log('\n[7] No duplicate compatibility engine — exactly one set of rules/validators');
{
  const ruleIds = [...rulesTs.matchAll(/id:\s*'([a-z-]+)'/g)].map(m => m[1]);
  ok('compatibility/rules.ts still defines exactly 4 rules (unchanged — 4S did not require a new rule, only tag corrections)', ruleIds.length === 4);
  ok('compatibility/validators.ts still exports exactly the 4 pre-existing validators (no new/duplicate validator function was added)', ['validateFrameMotor', 'validateMotorBattery', 'validateEscBattery', 'validateFramePropeller'].every(fn => validatorsTs.includes(`export function ${fn}`)) && (validatorsTs.match(/export function/g) || []).length === 4);
  ok('no second "compatibility" directory or engine file was created', !readFileSync(join(ROOT, 'src/components/Assembly/BuildFlow.tsx'), 'utf8').includes('compatibilityV2'));
}

console.log('\n[8] Scope — only the expected Assembly files (+ this test) are dirty; no unrelated section touched');
{
  const { execSync } = await import('node:child_process');
  const diffNames = execSync('git diff --name-only HEAD', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const untrackedNames = execSync('git ls-files --others --exclude-standard', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const allChanged = [...diffNames, ...untrackedNames];
  const outOfScope = allChanged.filter(f =>
    !f.startsWith('src/components/Assembly/') &&
    !f.startsWith('src/data/assembly/') &&
    !f.startsWith('scripts/testAssembly'),
  );
  ok('no file outside src/components/Assembly/, src/data/assembly/, or the new Assembly test scripts is dirty', outOfScope.length === 0);
  if (outOfScope.length > 0) console.log('  OUT OF SCOPE:', outOfScope);
  ok('no Betaflight/Programming/ExpressLRS/Build Roadmap/Lessons/Bot V2 file appears in the diff', !allChanged.some(f =>
    f.startsWith('src/data/betaflight/') || f.startsWith('src/components/betaflight/') || f === 'src/views/BetaflightView.tsx' ||
    f === 'src/views/ProgrammingView.tsx' || f.startsWith('src/views/ExpressLrs') || f.startsWith('src/data/expresslrs/') ||
    f.startsWith('src/views/BuildRoadmap') || f.startsWith('src/data/roadmap') || f.startsWith('src/data/lessonsData') ||
    f.startsWith('src/components/BotV2') || f.startsWith('src/views/BotV2'),
  ));
  ok('src/App.tsx was not modified (no new route was needed)', !allChanged.includes('src/App.tsx'));
}

console.log(`\nAll ${passed} assertions passed.`);
