/**
 * Symptom-first diagnostic trees.
 *
 * The old `troubleshootingData.ts` was a flat list of six entries: problem,
 * symptoms, causes, steps. That shape cannot express the two things that make
 * diagnosis actually safe and actually useful:
 *   1. the risk posture BEFORE the first step (battery out? props off?), and
 *   2. branching — what each check result MEANS and where it sends you next.
 *
 * A tree whose every node has one answer is explicitly rejected by the product
 * spec, so `DxOutcome[]` is required to have at least two entries per node and
 * `scripts/testKbDiagnostics.ts` enforces it.
 *
 * The old data is not deleted — it stays live at /troubleshooting and is
 * re-linked into navigation; these trees are the deeper layer on top.
 */

import type { KbBotMeta, KbLink, KbSource } from '../types';

export type DxRisk = 'low' | 'medium' | 'high' | 'critical';

export const DX_RISK_LABEL_AR: Record<DxRisk, string> = {
  low: 'خطر منخفض',
  medium: 'خطر متوسط',
  high: 'خطر مرتفع',
  critical: 'خطر حرج',
};

/** Which kind of inspection a check is — used to order least-dangerous first. */
export type DxCheckClass = 'visual' | 'electrical' | 'software' | 'functional';

export const DX_CHECK_CLASS_LABEL_AR: Record<DxCheckClass, string> = {
  visual: 'فحص بصري',
  electrical: 'فحص كهربائي',
  software: 'فحص برمجي',
  functional: 'اختبار وظيفي',
};

/** Ascending danger. `orderOfCheckClass` in the tree validator relies on this. */
export const DX_CHECK_CLASS_ORDER: DxCheckClass[] = ['visual', 'electrical', 'software', 'functional'];

export interface DxOutcome {
  id: string;
  /** What the user actually observed. */
  label: string;
  /** What that observation means — the reasoning, not just a verdict. */
  meaning: string;
  /** Next node id. Mutually exclusive with `conclusion`. */
  next?: string;
  /** Terminal answer for this branch. Mutually exclusive with `next`. */
  conclusion?: string;
  /** Concrete things to do when this branch is terminal. */
  actions?: string[];
  /** Set when this outcome means the part is likely dead. */
  likelyDamaged?: boolean;
}

export interface DxNode {
  id: string;
  /** What is being checked, phrased as the question the check answers. */
  question: string;
  checkClass: DxCheckClass;
  /** Exactly how to perform the check, safely. */
  how: string;
  /** What a healthy system looks like at this check. */
  expected: string;
  /** Safety instruction specific to this check, when one is needed. */
  safetyNote?: string;
  /** At least two — a single-outcome node is a rejected shape. */
  outcomes: DxOutcome[];
}

export interface DxTree {
  id: string;
  /** Short title for lists. */
  titleAr: string;
  /** The symptom as the user would describe it. */
  symptomAr: string;
  /** Other phrasings people search for — feeds the search index. */
  aliases: string[];
  risk: DxRisk;
  /** Must the battery be disconnected before starting? */
  disconnectBattery: boolean;
  /** Must the propellers be off before starting? */
  removeProps: boolean;
  /** Owning KB module id. */
  moduleId: string;
  /** Fastest things to rule out first, before entering the tree. */
  quickChecks: string[];
  /** Entry node id. */
  rootNodeId: string;
  nodes: DxNode[];
  /** When to stop and stop guessing. */
  stopConditions: string[];
  relatedArticleIds: string[];
  links: KbLink[];
  sources: KbSource[];
  lastReviewed: string;
  /**
   * Retrieval metadata. A diagnostic tree is the entry a symptom-shaped question
   * should reach, so its `symptomsAr` are the phrasings people actually type —
   * «الدرون ينقلب», «ما في اتصال» — not a restatement of the title.
   */
  bot?: KbBotMeta;
}
