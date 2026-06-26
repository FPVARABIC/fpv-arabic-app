/**
 * LKB — Core type contracts.
 *
 * Asset-ready hybrid value objects for the Learning Knowledge Base.
 * Inert — no runtime code, no imports from live systems.
 *
 * Phase LKB-2 will implement the resolver that maps LearningNode → BotNodeView.
 * Phase LKB-3 will populate content via KnowledgeIntakeRecord.
 */

// ── Content metadata ──────────────────────────────────────────────────────────

export type ContentLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Tracks where a piece of content originated.
 * Template literals allow fine-grained attribution per field.
 *   'book:chapter01'        — specific book chapter
 *   'docs:betaflight'       — official Betaflight documentation
 *   'authored'              — manually written, no external source
 *   'ai_draft'              — AI-generated; requires reviewed: true before serving
 */
export type ContentSource =
  | `book:${string}`
  | 'authored'
  | 'ai_draft'
  | `docs:${string}`;

// ── Typed value objects ───────────────────────────────────────────────────────

/** A single text field with per-field source attribution and review status. */
export interface LearningText {
  text: string;
  /** Optional English variant. Used for debug displays and future bilingual export. */
  textEn?: string;
  source?: ContentSource;
  /** Must be true before this field is served by the bot resolver. */
  reviewed: boolean;
  level?: ContentLevel;
}

/** A single ordered action step with per-step metadata. */
export interface LearningStep {
  text: string;
  level?: ContentLevel;
  source?: ContentSource;
  /** Must be true before this step is served by the bot resolver. */
  reviewed: boolean;
}

/** A safety warning or critical hazard note. */
export interface SafetyNote {
  text: string;
  severity: 'warning' | 'critical';
  /** Critical safety content MUST have reviewed: true — resolver enforces this. */
  reviewed: boolean;
}

/**
 * Routing hint for an external knowledge provider.
 * Used only in source_assisted mode. Never used for criticalSafety nodes.
 *
 * Reserved providerId values:
 *   'brave'            — Brave Search API
 *   'betaflight_docs'  — official Betaflight documentation
 *   'expresslrs_docs'  — official ExpressLRS documentation
 *   'inav_docs'        — official iNav documentation
 * Additional provider strings are accepted for future expansion.
 */
export interface ProviderHint {
  providerId: 'brave' | 'betaflight_docs' | 'expresslrs_docs' | 'inav_docs' | string;
  /** Query string to send to this provider. */
  query: string;
  /** Only accept results from these domains. Prevents off-topic results. */
  trustedDomains?: string[];
  /** Higher value = preferred when multiple providers are available. */
  priority?: number;
}

// ── Learning Node ─────────────────────────────────────────────────────────────

/**
 * The canonical unit of knowledge in the LKB.
 *
 * One LearningNode per concept. All knowledge sources — book chapters, official
 * docs, authored content — produce or enrich LearningNodes via KnowledgeIntakeRecord.
 *
 * Consumers never read LearningNode fields directly. They receive a resolved
 * view (BotNodeView, LessonView) from the resolver.
 */
export interface LearningNode {
  /**
   * Stable concept identifier.
   * Uses BotConceptId for bot-linked nodes (Phase LKB-2).
   * Will expand to a dedicated LKBConceptId union in Phase LKB-3+.
   */
  conceptId: string;

  /**
   * Distilled definition: 1–2 sentences. Bot-servable.
   * Must NOT be a copied paragraph from the source document.
   * The source document belongs in body.
   */
  definition: LearningText;

  /**
   * Full source text from the originating document (chapter body, lesson content).
   * Stored for lesson rendering and semantic search.
   * NEVER accessed by the bot resolver.
   */
  body?: string;

  /**
   * Ordered action steps. Max 6 when consumed by the bot.
   * Lesson and search views may render more.
   */
  steps?: LearningStep[];

  safetyNotes?: SafetyNote;

  /**
   * External provider routing hints for source_assisted mode.
   * MUST NOT be set when criticalSafety is true — resolver enforces this.
   */
  providers?: ProviderHint[];

  /**
   * When true: external providers are blocked; all content requires reviewed: true.
   * Applies to lipo_safety, propeller_basic, and any equivalent hazard concepts.
   */
  criticalSafety: boolean;

  relatedConceptIds?: string[];

  /** App route for the corresponding lesson. */
  lessonRoute?: string;

  /** App route for the corresponding checklist. */
  checklistRoute?: string;
}
