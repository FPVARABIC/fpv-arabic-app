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
 *
 * A SECOND SHAPE, FOUND THE SAME WAY
 * ----------------------------------
 * A browser pass over the enriched lessons caught «35-45A» rendering as
 * «45A-35». Digits are bidi-WEAK and a trailing Latin unit is bidi-STRONG, so
 * a range that carries its unit on one end only splits into two runs, which an
 * RTL paragraph then orders right-to-left — the learner reads the range
 * backwards. Repeating the unit on both ends («35A-45A», «6mm-8mm») keeps it a
 * single left-to-right island. «3S-4S» was already safe for the same reason.
 * Three lessons carried the broken shape — 4, 8 and 12 — and none does now.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

/**
 * Every hyphenated range whose two ends disagree on bidi class, as a snippet.
 * Both halves must carry the unit, or neither may.
 */
export function flippedRanges(text: string): string[] {
  const out: string[] = [];
  // unit on the right only: 35-45A  ·  unit on the left only: 35A-45
  for (const re of [/\d+-\d+[A-Za-z]/g, /\d+[A-Za-z]+-\d+(?![A-Za-z0-9.])/g]) {
    for (const m of text.matchAll(re)) out.push(m[0]);
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

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Hyphenated ranges survive the bidi algorithm too');
{
  ok('a range with the unit on one end only is caught', flippedRanges('يحتاج 35-45A فعليًا').length === 1);
  ok('…and so is the mirror of it', flippedRanges('يحتاج 35A-45 فعليًا').length === 1);
  ok('a range with the unit on both ends is left alone', flippedRanges('يحتاج 35A-45A فعليًا').length === 0);
  ok('…including a two-letter unit', flippedRanges('بطول 6mm-8mm تقريبًا').length === 0);
  ok('a cell-count range is already safe', flippedRanges('لبطاريات 3S-4S فقط').length === 0);
  ok('a plain year or a lone figure is not a range', flippedRanges('راجعناه 2026 وبتيار 20A').length === 0);
  // Lesson 8's rail range sat inside brackets, which are neutral and hide
  // nothing: «(14-25V)» rendered as «25V-14». Both forms are pinned here.
  ok('brackets do not excuse a one-ended range', flippedRanges('جهد البطارية الكامل (14-25V) يُستخدم').length === 1);
  ok('…and the fixed form inside brackets is clean', flippedRanges('جهد البطارية الكامل (14V-25V) يُستخدم').length === 0);

  const offenders: string[] = [];
  for (const lesson of lessonsData) {
    const def = enrichJourneyDefinition(getLessonJourneyDefinition(lesson.id)!, lesson);
    for (const s of [...strings(lesson), ...strings(def.stages)]) {
      for (const bad of flippedRanges(s)) offenders.push(`L${lesson.number}: ${bad}`);
    }
  }
  if (offenders.length) console.error('  RANGES THAT RENDER BACKWARDS:', [...new Set(offenders)].join(', '));

  // The ratchet reached zero: Lesson 4's «35-45A», Lesson 12's «6-8mm» and
  // Lesson 8's «14-25V» were the whole set, and all three now carry the unit
  // on both ends. There is no allowance left to spend — a single new one
  // fails this suite.
  const distinct = [...new Set(offenders)];
  ok(`no lesson range renders backwards (found ${distinct.length})`, distinct.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] The three ranges that were flipped, stated the way that survives');
{
  const l4 = lessonsData.find(l => l.id === 'lesson-define-goal')!;
  const l8 = lessonsData.find(l => l.id === 'lesson-power-rails')!;
  const l12 = lessonsData.find(l => l.id === 'lesson-motor-install')!;
  ok('lesson 4 states the motor current range with the unit on both ends', l4.explanation.includes('35A-45A'));
  ok('lesson 8 states the VBAT rail range with the unit on both ends', l8.explanation.includes('14V-25V'));
  ok('lesson 12 states the screw length range with the unit on both ends', l12.explanation.includes('6mm-8mm'));
  ok('and none of the three kept its one-ended form',
    ![l4, l8, l12].some(l => /35-45A|14-25V|6-8mm/.test(l.explanation)));
}

console.log(`\nAll ${passed} assertions passed.`);

// ─────────────────────────────────────────────────────────────────────────────
// P2-C — the same two defects, everywhere else the app renders Arabic.
//
// WHAT THE BROWSER PROVED, AND WHY THE RULE IS NARROWER THAN IT LOOKS
// -------------------------------------------------------------------
// A screenshot of every candidate shape, rendered in a real `dir="rtl"`
// paragraph, settled three things that a source grep cannot:
//
//   «لجهد 2-6S»            shows «6S-2»          — broken
//   «DC 10-28V»            shows «DC 10-28V»     — fine, the Latin token anchors it
//   «operatingVoltageRange: 7-36V»               — fine, same reason
//   «105-110dB تقريباً»    shows as written      — fine, Arabic AFTER does not split it
//   «(Model ← Inputs)»     reader meets Inputs first — broken
//   «(2207 ← 2306)»        reader meets 2207 first   — fine, both ends are weak digits
//   «دخان → افصل فوراً»    order preserved       — fine, the glyph is the only wart
//
// So the rule is not «no hyphenated ranges» and not «no arrows». It is:
//   1. a range whose leading digits have no strong left-to-right anchor in the
//      same run, and whose two ends therefore land in different runs, and
//   2. a «←» absorbed into a left-to-right island, which then points from the
//      second item back to the first.
//
// Everything else measured clean and is left alone: 156 occurrences outside the
// lessons are user-visible and correct, and 454 are ids, slugs, URLs and dates
// that are never rendered as a range at all.
{
  const SHIPPED = ['src/data', 'src/components', 'src/views', 'web/app', 'web/components', 'web/lib'];
  const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', 'out']);
  const CODE = new Set(['.ts', '.tsx']);

  const listFiles = (dir: string, into: string[] = []): string[] => {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return into; }
    for (const e of entries) {
      if (SKIP_DIRS.has(e)) continue;
      const p = path.join(dir, e);
      if (statSync(p).isDirectory()) listFiles(p, into);
      else if (CODE.has(path.extname(e))) into.push(p);
    }
    return into;
  };

  /**
   * String literals only. Comments, identifiers and JSX attribute names are not
   * user-visible, and the brief for this pass is explicit that they are not to
   * be touched — so they are not scanned either.
   */
  const literalsOf = (src: string): string[] => {
    const out: string[] = [];
    const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) out.push(m[1] ?? m[2] ?? m[3] ?? '');
    return out;
  };

  // Never a range a reader sees: a URL or a fragment of one, a slug, an SVG
  // path, a CSS-ish token, an ISO date. Excluding these is what keeps the guard
  // from failing on semver, hashes and timestamps.
  const notRendered = (s: string): boolean =>
    /^https?:\/\//.test(s.trim())
    || /^\/[\w/-]*$/.test(s.trim())
    || /^[a-z0-9]+(?:-[a-z0-9.]+)+-?$/.test(s.trim())
    || (/^[Mm][\d\s.,-]/.test(s.trim()) && /[cChHvVlLzZ]/.test(s))
    || (/^[a-z-]+(?::|\s)|^[\w-]+\s+[\w-]+$/.test(s.trim()) && !ARABIC.test(s))
    || /\d{4}-\d{2}/.test(s);

  const ARABIC_STRONG = /[ؠ-ي٠-٬ٱ-ۓ]/;
  const RANGE_ANYWHERE = /(?<![\w.:])\d+(?:\.\d+)?-\d+(?:\.\d+)?[A-Za-z]*(?![\w.:])/g;

  /** Is there a strong left-to-right anchor before this index, in the same run? */
  const anchoredLeft = (text: string, idx: number): boolean => {
    for (let i = idx - 1; i >= 0; i--) {
      const c = text[i];
      if (/[\s،;؛:/·×(«"'[\]]/.test(c)) { if (ARABIC_STRONG.test(c)) return false; continue; }
      if (ARABIC_STRONG.test(c)) return false;
      if (LATIN.test(c)) return true;
      if (/\d/.test(c)) continue;
      return false;
    }
    // Nothing to its left at all: the range opens the string, so no run can
    // split it. «105-110dB تقريباً» and a bare «7-36V» both measured clean.
    return true;
  };

  /** Ranges that land in two different runs and therefore read backwards. */
  const unanchoredRanges = (text: string): string[] => {
    if (notRendered(text)) return [];
    const out: string[] = [];
    RANGE_ANYWHERE.lastIndex = 0;
    for (const m of text.matchAll(RANGE_ANYWHERE)) {
      if (!anchoredLeft(text, m.index!)) out.push(m[0]);
    }
    return out;
  };

  /** «←» inside a left-to-right island — it points back at what came first. */
  const islandArrows = (text: string): string[] => {
    const out: string[] = [];
    const strip = (w: string) => w.replace(/^[()[\]{}«»؛،,.:"']+|[()[\]{}«»؛،,.:"']+$/g, '');
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== '←') continue;
      const prev = strip(text.slice(0, i).trimEnd().split(/\s+/).pop() ?? '');
      const next = strip(text.slice(i + 1).trimStart().split(/\s+/)[0] ?? '');
      if (!prev || !next) continue;
      if (!ARABIC_STRONG.test(prev + next) && LATIN.test(prev + next)) {
        out.push(text.slice(Math.max(0, i - 26), i + 27).replace(/\s+/g, ' '));
      }
    }
    return out;
  };

  console.log('\n[8] The rule, checked on the shapes the browser measured');
  ok('an unanchored range is caught', unanchoredRanges('لجهد 2-6S فقط').length === 1);
  ok('…and the repeated-unit fix is clean', unanchoredRanges('لجهد 2S-6S فقط').length === 0);
  ok('a range anchored by a Latin token is left alone', unanchoredRanges('DC 10-28V؛ DC 200W').length === 0);
  ok('…including a spec row keyed in Latin', unanchoredRanges('operatingVoltageRange: 7-36V').length === 0);
  ok('a range with Arabic only AFTER it is left alone', unanchoredRanges('105-110dB تقريباً').length === 0);
  ok('an ISO date is not a range', unanchoredRanges('2026-09-07T08:09:05Z').length === 0);
  ok('a semver-ish build tag is not a range', unanchoredRanges('index-D7y28B7w').length === 0);
  ok('a URL is not a range', unanchoredRanges('https://shop.example.com/xing2-2207-4s-6s-motor').length === 0);
  ok('a «←» between two Latin words is caught', islandArrows('شاشة المدخلات (Model ← Inputs)').length === 1);
  ok('…and one with a Latin token and a ratio is caught', islandArrows('معدل الحزم: 1000Hz ← 1:128').length === 1);
  ok('a «←» between two Arabic runs is left alone', islandArrows('نزع المراوح ← فحص بصري').length === 0);
  ok('a «←» between two bare numbers is left alone', islandArrows('قطر أكبر (2207 ← 2306)').length === 0);

  console.log('\n[9] Every shipped surface outside the lessons');
  {
    const files = SHIPPED.flatMap(d => listFiles(path.join(ROOT, d)))
      .filter(f => {
        const rel = path.relative(ROOT, f);
        return !rel.startsWith('src/data/lessons/') && rel !== 'src/data/lessonsData.ts';
      });
    const offenders: string[] = [];
    let scanned = 0;
    for (const f of files) {
      const rel = path.relative(ROOT, f);
      for (const s of literalsOf(readFileSync(f, 'utf8'))) {
        scanned++;
        for (const bad of unanchoredRanges(s)) offenders.push(`${rel}: range «${bad}»`);
        for (const bad of islandArrows(s)) offenders.push(`${rel}: arrow …${bad}…`);
      }
    }
    if (offenders.length) console.error('  UNSAFE:\n    ' + [...new Set(offenders)].join('\n    '));
    // The ratchet is zero, with no allowance: the 66 real defects this pass found
    // are all fixed, and one new one fails this suite.
    ok(`no unsafe range or arrow in ${scanned} shipped strings across ${files.length} files`, offenders.length === 0);
  }
}
