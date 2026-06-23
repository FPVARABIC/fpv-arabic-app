export type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced';

export type SafetyRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type KnowledgeSourceType =
  | 'explicit_from_book'
  | 'inferred_from_book'
  | 'educational_addition';

export interface KnowledgeEntry {
  id: string;
  title: string;
  chapter: string;
  section?: string;
  level: KnowledgeLevel;
  safetyRisk: SafetyRisk;
  category: string;
  tags: string[];
  summary: string;
  body: string;
  source?: string;
  sourceType: KnowledgeSourceType;
  safetyNote?: string;
  relatedIds?: string[];
  relatedLessonIds?: string[];
  relatedChecklistIds?: string[];
}

export interface SafetyRule {
  id: string;
  rule: string;
  riskLevel: SafetyRisk;
  consequence: string;
  sourceType: KnowledgeSourceType;
  relatedKnowledgeId?: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  termAr: string;
  definition: string;
  level: KnowledgeLevel;
  relatedIds?: string[];
}

export interface BookChecklistItem {
  id: string;
  text: string;
  safetyRisk: SafetyRisk;
  required: boolean;
  notes?: string;
}

export interface BookChecklist {
  id: string;
  title: string;
  titleAr: string;
  description?: string;
  level: KnowledgeLevel;
  items: BookChecklistItem[];
  relatedKnowledgeIds?: string[];
}
