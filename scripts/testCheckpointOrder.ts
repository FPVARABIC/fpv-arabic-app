/**
 * The quiz measures knowledge rather than pattern-spotting.
 *
 * WHAT THIS EXISTS TO CATCH
 * -------------------------
 * The audit measured two tells in the section's 68 checkpoints: the correct
 * option was authored at «b» 57 times and never at «d», and it was the longest
 * option 62 times — by up to 88 characters. Either one lets a learner score
 * without reading, which makes «X من 4 من أول محاولة» a number about nothing.
 *
 * The display order is now permuted from the checkpoint's own id
 * (`src/data/lessons/checkpointOrder.ts`), and the worst length gaps were
 * rewritten. This file holds both properties down: the position distribution
 * stays spread, no correct answer grows back into a giveaway, and the ids
 * everything else is keyed by never move.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';
import {
  displayOptions, correctOptionPosition, shuffledBySeed,
} from '../src/data/lessons/checkpointOrder';
import {
  createInitialSessionState, recordCheckpointAnswer, quizResult,
} from '../src/data/lessons/lessonJourneyEngine';
import type { CheckpointStage } from '../src/types/lessonJourney';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const CHECKPOINTS = lessonsData.flatMap(l =>
  getLessonJourneyDefinition(l.id)!.stages
    .filter((s): s is CheckpointStage => s.type === 'checkpoint')
    .map(s => ({ lesson: l.number, checkpoint: s.checkpoint })));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The order is a permutation, and the same one every time');
{
  ok(`the section has ${CHECKPOINTS.length} checkpoints to order`, CHECKPOINTS.length === 68);

  for (const { checkpoint } of CHECKPOINTS) {
    const shown = displayOptions(checkpoint);
    const sameSet = [...shown].map(o => o.id).sort().join('')
      === [...checkpoint.options].map(o => o.id).sort().join('');
    assert.ok(shown.length === checkpoint.options.length && sameSet,
      `FAILED: ${checkpoint.id} lost or duplicated an option`);
    assert.ok(displayOptions(checkpoint).map(o => o.id).join('') === shown.map(o => o.id).join(''),
      `FAILED: ${checkpoint.id} ordered differently on a second call`);
    assert.ok(shown.every(o => checkpoint.options.includes(o)),
      `FAILED: ${checkpoint.id} handed back an option object it was not given`);
  }
  ok('every checkpoint keeps all four options, exactly once', true);
  ok('every checkpoint orders identically on a repeat call (a saved answer never jumps)', true);
  ok('the options handed back are the authored objects, feedback and all', true);

  ok('a different seed generally gives a different order',
    shuffledBySeed('one', ['a', 'b', 'c', 'd']).join('') !== shuffledBySeed('two', ['a', 'b', 'c', 'd']).join(''));
  ok('an empty or single option list is handled',
    shuffledBySeed('x', []).length === 0 && shuffledBySeed('x', ['only']).join('') === 'only');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] The correct answer is no longer parked in one place');
{
  const counts = [0, 0, 0, 0];
  for (const { checkpoint } of CHECKPOINTS) counts[correctOptionPosition(checkpoint)]++;
  const pct = counts.map(n => Math.round((100 * n) / CHECKPOINTS.length));
  console.log(`      display positions 1..4: ${counts.join(' / ')}  (${pct.join('% / ')}%)`);

  ok('every one of the four positions is used', counts.every(n => n > 0));
  ok('no position holds more than 40% of the answers', counts.every(n => n / CHECKPOINTS.length <= 0.40));
  ok('no position holds less than 10% of the answers', counts.every(n => n / CHECKPOINTS.length >= 0.10));

  // The authored data still has its bias — that is fine, and this records why
  // the display order is not simply the authored one.
  const authored = CHECKPOINTS.filter(({ checkpoint }) =>
    checkpoint.options.findIndex(o => o.correct) === 1).length;
  ok(`the authored data is still skewed (${authored} answers at «b»), so the display order must not be the authored one`,
    authored > CHECKPOINTS.length / 2);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] The correct answer is not the longest one by a giveaway margin');
{
  // Both bounds are ratchets: they may be tightened, never loosened.
  const MAX_GAP = 44;      // characters longer than the longest distractor
  const MAX_RATIO = 1.95;  // times the length of the longest distractor
  const worst: { id: string; gap: number; ratio: number }[] = [];

  for (const { checkpoint } of CHECKPOINTS) {
    const correct = checkpoint.options.find(o => o.correct)!;
    const longestDistractor = Math.max(...checkpoint.options.filter(o => !o.correct).map(o => o.text.length));
    const gap = correct.text.length - longestDistractor;
    const ratio = correct.text.length / longestDistractor;
    if (gap > MAX_GAP || ratio > MAX_RATIO) worst.push({ id: checkpoint.id, gap, ratio: +ratio.toFixed(2) });
  }
  if (worst.length) console.error('  TOO REVEALING:', worst);
  ok(`no correct answer runs more than ${MAX_GAP} characters past the longest distractor`, worst.length === 0);

  const stillLongest = CHECKPOINTS.filter(({ checkpoint }) => {
    const correct = checkpoint.options.find(o => o.correct)!;
    return correct.text.length > Math.max(...checkpoint.options.filter(o => !o.correct).map(o => o.text.length));
  }).length;
  console.log(`      correct is still the longest option in ${stillLongest}/${CHECKPOINTS.length}, but never by more than ${MAX_GAP} characters`);
  ok('every checkpoint still has exactly one correct option',
    CHECKPOINTS.every(({ checkpoint }) => checkpoint.options.filter(o => o.correct).length === 1));
  ok('every option still carries its own feedback',
    CHECKPOINTS.every(({ checkpoint }) => checkpoint.options.every(o => o.feedback.trim().length > 20)));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Scoring is keyed by id, so the new order changes no result');
{
  const lesson = lessonsData[0];
  const def = getLessonJourneyDefinition(lesson.id)!;
  const stages = def.stages.filter((s): s is CheckpointStage => s.type === 'checkpoint');

  // Answer each question by picking the FIRST shown option, whatever it is.
  let first = createInitialSessionState(def);
  for (const stage of stages) first = recordCheckpointAnswer(first, stage.checkpoint.id, displayOptions(stage.checkpoint)[0].id);
  const shownFirstIsCorrect = stages.filter(s => displayOptions(s.checkpoint)[0].correct).length;
  ok('answering «whatever is on top» scores exactly the number of questions whose top option is correct',
    quizResult(def, first).correctFirstTry === shownFirstIsCorrect);

  // Answer each question with its correct option, found by the `correct` flag.
  let right = createInitialSessionState(def);
  for (const stage of stages) right = recordCheckpointAnswer(right, stage.checkpoint.id, stage.checkpoint.options.find(o => o.correct)!.id);
  const r = quizResult(def, right);
  ok('answering correctly still scores full marks', r.correctFirstTry === stages.length && r.missedFirstTry.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Both renderers order through the shared function');
{
  for (const file of ['web/components/lessons/journeyParts.tsx', 'src/components/lessons/journeyStageComponents.tsx']) {
    const src = read(file);
    ok(`${file} orders through displayOptions`, /displayOptions\(checkpoint\)\.map\(/.test(src));
    ok(`${file} no longer maps the authored array directly`, !/checkpoint\.options\.map\(/.test(src));
  }
  ok('the option test ids are still the option ids, not their positions',
    /data-testid=\{`checkpoint-\$\{checkpoint\.id\}-option-\$\{opt\.id\}`\}/.test(read('web/components/lessons/journeyParts.tsx')));
}

console.log(`\nAll ${passed} assertions passed.`);
