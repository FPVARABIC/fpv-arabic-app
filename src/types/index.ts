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
  importantPoints: string[];
  commonMistake: string;
  warning?: string;
}

export interface RoadmapStep {
  id: string;
  number: number;
  icon: string;
  title: string;
  description: string;
  checklist: string[];
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
