/**
 * Every part of a diagram a lesson gates on can be reached without a pointer.
 *
 * WHAT THIS EXISTS TO CATCH
 * -------------------------
 * The audit found seven diagrams whose interactive parts were bare SVG shapes
 * with an `onClick`: no role, no accessible name, no tab stop, no Enter. Seven
 * lessons cannot be COMPLETED without exploring such a shape — their readiness
 * gate requires it — so a learner who does not use a mouse or a touchscreen
 * was locked out of finishing them.
 *
 * The fix was one shared `HotSpot` wrapper (src/components/diagrams/
 * _shared.tsx). This file holds the rule down: no diagram may attach a click
 * handler to a raw shape again, every hotspot must carry a name, and the
 * lessons' gated diagrams must all be operable.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';
import type { InteractiveDiagramStage } from '../src/types/lessonJourney';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIAGRAMS = path.join(ROOT, 'src/components/diagrams');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const readDiagram = (f: string) => readFileSync(path.join(DIAGRAMS, f), 'utf8');
const FILES = readdirSync(DIAGRAMS).filter(f => f.endsWith('.tsx') && f !== '_shared.tsx');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The shared HotSpot is a real button');
{
  const shared = readDiagram('_shared.tsx');
  ok('HotSpot exists', /export const HotSpot/.test(shared));
  ok('it carries role="button"', /role="button"/.test(shared));
  ok('it is in the tab order', /tabIndex=\{0\}/.test(shared));
  ok('it takes an accessible name', /aria-label=\{label\}/.test(shared));
  ok('it reports toggle state', /aria-pressed=\{active\}/.test(shared));
  ok('Enter activates it', /e\.key === 'Enter'/.test(shared));
  ok('Space activates it, and does not scroll the page', /e\.key === ' '/.test(shared) && /preventDefault\(\)/.test(shared));
  ok('it is styleable for focus', /className="diagram-hotspot"/.test(shared));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] No diagram hangs a click handler on a bare SVG shape');
{
  const RAW_CLICKABLE = /<(g|rect|circle|line|path|polygon|ellipse|text)\b[^>]*\sonClick=/;
  const offenders = FILES.filter(f => RAW_CLICKABLE.test(readDiagram(f)));
  if (offenders.length) console.error('  RAW CLICK HANDLERS:', offenders.join(', '));
  ok(`none of the ${FILES.length} diagrams attaches onClick to a raw shape`, offenders.length === 0);

  // Anything interactive is either a real <button> or a HotSpot.
  const interactive = FILES.filter(f => /onClick=|<HotSpot/.test(readDiagram(f)));
  const unlabelled = interactive.filter(f => {
    const src = readDiagram(f);
    return /onClick=/.test(src) && !/<button/.test(src) && !/<HotSpot/.test(src);
  });
  ok(`all ${interactive.length} interactive diagrams use <button> or HotSpot`, unlabelled.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Every hotspot says what it is');
{
  /**
   * The opening tags of `<Name …>`, brace-aware — an arrow function in a prop
   * (`onActivate={() => …}`) puts a `>` inside the tag, so a lazy regex ends
   * the tag in the wrong place and reports every hotspot as unlabelled.
   */
  function openingTags(src: string, name: string): string[] {
    const out: string[] = [];
    const re = new RegExp(`<${name}\\b`, 'g');
    for (let m = re.exec(src); m; m = re.exec(src)) {
      let depth = 0;
      for (let i = m.index + name.length + 1; i < src.length; i++) {
        const ch = src[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === '>' && depth === 0) { out.push(src.slice(m.index, i + 1)); break; }
      }
    }
    return out;
  }

  const missing: string[] = [];
  let total = 0;
  for (const f of FILES) {
    for (const tag of openingTags(readDiagram(f), 'HotSpot')) {
      total++;
      if (!/\blabel=/.test(tag)) missing.push(`${f}: ${tag.slice(0, 60)}…`);
    }
  }
  if (missing.length) console.error('  HOTSPOTS WITHOUT A LABEL:', missing.join(', '));
  ok(`all ${total} hotspots across the section carry an accessible name`, missing.length === 0);
  // Not vacuous: the seven diagrams the audit found unreachable, plus the one
  // that already had parallel buttons, all declare hotspots in source. Several
  // of those declarations render four or five hotspots at runtime (a motor per
  // corner, a node per stage of the chain).
  const withHotspots = FILES.filter(f => /<HotSpot\b/.test(readDiagram(f)));
  ok(`${withHotspots.length} diagram files declare hotspots (${total} declarations)`,
    withHotspots.length >= 8 && total >= 15);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Focus is visible on both surfaces');
{
  for (const [file, selector] of [
    ['src/index.css', /\.diagram-hotspot:focus-visible\s*\{/],
    ['web/app/lessons/lessons.css', /\.lesson-diagram \.diagram-hotspot:focus-visible\s*\{/],
  ] as const) {
    const css = read(file);
    ok(`${file} draws a focus ring on hotspots`, selector.test(css));
    const at = css.search(selector);
    ok(`${file}'s ring does not rely on outline alone (SVG support varies)`,
      /drop-shadow/.test(css.slice(at, at + 220)));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Every diagram a lesson GATES on is operable without a pointer');
{
  // diagramType -> component name, read from the adapter table rather than
  // assumed, so renaming a component cannot quietly skip this check.
  const adapters = read('src/components/lessons/interactiveDiagramAdapters.tsx');
  const byType = new Map<string, string>();
  for (const m of adapters.matchAll(/'([a-z0-9-]+)':\s*\(\{[^}]*\}\)\s*=>\s*\(\s*<(\w+)/g)) byType.set(m[1], m[2]);
  ok(`the adapter table maps ${byType.size} diagram types`, byType.size >= 17);

  let gated = 0;
  for (const lesson of lessonsData) {
    const def = getLessonJourneyDefinition(lesson.id)!;
    for (const stage of def.stages.filter((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram')) {
      const component = byType.get(stage.diagramType);
      assert.ok(component, `FAILED: no adapter for ${stage.diagramType} (lesson ${lesson.number})`);
      const src = readDiagram(`${component}.tsx`);
      assert.ok(/<HotSpot|<button/.test(src),
        `FAILED: lesson ${lesson.number} cannot be completed without a pointer — ${component} has no keyboard-operable control`);
      gated++;
    }
  }
  ok(`all ${gated} gated diagrams (one per lesson) can be operated from the keyboard`, gated === lessonsData.length);
}

console.log(`\nAll ${passed} assertions passed.`);
