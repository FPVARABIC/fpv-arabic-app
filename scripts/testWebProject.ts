/**
 * The web project workspace: is it the shared core, or a copy of it?
 *
 * WHAT THIS SUITE IS FOR
 * ----------------------
 * The batch's central instruction was "do not create a second project model or
 * a second verdict engine". That is not something a build, a typecheck or a
 * browser test can notice — a forked engine compiles perfectly and renders
 * beautifully, and it is discovered months later when the phone and the web
 * disagree about whether a battery will burn an ESC.
 *
 * So most of what follows reads the web sources as TEXT and asserts about what
 * they do NOT contain: no severity ordering, no voltage comparison, no storage
 * key, no schema number, no hand-written content path. The positive assertions —
 * that the engine is imported and its output rendered whole — are the smaller
 * half.
 *
 * The engine's own correctness is `scripts/testProject.ts`'s job, and the
 * end-to-end run drives the real page in a real browser.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeFindings, sortFindings, countFindings,
} from '../src/data/project/verdicts';
import { computeNextStep } from '../src/data/project/nextStep';
import { SEVERITY_ORDER, type ProjectSnapshot } from '../src/data/project/types';
import { PART_CATEGORY_MAP, PART_CATEGORY_LABEL_AR } from '../src/data/project/store';
import { roadmapData } from '../src/data/roadmapData';
import { roadmapStageContent } from '../src/data/roadmapStageContent';
import { checklistsData } from '../src/data/checklistsData';
import { buildStages } from '../src/data/assembly/buildStages';
import { motors } from '../src/data/assembly/parts/motors';
import { escs } from '../src/data/assembly/parts/escs';
import { batteries } from '../src/data/assembly/parts/batteries';
import { propellers } from '../src/data/assembly/parts/propellers';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(ROOT, 'web');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** Comments stripped, so a file that EXPLAINS a rule does not fail it. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Every project-related source under web/, as comment-free code. */
function projectSources(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry)) continue;
      const rel = relative(ROOT, full);
      if (!/project/i.test(rel)) continue;
      out.set(rel, stripComments(readFileSync(full, 'utf8')));
    }
  };
  walk(WEB);
  return out;
}

