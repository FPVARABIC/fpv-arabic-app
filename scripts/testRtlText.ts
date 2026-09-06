/**
 * Arrows that survive the bidi algorithm.
 *
 * WHAT THIS EXISTS TO CATCH
 * -------------------------
 * A screenshot in the audit caught Lesson 9's key points rendering as
 * «TX (من Receiver) → RX (في FC)» with the two halves swapped: an arrow
 * dropped between two Arabic runs is a NEUTRAL character, so it takes the
 * surrounding paragraph's right-to-left direction and ends up pointing back at
 * the thing it came from. The learner reads the wiring rule backwards.
 *
 * THE RULE THIS ENFORCES
 * ----------------------
 * It is not «no arrows». An arrow inside a run of Latin — «Radio → Receiver →
 * FC» — sits in a left-to-right island and renders exactly as written, and
 * «كاميرا ← VTX» is right too, because in an RTL line the LEFT-pointing arrow
 * is the one that means «and then». What is banned is the combination that
 * cannot be read: a rightwards arrow with Arabic on both sides of it, and a
 * leftwards arrow marooned between two Latin tokens.
 *
 * Prose beats punctuation for this anyway; the fixes said «يدخل».
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';
import { enrichJourneyDefinition } from '../src/data/lessons/lessonJourneyEnrich';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIAGRAMS = path.join(ROOT, 'src/components/diagrams');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

// A Unicode script property rather than a hand-typed range: the old range
// ended at U+FEFF, a zero-width no-break space that is invisible in an editor
// and that the linter rightly refuses.
const ARABIC = /\p{Script=Arabic}/u;
const LATIN = /[A-Za-z]/;

/** Every unreadable arrow in one string, as a short quoted snippet. */
export function badArrows(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '→' && ch !== '←') continue;
    const before = text.slice(0, i);
    const after = text.slice(i + 1);
    const snippet = text.slice(Math.max(0, i - 28), i + 29).replace(/\s+/g, ' ');

    if (ch === '→') {
      // Arabic on both sides: the arrow is inside an RTL run and points back.
      if (ARABIC.test(before) && ARABIC.test(after)) { out.push(snippet); continue; }
      // An Arabic string that OPENS with an arrow has nothing to anchor it.
      if (!before.trim() && ARABIC.test(after)) out.push(snippet);
    } else {
      // «←» belongs between Arabic runs. Between two Latin tokens it points
      // the wrong way inside a left-to-right island.
      const prevToken = before.trimEnd().split(/\s+/).pop() ?? '';
      const nextToken = after.trimStart().split(/\s+/)[0] ?? '';
      const neighbours = `${prevToken}${nextToken}`;
      if (!ARABIC.test(neighbours) && LATIN.test(neighbours)) out.push(snippet);
    }
  }
  return out;
}

/** Every string inside a value, however deeply nested. */
function strings(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, into);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, into);
  return into;
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The rule itself');
{
  ok('a rightwards arrow between two Arabic runs is caught',
    badArrows('يلمس الملفات → يحترق').length === 1);
  ok('…and one with Arabic on both sides even through Latin parentheses',
    badArrows('TX (من Receiver) → RX (في FC)').length === 1);
  ok('a leading arrow in an Arabic string is caught', badArrows('→ رفع').length === 1);
  ok('a chain of Latin names is left alone',
    badArrows('فهم مسار الإشارة الكامل: Radio → Receiver → FC → ESC → Motors').length === 0);
  ok('a bare Latin label is left alone', badArrows('TX→RX').length === 0);
  ok('a leftwards arrow between Arabic runs is left alone — it means «ثم» here',
    badArrows('نزع المراوح ← فحص بصري ← فحص المقاومة').length === 0);
  ok('a leftwards arrow marooned between two Latin tokens is caught',
    badArrows('مخطط واضح: TX ← RX').length === 1);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Every lesson record');
{
  const offenders: string[] = [];
  for (const lesson of lessonsData) {
    for (const s of strings(lesson)) for (const bad of badArrows(s)) offenders.push(`L${lesson.number}: …${bad}…`);
  }
  if (offenders.length) console.error(offenders.join('\n'));
  ok(`no unreadable arrow in any of the ${lessonsData.length} lesson records`, offenders.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Every stage a learner walks through, after enrichment');
{
  const offenders: string[] = [];
  let checked = 0;
  for (const lesson of lessonsData) {
    const def = enrichJourneyDefinition(getLessonJourneyDefinition(lesson.id)!, lesson);
    for (const stage of def.stages) {
      for (const s of strings(stage)) {
        checked++;
        for (const bad of badArrows(s)) offenders.push(`L${lesson.number}/${stage.id}: …${bad}…`);
      }
    }
  }
  if (offenders.length) console.error(offenders.join('\n'));
  ok(`no unreadable arrow across ${checked} authored strings in the section`, offenders.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] The diagrams, which carry their own Arabic labels');
{
  const files = readdirSync(DIAGRAMS).filter(f => f.endsWith('.tsx'));
  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(path.join(DIAGRAMS, f), 'utf8');
    src.split('\n').forEach((line, i) => {
      for (const bad of badArrows(line)) offenders.push(`${f}:${i + 1}: …${bad}…`);
    });
  }
  if (offenders.length) console.error(offenders.join('\n'));
  ok(`no unreadable arrow in any of the ${files.length} diagrams`, offenders.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] The two points the screenshot caught now read as sentences');
{
  const l9 = lessonsData.find(l => l.id === 'lesson-tx-rx')!;
  const l15 = lessonsData.find(l => l.id === 'lesson-receiver-install')!;
  ok('lesson 9 states the crossing in words', l9.importantPoints.some(p => /TX من المستقبل يدخل RX/.test(p)));
  ok('lesson 15 states it in words too', l15.importantPoints.some(p => /يدخل RX في FC/.test(p)));
  ok('neither uses an arrow any more',
    [...l9.importantPoints, ...l15.importantPoints].every(p => !p.includes('→') && !p.includes('←')));
}

console.log(`\nAll ${passed} assertions passed.`);
