/**
 * Enrichment: the lesson's authored fields, placed into its journey.
 *
 * THE GAP THIS CLOSES
 * -------------------
 * Every lesson in `lessonsData` carries an `objective`, three
 * `importantPoints`, a `commonMistake` and — for six of them — a safety
 * `warning`. Those fields were rendered by exactly one branch of
 * `LessonDetailView`, the branch no learner reaches because every lesson has
 * a journey. Seventy authored elements, none of them shown.
 *
 * Rather than hand-editing sixteen definition files (and forgetting the
 * seventeenth), the fields are derived into stages here, at read time, for
 * every lesson at once. `lessonsData` stays the single source of truth for
 * them; a definition never duplicates what the lesson record already says.
 *
 * WHERE EACH ONE LANDS
 * --------------------
 *   objective       → onto the first orientation stage (shown under its body)
 *   warning         → a `danger` callout right after the lesson-explanation
 *                     stage: early, before any hands-on content
 *   importantPoints → a `key_points` stage before the glossary (or the
 *                     recall, or the completion — whichever comes first)
 *   commonMistake   → a `warn` callout immediately before completion
 *
 * WHAT IT NEVER DOES
 * ------------------
 * It adds no requirement, so `readinessOrder` and `isReadyToComplete` are
 * untouched — the added stages are read, not answered. It is idempotent: a
 * definition that already carries an enriched stage id is returned as is. It
 * never mutates its input.
 *
 * Pure. Exercised by `scripts/testLessonJourneyEnrich.ts`.
 */
import type { Lesson } from '../../types';
import type {
  LessonJourneyDefinition, JourneyStage, CalloutStage, KeyPointsStage,
} from '../../types/lessonJourney';

export const ENRICHED_STAGE_IDS = {
  warning: 'enriched-safety-warning',
  keyPoints: 'enriched-key-points',
  commonMistake: 'enriched-common-mistake',
} as const;

function hasStage(stages: readonly JourneyStage[], id: string): boolean {
  return stages.some(s => s.id === id);
}

/** Index of the stage the safety warning should FOLLOW. */
function warningAnchorIndex(stages: readonly JourneyStage[]): number {
  const lessonExplanation = stages.findIndex(s => s.type === 'explanation' && s.body === 'lesson-explanation');
  if (lessonExplanation !== -1) return lessonExplanation;
  const anyExplanation = stages.findIndex(s => s.type === 'explanation');
  if (anyExplanation !== -1) return anyExplanation;
  const orientation = stages.findIndex(s => s.type === 'orientation');
  return orientation; // -1 → inserted at the very start, which is still correct
}

/** Index of the stage the key points should PRECEDE. */
function keyPointsAnchorIndex(stages: readonly JourneyStage[]): number {
  for (const type of ['glossary', 'recall', 'completion'] as const) {
    const i = stages.findIndex(s => s.type === type);
    if (i !== -1) return i;
  }
  return stages.length;
}

export function enrichJourneyDefinition(
  definition: LessonJourneyDefinition, lesson: Lesson,
): LessonJourneyDefinition {
  let stages: JourneyStage[] = definition.stages.map(s =>
    s.type === 'orientation' && !s.objective && lesson.objective
      ? { ...s, objective: lesson.objective }
      : s,
  );

  if (lesson.warning && !hasStage(stages, ENRICHED_STAGE_IDS.warning)) {
    const callout: CalloutStage = {
      id: ENRICHED_STAGE_IDS.warning,
      type: 'callout',
      tone: 'danger',
      title: 'تحذير سلامة قبل أن تتابع',
      body: lesson.warning,
    };
    const at = warningAnchorIndex(stages) + 1;
    stages = [...stages.slice(0, at), callout, ...stages.slice(at)];
  }

  if (lesson.importantPoints.length > 0 && !hasStage(stages, ENRICHED_STAGE_IDS.keyPoints)) {
    const keyPoints: KeyPointsStage = {
      id: ENRICHED_STAGE_IDS.keyPoints,
      type: 'key_points',
      title: 'نقاط مهمة قبل أن تُكمل',
      intro: 'ثلاث جمل تختصر هذا الدرس. إن لم تكن إحداها واضحة، فارجع إلى مرحلتها قبل القاموس.',
      points: [...lesson.importantPoints],
    };
    const at = keyPointsAnchorIndex(stages);
    stages = [...stages.slice(0, at), keyPoints, ...stages.slice(at)];
  }

  if (lesson.commonMistake && !hasStage(stages, ENRICHED_STAGE_IDS.commonMistake)) {
    const callout: CalloutStage = {
      id: ENRICHED_STAGE_IDS.commonMistake,
      type: 'callout',
      tone: 'warn',
      title: 'الخطأ الشائع في هذا الدرس',
      body: lesson.commonMistake,
    };
    const completion = stages.findIndex(s => s.type === 'completion');
    const at = completion === -1 ? stages.length : completion;
    stages = [...stages.slice(0, at), callout, ...stages.slice(at)];
  }

  return { ...definition, stages };
}
