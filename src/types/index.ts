import type { BotConceptId } from '../data/knowledge/botConceptRegistry';

/**
 * The five stations of the beginner path, in order. A lesson names its own
 * station so the index page groups by DATA, not by array position — the
 * previous `slice(0,5)/slice(5,10)/slice(10,16)` silently misfiled any lesson
 * added or reordered. Labels live in `src/data/lessons/lessonTracks.ts`.
 */
export type LessonTrackId = 'basics' | 'power-safety' | 'assembly' | 'setup' | 'flight';

export interface Lesson {
  id: string;
  number: number;
  track: LessonTrackId;
  title: string;
  description: string;
  level: 'مبتدئ' | 'متوسط';
  duration: string;
  objective: string;
  explanation: string;
  imagePlaceholder: string;
  image?: string;
  diagramType: DiagramType;
  importantPoints: string[];
  commonMistake: string;
  warning?: string;
  conceptIds?: BotConceptId[];
}

export type DiagramType =
  | 'quad-x-layout'
  | 'signal-flow'
  | 'parts-map'
  | 'parts-compatibility'
  | 'size-comparison'
  | 'electricity-basics'
  | 'lipo-cells'
  | 'gnd-5v-vbat'
  | 'tx-rx-cross'
  | 'safety-before-battery'
  | 'frame-assembly'
  | 'motor-mount'
  | 'esc-placement'
  | 'fc-orientation'
  | 'receiver-uart'
  | 'camera-vtx'
  | 'pre-power-check'
  | 'motor-test-check'
  | 'prop-direction'
  | 'stick-control';

export interface RoadmapStep {
  id: string;
  number: number;
  icon: string;
  title: string;
  description: string;
  checklist: string[];
  conceptIds?: BotConceptId[];
}

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  icon: string;
  items: ChecklistItem[];
}

export interface BetaflightSection {
  id: string;
  title: string;
  description: string;
  explanation: string;
  importantPoints: string[];
  warning?: string;
  conceptIds?: BotConceptId[];
}

export interface TroubleshootingItem {
  id: string;
  problem: string;
  symptoms: string[];
  causes: string[];
  steps: string[];
  safetyNote?: string;
}

export interface ProgressState {
  completedLessons: string[];
  completedRoadmapSteps: string[];
  checklists: Record<string, string[]>;
}

export interface LastOpenedState {
  lessonId?: string;
  roadmapStepId?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface AppSettings {
  safetySeen: boolean;
  hasStarted: boolean;
}
