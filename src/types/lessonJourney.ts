/**
 * Generic interactive-lesson-journey data model.
 *
 * Content is data: a LessonJourneyDefinition fully describes one lesson's
 * staged learning experience. Every lesson in `lessonsData` has one — see
 * src/data/lessons/journeyRegistry.ts.
 * Progression/readiness logic lives in src/data/lessons/lessonJourneyEngine.ts
 * and is driven entirely by this data, never by a lesson-specific stage
 * constant. Rendering lives in src/components/lessons/InteractiveLessonJourney.tsx.
 */
import type { Lesson, DiagramType } from './index';
import type { Destination } from '../platform/destinations';

export interface JourneyCheckpointOption {
  id: string;
  text: string;
  correct: boolean;
  feedback: string;
}

export interface JourneyCheckpoint {
  id: string;
  question: string;
  options: JourneyCheckpointOption[];
}

export interface JourneyGlossaryTerm {
  term: string;
  definition: string;
}

export interface JourneyRecallPrompt {
  id: string;
  question: string;
  modelAnswer: string;
}

interface JourneyStageBase {
  /** Unique within a definition. Used for navigation, requirement ids, and jump targets. */
  id: string;
  title: string;
}

export interface OrientationStage extends JourneyStageBase {
  type: 'orientation';
  body: string;
  /**
   * The lesson's one-line objective, shown under the orientation body.
   * Filled by `enrichJourneyDefinition` from `Lesson.objective`; a definition
   * may also set it directly. Optional so existing definitions stay valid.
   */
  objective?: string;
}

export interface ExplanationStage extends JourneyStageBase {
  type: 'explanation';
  /** The literal 'lesson-explanation' reads lesson.explanation verbatim; otherwise a fixed string. */
  body: string | 'lesson-explanation';
}

export interface ComparisonItem {
  label: string;
  body: string;
}

export interface ComparisonStage extends JourneyStageBase {
  type: 'comparison';
  items: ComparisonItem[];
  footer?: string;
}

export interface WorkedExampleStage extends JourneyStageBase {
  type: 'worked_example';
  body: string;
}

export interface CheckpointStage extends JourneyStageBase {
  type: 'checkpoint';
  checkpoint: JourneyCheckpoint;
}

export interface InteractiveDiagramStage extends JourneyStageBase {
  type: 'interactive_diagram';
  diagramType: DiagramType;
  instructions: string;
  /** e.g. ['cw', 'ccw'] — every variant must be recorded at least once for this stage's requirement to be met. */
  requiredVariants: string[];
  requirementLabel: string;
  hints: {
    /** Shown when zero variants have been recorded yet. */
    none: string;
    /** Shown when exactly one variant has been recorded, keyed by that variant. */
    partial: Record<string, string>;
  };
}

export interface GlossaryStage extends JourneyStageBase {
  type: 'glossary';
  intro: string;
  terms: JourneyGlossaryTerm[];
}

export interface RecallStage extends JourneyStageBase {
  type: 'recall';
  intro: string;
  prompts: JourneyRecallPrompt[];
  requirementLabel: string;
}

/**
 * A short, tone-marked block the learner must notice: a safety warning, a
 * common mistake, a plain note. It carries no requirement and never gates
 * completion — its job is to be impossible to miss, not to be answered.
 *
 * `danger` is reserved for things that hurt people or destroy hardware
 * (a LiPo charged wrong, propellers on during a bench test). `warn` is for
 * the mistake that wastes an afternoon. `info` is for everything else.
 */
/**
 * An optional pointer from a callout to a tool that already exists elsewhere in
 * the app — today, a diagnostic tree.
 *
 * WHY IT HANGS OFF A CALLOUT AND NOWHERE ELSE
 * -------------------------------------------
 * A callout is the one stage type that carries no requirement and can never gate
 * completion (see above). Attaching the pointer here makes "optional" a property
 * of the data model rather than a promise a test has to keep: there is no shape
 * in which a lesson can demand that the learner open a tool before finishing.
 * A learner who has no real fault to diagnose loses nothing by walking past it.
 *
 * WHY A DESTINATION AND NOT A URL
 * -------------------------------
 * `Destination` is an identity, and `resolveDestination` returns null for a
 * target that does not exist — so a lesson pointing at a deleted tree is a
 * testable condition, not a 404 the learner finds. Never a path, never a title,
 * never an array index.
 */
export interface JourneyStageTool {
  destination: Destination;
  /** The button's own words. Says what the tool does, not "click here". */
  label: string;
  /** One line placing it: a tool for the real fault, not a stage to complete. */
  note: string;
}

export interface CalloutStage extends JourneyStageBase {
  type: 'callout';
  tone: 'danger' | 'warn' | 'info';
  body: string;
  /** Optional: a tool for the situation this callout describes. Never required. */
  tool?: JourneyStageTool;
}

/**
 * The lesson's key points, restated as a short list before the glossary.
 * Filled by `enrichJourneyDefinition` from `Lesson.importantPoints`.
 */
export interface KeyPointsStage extends JourneyStageBase {
  type: 'key_points';
  intro?: string;
  points: string[];
}

export interface CompletionStage extends JourneyStageBase {
  type: 'completion';
  summary: string;
  nextLessonBridge: (nextLesson: Lesson) => string;
}

export type JourneyStage =
  | OrientationStage
  | ExplanationStage
  | ComparisonStage
  | WorkedExampleStage
  | CheckpointStage
  | InteractiveDiagramStage
  | GlossaryStage
  | RecallStage
  | CalloutStage
  | KeyPointsStage
  | CompletionStage;

export interface LessonJourneyDefinition {
  lessonId: string;
  stages: JourneyStage[];
  /**
   * Optional explicit display order for readiness-checklist requirement ids.
   * Falls back to stage traversal order when omitted. Lesson 01 declares this
   * to preserve its original checklist ordering (X-layout listed first, even
   * though that stage appears later in the sequence than some checkpoints).
   */
  readinessOrder?: string[];
}

export interface JourneyRequirement {
  id: string;
  label: string;
  met: boolean;
  /** Stage id the readiness checklist's "jump" action should navigate to. */
  jumpStageId: string;
}