const SOURCES = projectSources();

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[1] The web has project files, and they import the shared core');
{
  ok(`web project sources exist (${SOURCES.size})`, SOURCES.size >= 5);

  const adapter = read('web/lib/project.ts');
  for (const fn of ['readProjectSnapshot', 'computeFindings', 'computeNextStep',
    'sortFindings', 'countFindings', 'saveAssemblyProject', 'exportAssemblyProject',
    'importAssemblyProject', 'clearAssemblyProject']) {
    ok(`the adapter re-exports ${fn} from the core`, adapter.includes(fn));
  }
  ok('every export in the adapter comes from @core — it defines nothing itself',
    !/^export (const|function|class|interface|type) /m.test(stripComments(adapter)
      .replace(/export \{[\s\S]*?\} from '@core[^']*';/g, '')
      .replace(/export type \{[\s\S]*?\} from '@core[^']*';/g, '')));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[2] There is no second engine');
{
  // A verdict is arithmetic on specs. If any of this appears in a web
  // component, the web has started deciding compatibility for itself.
  const ENGINE_SMELLS: [string, RegExp][] = [
    ['a severity ordering of its own', /\[\s*'blocker'\s*,\s*'warning'/],
    ['a cell-count comparison', /cellCount\s*[<>!=]==?\s*\d/],
    ['a voltage comparison', /voltage\s*[<>]=?\s*\w/i],
    ['a current comparison', /(maxCurrent|currentA|amps)\s*[<>]=?/i],
    ['a stack-size comparison', /stackSize\s*[<>=]/i],
    ['its own findings array construction', /severity:\s*'(blocker|warning)'/],
    ['a hand-rolled confidence value', /confidence:\s*'(typed-spec|derived|manual-required)'/],
  ];

  for (const [rel, src] of SOURCES) {
    for (const [label, pattern] of ENGINE_SMELLS) {
      ok(`${rel}: no ${label}`, !pattern.test(src));
    }
  }

  // The one file allowed to name severities is the presentation map, and even
  // there the ORDER must come from the core rather than being retyped.
  const workspace = SOURCES.get('web/components/project/ProjectWorkspace.tsx') ?? '';
  ok('the workspace renders the core\'s severity order rather than its own',
    workspace.includes('SEVERITY_ORDER.map'));
  ok('the workspace computes findings through the core',
    /sortFindings\(computeFindings\(snapshot\)\)/.test(workspace));
  ok('the workspace computes the next step through the core',
    /computeNextStep\(snapshot, list\)/.test(workspace));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[3] There is no second store');
{
  for (const [rel, src] of SOURCES) {
    ok(`${rel}: does not name a storage key`, !/fpv-[a-z-]*-v\d/.test(src));
    ok(`${rel}: does not declare a schema version`, !/SCHEMA_VERSION\s*=/.test(src));
    ok(`${rel}: does not touch localStorage directly`, !/localStorage\./.test(src));
    ok(`${rel}: does not reach into Firestore`, !/firebase\/firestore|adminDb\(/.test(src));
  }

  // Every mutation goes through the store's own writers.
  const parts = SOURCES.get('web/components/project/ProjectParts.tsx') ?? '';
  ok('changing a part writes through saveAssemblyProject', /saveAssemblyProject\(/.test(parts));
  ok('the picker does not build a persisted payload of its own',
    !/partIds/.test(parts) && !/version:/.test(parts));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[4] No hand-written content paths');
{
  for (const [rel, src] of SOURCES) {
    // Content routes must go through webHref. Navigation between the project's
    // own pages and the top-level sections is allowed as a literal, because
    // those are this app's own shell rather than resolved content.
    const contentPaths = src.match(/["'`]\/(kb|diagnose|betaflight|programming|glossary)\/[^"'`]*["'`]/g) ?? [];
    ok(`${rel}: writes no content path by hand`, contentPaths.length === 0);
  }

  const finding = SOURCES.get('web/components/project/FindingCard.tsx') ?? '';
  ok('a finding\'s links resolve through the shared destination adapter',
    /kbLinkToDestination\(l\)/.test(finding) && /webHref\(dest\)/.test(finding));
  ok('a destination with no web page renders nothing rather than a dead anchor',
    /unavailableReasonAr/.test(finding));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[5] The engine\'s output is rendered WHOLE, not summarised away');
{
  const finding = SOURCES.get('web/components/project/FindingCard.tsx') ?? '';
  // Every field the core produces has to reach the reader. A card that showed
  // only the claim would turn a reasoned verdict back into an opinion.
  for (const field of ['claimAr', 'whyAr', 'evidenceAr', 'actionsAr', 'missingAr',
    'manualCheckAr', 'confidence', 'severity', 'links']) {
    ok(`the finding card renders ${field}`, finding.includes(field));
  }

  const workspace = SOURCES.get('web/components/project/ProjectWorkspace.tsx') ?? '';
  ok('the headline follows the WORST severity, never an average',
    /counts\.blocker > 0 \? 'blocker'/.test(workspace));
  ok('no percentage is computed anywhere in the workspace',
    !/percent|Math\.round\([^)]*\/[^)]*\* *100/i.test(workspace));

  const report = SOURCES.get('web/components/project/ProjectReport.tsx') ?? '';
  ok('the report reads the same findings rather than recomputing',
    /findings\.filter\(f => f\.severity === 'blocker'\)/.test(report));
  ok('readiness is withheld while a blocker exists',
    /counts\.blocker === 0/.test(report));
  ok('readiness is withheld while data is missing',
    /counts\.unknown === 0/.test(report));
  ok('readiness is withheld while the failsafe test is unrecorded',
    /failsafeTestedOn/.test(report) && /untested\.length === 0/.test(report));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[6] The engine itself still behaves — worst-case ordering and honesty');
{
  // Driven directly, so the properties the UI depends on are proven at the
  // source rather than inferred from a screenshot.
  const bare: ProjectSnapshot = {
    exists: true, stageIndex: 0, totalStages: buildStages.length, parts: {},
  };
  // A project with NOTHING in it yields no verdicts, and that is correct rather
  // than a gap: there is nothing to compare, and inventing a finding to fill the
  // screen would be the platform speaking without evidence. The UI's own empty
  // state is what covers this case.
  ok('a project with no parts produces no verdicts — silence over invention',
    computeFindings(bare).length === 0);

  // A real project is what the properties below are about.
  const real: ProjectSnapshot = {
    exists: true, stageIndex: 6, totalStages: buildStages.length,
    cellCount: 6, sizeInch: 5,
    motor: motors[0], esc: escs[0], battery: batteries[0], propeller: propellers[0],
    parts: {
      motors: motors[0], escs: escs[0], batteries: batteries[0], propellers: propellers[0],
    },
  };
  const findings = sortFindings(computeFindings(real));
  ok('a project with parts produces verdicts', findings.length > 0);

  const counts = countFindings(findings);
  ok('and they are counted by severity', Object.keys(counts).length >= 4);
  ok('the counts add up to the number of findings',
    counts.blocker + counts.warning + counts.unknown + counts.ok === findings.length);

  // Sorting must put the dangerous things first, whatever order they were
  // produced in — the UI relies on this and never re-sorts.
  const ranks = findings.map(f => SEVERITY_ORDER.indexOf(f.severity));
  ok('findings are sorted worst-first', ranks.every((r, i) => i === 0 || ranks[i - 1] <= r));

  // Nothing may claim to be verified while carrying missing data: that is the
  // "silence reads as approval" failure the model exists to prevent.
  ok('no finding is marked ok while listing missing data',
    findings.every(f => f.severity !== 'ok' || f.missingAr.length === 0));

  // Every non-confirmation must tell the reader what to do next.
  ok('every finding that is not a confirmation carries an action or a manual check',
    findings.every(f => f.severity === 'ok' || f.actionsAr.length > 0 || !!f.manualCheckAr));

  const next = computeNextStep(real, findings);
  ok('a next step is always produced', !!next.titleAr && !!next.reasonAr);
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[7] Categories, stages and checklists come from the core');
{
  ok('every catalogue category has an Arabic label',
    Object.keys(PART_CATEGORY_MAP).every(c => !!PART_CATEGORY_LABEL_AR[c]));
  ok('the label map has no entry for a category that does not exist',
    Object.keys(PART_CATEGORY_LABEL_AR).every(c => c in PART_CATEGORY_MAP));

  const parts = SOURCES.get('web/components/project/ProjectParts.tsx') ?? '';
  ok('the web reads the shared category labels rather than its own copy',
    parts.includes('PART_CATEGORY_LABEL_AR')
    && !/videoUnits:\s*'/.test(parts));

  const stages = SOURCES.get('web/components/project/BuildStages.tsx') ?? '';
  ok('build stages come from the shared roadmap data', stages.includes('roadmapData'));
  ok('their detail comes from the shared stage content', stages.includes('roadmapStageContent'));
  ok('checklists come from the shared checklist data', stages.includes('checklistsData'));
  ok('the stage list writes no stage text of its own',
    !/اللحام|التوصيل الآمن/.test(stages));

  // Every roadmap stage must actually have content, or the page renders a
  // heading with nothing under it.
  ok(`every roadmap stage has content (${roadmapData.length})`,
    roadmapData.every(s => !!roadmapStageContent[s.id as keyof typeof roadmapStageContent]));

  // The safety-critical fields the requirement named must be present somewhere
  // in the data, or the page cannot show them however well it is written.
  const anyStops = roadmapData.some(s =>
    (roadmapStageContent[s.id as keyof typeof roadmapStageContent]?.stopConditions.length ?? 0) > 0);
  ok('at least one stage declares a stop condition', anyStops);
  const anyWarnings = roadmapData.some(s =>
    (roadmapStageContent[s.id as keyof typeof roadmapStageContent]?.warnings.length ?? 0) > 0);
  ok('at least one stage declares a warning', anyWarnings);

  ok('the pre-flight checklist exists in the shared data',
    checklistsData.some(g => g.id === 'pre-flight'));
  ok('the before-battery checklist exists in the shared data',
    checklistsData.some(g => g.id === 'pre-battery'));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[8] Privacy — the project stays on the device');
{
  const page = read('web/app/project/page.tsx');
  ok('the project page is excluded from indexing', /robots:\s*\{\s*index:\s*false/.test(page));

  for (const [rel, src] of SOURCES) {
    ok(`${rel}: never posts the project anywhere`, !/fetch\(['"`]\/api/.test(src));
  }

  const workspace = SOURCES.get('web/components/project/ProjectWorkspace.tsx') ?? '';
  ok('the workspace says plainly where the project is stored',
    read('web/components/project/ProjectWorkspace.tsx').includes('محفوظ على هذا الجهاز'));
  ok('deleting asks first', /project-clear-confirm/.test(workspace));
  ok('the import path validates through the store rather than trusting the file',
    /importAssemblyProject\(parsed\)/.test(workspace));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[9] The assistant\'s foundations are intact and unweakened');
{
  // The bot is NOT built in this batch. What must survive is the structured
  // data it will one day read: abstract destinations, typed severities and
  // confidences, declared missing data, and per-page project context.
  const ctx = read('src/data/project/context.ts');
  for (const fn of ['projectPartsForModule', 'findingsForArticle', 'rcFactsForBetaflightPage',
    'findingsForDxTree', 'videoFactsForBetaflightPage', 'factsForBetaflightPage']) {
    ok(`the project-context helper ${fn} still exists`, ctx.includes(`export function ${fn}`));
  }

  const types = read('src/data/project/types.ts');
  for (const field of ['confidence', 'evidenceAr', 'missingAr', 'manualCheckAr', 'actionsAr', 'links']) {
    ok(`Finding still carries ${field}`, types.includes(field));
  }

  // No bot surface was started.
  ok('no chat or bot component was added to the web',
    !readdirSync(join(WEB, 'components')).some(d => /bot|chat|assistant/i.test(d)));

  // Every action the reader is shown has a destination, not just prose.
  const finding = SOURCES.get('web/components/project/FindingCard.tsx') ?? '';
  ok('a finding\'s destinations are rendered as real links a machine could follow',
    /finding\.links\.map/.test(finding));
}

console.log(`\n${failures.length === 0 ? '✅' : '❌'} testWebProject: ${passed} assertions passed, ${failures.length} failed\n`);
failures.forEach(f => console.log(`   - ${f}`));
assert.equal(failures.length, 0, `${failures.length} assertion(s) failed`);
