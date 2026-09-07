/**
 * Assessment quality regression guards (P2-A).
 *
 * These guard the four defects the assessment audit found, and nothing more:
 *   1. a single recognition stem reused across a whole lesson,
 *   2. correct answers copied verbatim out of the stage immediately before them,
 *   3. two questions in different lessons answerable from the same option shape,
 *   4. "pick the longest option" working as a strategy.
 *
 * Every threshold below is a THRESHOLD WITH HEADROOM, not the current value.
 * The bank is written by hand in Arabic; demanding exact type quotas, equal
 * option lengths, or zero textual overlap would fail on legitimate edits and
 * push future authors to game the numbers instead of writing better questions.
 * Each bound states what it is protecting and how much slack it leaves.
 */
import assert from 'node:assert';
import {
  RECOGNITION_STEM, collectCheckpoints, questionKind,
  leakagePercent, similarityPercent, lengthBias,
} from './assessmentMetrics';
import { displayOptions, correctOptionPosition } from '../src/data/lessons/checkpointOrder';

let passed = 0;
const ok = (label: string, condition: boolean, detail = '') => {
  assert.ok(condition, `FAILED: ${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`  ok — ${label}${detail ? ` (${detail})` : ''}`);
  passed++;
};

const rows = collectCheckpoints();

console.log('\n[1] No lesson leans on one recognition stem for its whole question set');
{
  // Twelve questions across lessons 13, 14 and 16 opened with this exact phrase,
  // which made them interchangeable and answerable by pattern rather than thought.
  // The phrase is banned outright: it is a specific string, not a style judgement.
  const usingStem = rows.filter(r => r.checkpoint.question.startsWith(RECOGNITION_STEM));
  ok('the recognition stem "أيّ من التالي صحيح بخصوص" appears in no question', usingStem.length === 0,
    `${usingStem.length} of ${rows.length}`);

  // A softer guard against the same failure re-emerging under a different phrase:
  // no single four-word opening may be shared by more than a quarter of one lesson's
  // bank plus a margin. Four questions per lesson means a shared opening of 3+ is a pattern.
  const byLesson: Record<number, string[]> = {};
  for (const r of rows) (byLesson[r.lesson] ??= []).push(r.checkpoint.question.split(/\s+/).slice(0, 4).join(' '));
  for (const [lesson, stems] of Object.entries(byLesson)) {
    const counts = stems.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});
    const worst = Math.max(...Object.values(counts));
    ok(`lesson ${lesson}: no four-word opening is reused by 3+ of its questions`, worst <= 2, `worst = ${worst}`);
  }
}

console.log('\n[2] The bank asks for more than recall');
{
  // Not a quota. Understanding-level questions are legitimate and most of the bank
  // is deliberately at that level for beginners. The floor only guards against the
  // bank sliding back to being mostly recall.
  const beyondRecall = rows.filter(r => !['RECOG', 'UNDER'].includes(questionKind(r.checkpoint.question))).length;
  const pct = Math.round(100 * beyondRecall / rows.length);
  ok('at least 40% of questions diagnose, decide or apply rather than check understanding', pct >= 40,
    `${beyondRecall}/${rows.length} = ${pct}%`);

  // The three remediated lessons must each keep a genuine mix: four questions of
  // one single kind is exactly the state P2-A removed.
  for (const lesson of [13, 14, 16]) {
    const kinds = new Set(rows.filter(r => r.lesson === lesson).map(r => questionKind(r.checkpoint.question)));
    ok(`lesson ${lesson} asks at least three different kinds of thinking`, kinds.size >= 3, [...kinds].join('/'));
  }
}

console.log('\n[3] Correct answers are not copied out of the stage before them');
{
  // Leakage is the share of the correct answer's meaningful words that already appear
  // in the immediately preceding stage. Some overlap is unavoidable and desirable —
  // the answer must use the lesson's own terminology — so only the severe band is banned.
  const severe = rows.map(r => ({ r, pct: leakagePercent(r) })).filter(x => x.pct >= 88);
  ok('no correct answer repeats 88% or more of the preceding stage\'s wording', severe.length === 0,
    severe.map(x => `${x.r.checkpoint.id} ${x.pct}%`).join(', '));

  // A ceiling on the milder band too, so leakage cannot creep back one question at a time.
  const over55 = rows.filter(r => leakagePercent(r) > 55).length;
  ok('at most 18 questions sit above 55% overlap with the stage before them', over55 <= 18,
    `${over55}/${rows.length}`);
}

console.log('\n[4] No two questions are answerable from the same option shape');
{
  // Lesson 6 (reverse polarity) and lesson 8 (wrong power rail) used to share 86% of
  // the words in their correct answers, so answering one taught you to answer the other
  // without knowing anything new. Adjacent lessons revisiting one principle SHOULD share
  // vocabulary, so the bound sits well above deliberate retrieval and below duplication.
  const worst: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const pct = similarityPercent(rows[i].checkpoint, rows[j].checkpoint);
      if (pct > 75) worst.push(`L${rows[i].lesson} ${rows[i].checkpoint.id} ~ L${rows[j].lesson} ${rows[j].checkpoint.id} = ${pct}%`);
    }
  }
  ok('no pair of correct answers shares more than 75% of its words', worst.length === 0, worst.join('; '));
}

console.log('\n[5] "Choose the longest option" is not a working strategy');
{
  // The goal is NOT equal character counts. A few characters' difference is invisible
  // to a reader; a correct answer that runs 30+ characters past every distractor is a
  // visible tell. Both bounds may be tightened, never loosened.
  const biases = rows.map(r => ({ id: `L${r.lesson} ${r.checkpoint.id}`, ...lengthBias(r.checkpoint) }));
  const worstGap = biases.reduce((a, b) => (b.gap > a.gap ? b : a));
  ok('no correct answer exceeds every distractor by more than 30 characters', worstGap.gap <= 30,
    `${worstGap.id} gap ${worstGap.gap}`);

  const worstRatio = biases.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  ok('no correct answer is more than 1.6x the longest distractor', worstRatio.ratio <= 1.6,
    `${worstRatio.id} ratio ${worstRatio.ratio}`);

  // And the tell must be rare, not merely bounded: at most a third of the bank may
  // have the correct answer visibly longer (15 characters is roughly two Arabic words).
  const visible = biases.filter(b => b.gap >= 15).length;
  const pct = Math.round(100 * visible / rows.length);
  ok('at most 33% of questions have a visibly longer correct answer (15+ characters)', pct <= 33,
    `${visible}/${rows.length} = ${pct}%`);
}

console.log('\n[6] Answer identity, order and evaluation are untouched by the rewrites');
{
  ok('every checkpoint still uses the stable option ids a, b, c, d',
    rows.every(r => r.checkpoint.options.map(o => o.id).join('') === 'abcd'));
  ok('every checkpoint still has exactly one correct option',
    rows.every(r => r.checkpoint.options.filter(o => o.correct).length === 1));

  // Display order is seeded by checkpoint id, so rewriting the text of an option must
  // not move it. Calling twice must give the identical order.
  ok('display order is deterministic for every checkpoint',
    rows.every(r => JSON.stringify(displayOptions(r.checkpoint).map(o => o.id))
      === JSON.stringify(displayOptions(r.checkpoint).map(o => o.id))));

  // Position bias: the correct answer must not cluster in one slot. P2-A kept every
  // correct answer at its authored letter precisely so this distribution did not move.
  const positions = [0, 0, 0, 0];
  for (const r of rows) positions[correctOptionPosition(r.checkpoint)]++;
  for (const [slot, n] of positions.entries()) {
    const pct = Math.round(100 * n / rows.length);
    ok(`slot ${slot + 1} holds between 10% and 40% of correct answers`, pct >= 10 && pct <= 40, `${pct}%`);
  }
}

console.log('\n[7] Every option still explains itself');
{
  const bare = /^(إجابة خاطئة|غير صحيح|خطأ|حاول مجددًا|حاول مرة أخرى)[.!]?$/;
  ok('no option feedback is a bare verdict with no explanation',
    rows.every(r => r.checkpoint.options.every(o => !bare.test(o.feedback.trim()))));

  // A distractor's feedback has to say why that specific idea is wrong and what the
  // right idea is; anything under 40 characters cannot do both in Arabic.
  const short = rows.flatMap(r => r.checkpoint.options.filter(o => !o.correct && o.feedback.length < 40)
    .map(o => `${r.checkpoint.id}[${o.id}] ${o.feedback.length}`));
  ok('every wrong option carries feedback long enough to name the misconception', short.length === 0, short.join(', '));

  ok('every correct option confirms the answer', rows.every(r => r.checkpoint.options.find(o => o.correct)!.feedback.includes('صحيح')));
}

console.log(`\nAll ${passed} assertions passed.`);
