/**
 * KB — the unified encyclopedic content spine.
 *
 * WHY THIS EXISTS
 * ---------------
 * Before this module the app carried six parallel, unbridged content models
 * (`Lesson`, `LessonJourneyDefinition`, `KnowledgeEntry`, AKL YAML, `BfPage`,
 * `BasePart`). Each owned its own ids, levels and taxonomy, and nothing linked
 * them, so a user reading about a Flight Controller in a lesson had no route to
 * the Betaflight page that configures it, the assembly stage that selects it,
 * or the diagnostic tree that fixes it.
 *
 * The KB does NOT replace any of those. Every existing model remains the source
 * of truth for its own domain — Betaflight still owns Betaflight field data,
 * Assembly still owns part specs. The KB is:
 *   1. the single home for deep encyclopedic content,
 *   2. the index that cross-links every subsystem, and
 *   3. the source feeding global search, the glossary and the coverage matrix.
 *
 * Content is pure data. Rendering is generic (see src/components/kb/). No view
 * file may ever know the subject of an article.
 */

import type { DiagramType } from '../../types';

// ── Taxonomy ──────────────────────────────────────────────────────────────────

/**
 * Seven levels, replacing the old two-value `Lesson.level`. `pro` is deliberately
 * distinct from `advanced`: `advanced` still teaches, `pro` is lookup-only
 * reference for someone who already knows the system.
 */
export type KbLevel =
  | 'zero'
  | 'beginner'
  | 'basic'
  | 'intermediate'
  | 'advanced'
  | 'pro'
  | 'specialist';

export const KB_LEVEL_LABEL_AR: Record<KbLevel, string> = {
  zero: 'من الصفر',
  beginner: 'مبتدئ',
  basic: 'أساسي',
  intermediate: 'متوسط',
  advanced: 'متقدم',
  pro: 'احترافي',
  specialist: 'تخصصي',
};

/** Ordered weakest → strongest. Used for sorting and for "start at your level". */
export const KB_LEVEL_ORDER: KbLevel[] = [
  'zero', 'beginner', 'basic', 'intermediate', 'advanced', 'pro', 'specialist',
];

export type KbKind =
  | 'concept'
  | 'system'
  | 'component'
  | 'protocol'
  | 'procedure'
  | 'howto'
  | 'reference'
  | 'comparison'
  | 'diagnostic'
  | 'project'
  | 'safety';

export const KB_KIND_LABEL_AR: Record<KbKind, string> = {
  concept: 'مفهوم',
  system: 'نظام',
  component: 'قطعة',
  protocol: 'بروتوكول',
  procedure: 'إجراء',
  howto: 'كيف تفعل',
  reference: 'مرجع',
  comparison: 'مقارنة',
  diagnostic: 'تشخيص',
  project: 'مشروع',
  safety: 'سلامة',
};

/**
 * Presentation layers. An article does not have to fill every layer — a pure
 * reference table has no `simple` layer and that is honest, not a gap. What is
 * NOT acceptable is a module whose articles collectively never reach the
 * technical/practical/diagnostic layers; the coverage matrix catches that.
 */
export type KbLayerId =
  | 'quick'
  | 'simple'
  | 'technical'
  | 'practical'
  | 'diagnostic'
  | 'reference';

export const KB_LAYER_ORDER: KbLayerId[] = [
  'quick', 'simple', 'technical', 'practical', 'diagnostic', 'reference',
];

export const KB_LAYER_LABEL_AR: Record<KbLayerId, string> = {
  quick: 'إجابة سريعة',
  simple: 'شرح مبسّط',
  technical: 'شرح تقني',
  practical: 'تطبيق عملي',
  diagnostic: 'تشخيص',
  reference: 'مرجع سريع',
};

/**
 * The 28 coverage axes. These are the internal completeness standard: a module
 * declares which axes apply to it (`requiredCoverage`), each article declares
 * which it genuinely covers, and `coverage.ts` reports the difference. A missing
 * axis is surfaced to the user as a missing axis — never hidden behind a
 * progress bar.
 */
export type KbCoverageAxis =
  | 'definition'
  | 'principle'
  | 'components'
  | 'types'
  | 'comparison'
  | 'compatibility'
  | 'power'
  | 'protocols'
  | 'installation'
  | 'wiring'
  | 'configuration'
  | 'testing'
  | 'performance'
  | 'safety'
  | 'failures'
  | 'diagnostics'
  | 'maintenance'
  | 'applications'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'pro'
  | 'terminology'
  | 'sources'
  | 'internalLinks'
  | 'search'
  | 'assessment'
  | 'updatability';

export const KB_COVERAGE_LABEL_AR: Record<KbCoverageAxis, string> = {
  definition: 'التعريف',
  principle: 'المبدأ وطريقة العمل',
  components: 'المكوّنات',
  types: 'الأنواع',
  comparison: 'المقارنة',
  compatibility: 'التوافق',
  power: 'الطاقة',
  protocols: 'البروتوكولات',
  installation: 'التركيب',
  wiring: 'التوصيل',
  configuration: 'الإعداد',
  testing: 'الاختبار',
  performance: 'الأداء',
  safety: 'السلامة',
  failures: 'الأعطال',
  diagnostics: 'التشخيص',
  maintenance: 'الصيانة',
  applications: 'التطبيقات',
  beginner: 'مستوى المبتدئ',
  intermediate: 'المستوى المتوسط',
  advanced: 'المستوى المتقدم',
  pro: 'مستوى المحترف',
  terminology: 'المصطلحات',
  sources: 'المصادر',
  internalLinks: 'الروابط الداخلية',
  search: 'قابلية البحث',
  assessment: 'الاختبارات',
  updatability: 'قابلية التحديث',
};

