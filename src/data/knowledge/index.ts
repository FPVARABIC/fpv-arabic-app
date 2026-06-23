// Central knowledge base — Phase K1 scaffold.
// Not imported anywhere in the app yet. Connect in Phase K3+.

export type {
  KnowledgeLevel,
  SafetyRisk,
  KnowledgeSourceType,
  KnowledgeEntry,
  SafetyRule,
  GlossaryTerm,
  BookChecklistItem,
  BookChecklist,
} from './types';

export { allKnowledgeEntries } from './chapters/index';
export { safetyRules } from './safetyRules';
export { glossaryTerms } from './glossary';
export { bookChecklists } from './checklists';
