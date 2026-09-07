/**
 * Assessment quality metrics for the 20-lesson checkpoint bank.
 *
 * This module is the single source of truth for how question quality is
 * measured, so that the reporting tool and the regression test in
 * testAssessmentQuality.ts always agree on the numbers.
 *
 * Run the report with:  npx tsx scripts/assessmentMetrics.ts
 */
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';
import { correctOptionPosition } from '../src/data/lessons/checkpointOrder';
import type { CheckpointStage, Checkpoint } from '../src/types/lessonJourney';

/** The stem that made twelve questions interchangeable before P2-A. */
export const RECOGNITION_STEM = 'أيّ من التالي صحيح بخصوص';

/**
 * Cognitive demand of a question, inferred from its stem.
 *
 * RECOG  the fixed recognition stem above: restate a fact just stated.
 * DIAG   a symptom or a flawed build is given; locate the cause or the error.
 * DECIS  a situation is given; choose what to do next.
 * APPLY  run the model forward or backward: predict, compare, classify.
 * UNDER  everything else — an understanding check that is neither of the above.
 *
 * The order of the tests matters: a stem may contain more than one marker,
 * and the earlier family wins.
 */
export type QuestionKind = 'RECOG' | 'DIAG' | 'DECIS' | 'APPLY' | 'UNDER';

const DIAG = /ما السبب|من أين تبدأ|ما التشخيص|أين الخلل|أين الخطأ|ما الخطأ|لماذا لا |ما نوع المشكلة|الإصلاح الصحيح|ما أول ما تفحصه/;
const DECIS = /ما الأنسب|ماذا تفعل|ماذا تختار|أيّهما تختار|ما التصرّف|ما التصرف|ما ردّك|بمَ تنصحه|ما الصواب|ما القرار|ما أول ما تفعله|متى يجب|متى تركّب|هل الطائرة جاهزة|ما الذي يجب/;
const APPLY = /ماذا يحدث|ماذا سيحدث|ما الذي يحدث|ما الذي يتوقف|ما الفرق|ما وصف|أيّ المحركات|أيّ ترتيب|أيّها الصحيح|ما الذي يفرضه|ما الذي تتوقّع|لماذا\b/;

export function questionKind(question: string): QuestionKind {
  if (question.startsWith(RECOGNITION_STEM)) return 'RECOG';
  if (DIAG.test(question)) return 'DIAG';
  if (DECIS.test(question)) return 'DECIS';
  if (APPLY.test(question)) return 'APPLY';
  return 'UNDER';
}

/** Words long enough to carry meaning; used for leakage and similarity. */
const words = (s: string) =>
  s.replace(/[.،؛:!؟«»()—"]/g, ' ').split(/\s+/).filter(w => w.length > 4);

export interface CheckpointRow {
  lesson: number;
  checkpoint: Checkpoint;
  /** Serialised previous stage — what the learner read immediately before. */
  previousStage: string;
  previousStageId: string;
}

export function collectCheckpoints(): CheckpointRow[] {
  return lessonsData.flatMap(lesson => {
    const stages = getLessonJourneyDefinition(lesson.id)!.stages;
    return stages.flatMap((stage, i) =>
      stage.type !== 'checkpoint'
        ? []
        : [{
            lesson: lesson.number,
            checkpoint: (stage as CheckpointStage).checkpoint,
            previousStage: i > 0 ? JSON.stringify(stages[i - 1]) : '',
            previousStageId: i > 0 ? stages[i - 1].id : '',
          }],
    );
  });
}

const correctOf = (cp: Checkpoint) => cp.options.find(o => o.correct)!;
const longestDistractor = (cp: Checkpoint) =>
  Math.max(...cp.options.filter(o => !o.correct).map(o => o.text.length));

/** Share of the correct answer's meaningful words that already appear in the stage before it. */
export function leakagePercent(row: CheckpointRow): number {
  if (!row.previousStage) return 0;
  const w = words(correctOf(row.checkpoint).text);
  return Math.round(100 * w.filter(x => row.previousStage.includes(x)).length / Math.max(w.length, 1));
}

/** Word overlap between two correct answers, as a share of the smaller one. */
export function similarityPercent(a: Checkpoint, b: Checkpoint): number {
  const setA = new Set(correctOf(a).text.split(/\s+/).filter(w => w.length > 3));
  const setB = new Set(correctOf(b).text.split(/\s+/).filter(w => w.length > 3));
  const shared = [...setA].filter(w => setB.has(w)).length;
  return Math.round(100 * shared / Math.min(setA.size, setB.size));
}

export function lengthBias(cp: Checkpoint) {
  const correct = correctOf(cp).text.length;
  const distractor = longestDistractor(cp);
  return { gap: correct - distractor, ratio: +(correct / distractor).toFixed(2) };
}

export function report() {
  const rows = collectCheckpoints();
  const positions = [0, 0, 0, 0];
  const distribution: Record<QuestionKind, number> = { RECOG: 0, DIAG: 0, DECIS: 0, APPLY: 0, UNDER: 0 };
  const perLesson: Record<number, QuestionKind[]> = {};
  const leakage: { label: string; pct: number }[] = [];
  let correctLongest = 0;

  for (const row of rows) {
    positions[correctOptionPosition(row.checkpoint)]++;
    const kind = questionKind(row.checkpoint.question);
    distribution[kind]++;
    (perLesson[row.lesson] ??= []).push(kind);
    if (lengthBias(row.checkpoint).gap > 0) correctLongest++;
    const pct = leakagePercent(row);
    if (pct > 55) leakage.push({ label: `L${row.lesson} ${row.checkpoint.id} ${pct}% (${row.previousStageId})`, pct });
  }

  const pairs: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const pct = similarityPercent(rows[i].checkpoint, rows[j].checkpoint);
      if (pct > 50) pairs.push(`L${rows[i].lesson} ${rows[i].checkpoint.id} ~ L${rows[j].lesson} ${rows[j].checkpoint.id} = ${pct}%`);
    }
  }

  const nearLengthLimit = rows
    .map(r => ({ id: `L${r.lesson} ${r.checkpoint.id}`, ...lengthBias(r.checkpoint) }))
    .filter(x => x.gap > 30 || x.ratio > 1.6)
    .sort((a, b) => b.gap - a.gap);

  return {
    total: rows.length,
    recognitionStem: {
      count: rows.filter(r => r.checkpoint.question.startsWith(RECOGNITION_STEM)).length,
      lessons: [...new Set(rows.filter(r => r.checkpoint.question.startsWith(RECOGNITION_STEM)).map(r => r.lesson))],
    },
    typeDistribution: distribution,
    perLesson: Object.fromEntries(Object.entries(perLesson).map(([k, v]) => [k, v.join(' ')])),
    correctLongest: `${correctLongest}/${rows.length}`,
    positions,
    positionPct: positions.map(n => Math.round(100 * n / rows.length)),
    leakageOver55: leakage.length,
    leakageSevere88: leakage.filter(x => x.pct >= 88).map(x => x.label),
    leakageAll: leakage.map(x => x.label),
    similarPairs: pairs,
    nearLengthLimit,
  };
}

if (process.argv[1] && process.argv[1].endsWith('assessmentMetrics.ts')) {
  console.log(JSON.stringify(report(), null, 1));
}