export type KbSafetyLevel = 'info' | 'caution' | 'warning' | 'critical';

// ── Content blocks ────────────────────────────────────────────────────────────

export interface KbStep {
  text: string;
  /** Extra clarification shown smaller under the step. */
  note?: string;
  /** Raises a visible warning on this specific step only. */
  safety?: KbSafetyLevel;
}

export interface KbCompareRow {
  label: string;
  /** Same length as the block's `columns`. */
  cells: string[];
}

export type KbBlock =
  | { type: 'para'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean; title?: string }
  | { type: 'steps'; title?: string; steps: KbStep[] }
  | { type: 'table'; caption?: string; headers: string[]; rows: string[][] }
  | { type: 'callout'; tone: 'note' | 'tip' | 'warning' | 'danger' | 'safety'; title?: string; text: string }
  | { type: 'definition'; term: string; en?: string; text: string }
  | { type: 'keyvalue'; caption?: string; pairs: { k: string; v: string }[] }
  | { type: 'compare'; caption?: string; columns: string[]; rows: KbCompareRow[] }
  | { type: 'diagram'; diagramType: DiagramType; caption?: string }
  | { type: 'faq'; items: { q: string; a: string }[] }
  | { type: 'checklist'; title?: string; items: string[] };

// ── Links ─────────────────────────────────────────────────────────────────────

/**
 * Cross-subsystem link. The route is NEVER written inside content — it is
 * derived from (kind, targetId) by `resolveLinkRoute()` in registry.ts, so
 * moving a route later is a one-line change rather than a content migration.
 */
export type KbLinkKind =
  | 'article'
  | 'lesson'
  | 'betaflight'
  | 'assembly'
  | 'roadmap'
  | 'dx'
  | 'glossary'
  | 'checklist'
  | 'external';

export interface KbLink {
  kind: KbLinkKind;
  targetId: string;
  label: string;
  /** Only for kind === 'external'. */
  url?: string;
  /** Why this link is here — shown as the link's subtitle. */
  reason?: string;
}

// ── Sources ───────────────────────────────────────────────────────────────────

export interface KbSource {
  title: string;
  /** Official docs / repo / manufacturer manual URL where one exists. */
  url?: string;
  /** e.g. 'Betaflight 4.5', 'ExpressLRS 3.x', 'عام (غير مرتبط بإصدار)'. */
  version: string;
  reviewedAt: string;
  kind: 'official-docs' | 'repo' | 'manufacturer' | 'standard' | 'engineering' | 'authored';
  /**
   * Set when the statement is a general engineering principle rather than a
   * version-specific fact. Renders a "check your board's manual" note.
   */
  generalPrinciple?: boolean;
}

// ── Assessment ────────────────────────────────────────────────────────────────

export interface KbQuizOption {
  id: string;
  text: string;
  correct: boolean;
  /** Shown after answering — explains WHY, never just "صحيح"/"خطأ". */
  feedback: string;
}

export interface KbQuizItem {
  id: string;
  question: string;
  options: KbQuizOption[];
}

// ── Article ───────────────────────────────────────────────────────────────────

export interface KbArticle {
  id: string;
  moduleId: string;
  titleAr: string;
  titleEn?: string;
  kind: KbKind;
  order: number;
  levels: KbLevel[];
  /** The `quick` layer in one field — the direct answer, 1–3 lines. */
  summaryAr: string;
  objectives: string[];
  prerequisiteIds: string[];
  layers: Partial<Record<KbLayerId, KbBlock[]>>;
  coverage: KbCoverageAxis[];
  glossaryIds: string[];
  relatedArticleIds: string[];
  links: KbLink[];
  quiz?: KbQuizItem[];
  /** Hands-on tasks the reader can actually perform. */
  tasks?: string[];
  sources: KbSource[];
  lastReviewed: string;
  reviewStatus: 'draft' | 'reviewed';
  keywordsAr: string[];
  keywordsEn: string[];
  safetyLevel: KbSafetyLevel;
}

// ── Learning path ─────────────────────────────────────────────────────────────

export interface KbPath {
  id: string;
  titleAr: string;
  /** Who this path is for, in one sentence. */
  audienceAr: string;
  level: KbLevel;
  articleIds: string[];
  /** What the reader can do after finishing — a skill, not a topic list. */
  outcomeAr: string;
}

// ── Module ────────────────────────────────────────────────────────────────────

export interface KbModule {
  id: string;
  titleAr: string;
  titleEn: string;
  /** Domain id from the content map, e.g. 'flight-controller', 'motors'. */
  domain: string;
  summaryAr: string;
  /** lucide-react icon name, resolved by the view. */
  icon: string;
  levels: KbLevel[];
  articles: KbArticle[];
  /** Axes that genuinely apply to this module — not all 28 apply everywhere. */
  requiredCoverage: KbCoverageAxis[];
  paths: KbPath[];
  lastReviewed: string;
}

// ── Glossary ──────────────────────────────────────────────────────────────────

export interface KbTerm {
  id: string;
  ar: string;
  en: string;
  abbr?: string;
  /** Arabic transliteration, for terms people say aloud rather than read. */
  pronunciationAr?: string;
  /** Plain-language definition. */
  short: string;
  /** Precise definition for someone who already knows the basics. */
  technical?: string;
  /** Where the reader actually meets this term — app tabs, menus, labels. */
  appearsIn: string[];
  domain: string;
  relatedTermIds: string[];
  /** Terms this is genuinely confused with, and why. */
  confusedWith: { termId: string; note: string }[];
  examples?: string[];
  articleIds: string[];
}
