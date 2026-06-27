import type { BotConceptId } from '../data/knowledge/botConceptRegistry';

export interface Lesson {
  id: string;
  number: number;
  title: string;
  description: string;
  level: 'مبتدئ' | 'متوسط';
  duration: string;
  objective: string;
  explanation: string;
  imagePlaceholder: string;
  diagramType: DiagramType;
  importantPoints: string[];
  commonMistake: string;
  warning?: string;
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
  | 'motor-test'
  | 'first-flight';

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
}

export interface TroubleshootingItem {
  id: string;
  problem: string;
  symptoms: string[];
  causes: string[];
  steps: string[];
  safetyNote?: string;
}

export interface BotResponse {
  id: string;
  trigger: string;
  label: string;
  answer: string;
  steps: string[];
  actions: BotAction[];
}

export interface BotAction {
  label: string;
  route: string;
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
