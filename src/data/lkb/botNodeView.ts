/**
 * LKB — Stable BotNodeView interface.
 *
 * This is the ONLY shape the Bot V2 composer is allowed to consume from the LKB.
 * The resolver (Phase LKB-2) maps LearningNode → BotNodeView internally.
 * The bot never reads LearningNode fields directly.
 *
 * This interface is intentionally frozen. Changing the LearningNode schema
 * never requires changing the composer, as long as this interface is stable.
 *
 * Inert — no runtime code, no imports from live systems.
 */

export interface BotChip {
  label: string;
  /** Sends this text as a follow-up query when tapped. */
  query?: string;
  /** Navigates to this app route when tapped. */
  route?: string;
}

export interface BotLink {
  label: string;
  route: string;
}

/**
 * The stable, flat view the Bot V2 composer receives from the LKB resolver.
 *
 * All fields are pre-resolved plain values — no typed value objects, no
 * source attribution, no review flags. Those concerns are handled by the
 * resolver before this view is returned.
 *
 * The composer reads this interface. It does not know how the values were
 * derived or which knowledge source produced them.
 */
export interface BotNodeView {
  conceptId: string;

  /** Resolved from LearningNode.definition.text. Always a reviewed, distilled string. */
  definition: string;

  /**
   * Resolved from LearningNode.steps[].text.
   * Empty array when no steps exist. Max 6 items for bot consumption.
   */
  steps: string[];

  /** Resolved from LearningNode.safetyNotes.text. Undefined when no safety notes. */
  safetyNotes?: string;

  chips: BotChip[];
  internalLinks: BotLink[];

  /**
   * When true: external provider results are blocked for this node.
   * The bot must not surface Brave or doc provider results for critical safety concepts.
   */
  criticalSafety: boolean;

  /**
   * When true: ProviderHints exist and source_assisted mode may activate.
   * The resolver guarantees this is always false when criticalSafety is true.
   */
  hasProviderHints: boolean;
}
