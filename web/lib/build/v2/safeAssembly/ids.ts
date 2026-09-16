import { checklistsData } from '@core/data/checklistsData';

/**
 * WHAT A CONFIRMATION IS, AND WHY IT IS A NAME RATHER THAN A POSITION
 * ===================================================================
 *
 * V1 stores a reader's safety confirmations as `Record<string, number[]>` —
 * ARRAY INDICES into checklists that are edited like any other content. That
 * representation cannot survive its own source being maintained. Insert one
 * item at the top of the pre-battery list and a reader who returns sees nine
 * green ticks for a list whose items are not the ones they read:
 *
 *   stored [0,1,2] meant     لا توجد مراوح مركبة · القطبية · continuity
 *   after one insertion      «البند الجديد» · لا توجد مراوح مركبة · القطبية
 *
 * The continuity check silently loses its confirmation and the new item
 * silently gains one. Nothing throws. Nothing is red. The count guard in
 * `scripts/testBuildPhase0.ts` pins the LENGTH of those lists, which an
 * insertion-plus-deletion passes.
 *
 * A confirmation is a promise about what a person verified with their hands.
 * Its identity must therefore be the REQUIREMENT, not the requirement's
 * current position in a list.
 *
 * THE IDENTITIES ALREADY EXIST
 * ----------------------------
 * `checklistsData` has carried stable per-item ids all along — `prb-1` … `prb-9`
 * for «قبل البطارية», `pf-1` … `pf-10` for «قبل أول طيران». V1 throws them away
 * at one line in `web/lib/build/gates.ts`:
 *
 *     return group.items.map(i => i.text);   // ← the ids die here
 *
 * So V2 does not invent a parallel identity scheme for requirements the shared
 * checklists already own. It reuses those ids, and mints its own only for
 * requirements the shared lists do not express.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT DO
 * -----------------------------------------
 * It does not migrate V1. V1's `gateChecks` stays exactly as it is; the two
 * representations are not interchangeable and this module never reads one as
 * the other. That is asserted in `scripts/testSafeAssemblyFoundation.ts`.
 */

/* ── STAGES ───────────────────────────────────────────────────────────────
 *
 * The eight physical stages of «التجميع الآمن», as identities.
 *
 * Identity is NOT a screen number. These ids are what a completion record
 * refers to, so reordering the journey, inserting a stage, or renaming a
 * heading must not change what a reader has already finished. The array's
 * order is the build order; the ids are the identities.
 *
 * Product Phase 3 — Betaflight, motor order and direction, receiver channels,
 * failsafe, flight modes, propellers, preflight, first flight — has NO id
 * here. Those are a different phase and adding them would let this phase's
 * completion record claim work it never covered.
 */
export const ASSEMBLY_STAGE_IDS = [
  'workspace-frame',
  'motors',
  'stack-mount',
  'power-soldering',
  'receiver',
  'video',
  'pre-power',
  'first-power',
] as const;

export type AssemblyStageId = typeof ASSEMBLY_STAGE_IDS[number];

const STAGE_ID_SET: ReadonlySet<string> = new Set(ASSEMBLY_STAGE_IDS);

/** Is this a stage this version knows? Unknown ids never count as progress. */
export const isAssemblyStageId = (v: unknown): v is AssemblyStageId =>
  typeof v === 'string' && STAGE_ID_SET.has(v);

/* ── CONFIRMATIONS ────────────────────────────────────────────────────────── */

/**
 * Where a requirement's WORDING comes from — which is not the same question as
 * where its identity comes from.
 *
 * `shared-checklist` means the text is owned by `checklistsData` and this
 * module must not restate it. `v2` means the requirement is one the shared
 * lists do not express, so V2 owns both.
 */
export type ConfirmationSource = 'shared-checklist' | 'v2';

export interface SafetyConfirmation {
  /** Stable forever. Retired, never reused, when the requirement changes. */
  id: string;
  /** The stage that cannot complete without it. */
  stageId: AssemblyStageId;
  source: ConfirmationSource;
  /**
   * For `shared-checklist`, the `checklistsData` group whose item carries this
   * id — so the text can be looked up rather than copied.
   */
  sharedGroupId?: string;
}

/**
 * THE REGISTRY — the only thing that decides what a confirmation means.
 *
 * A stored id that is not here satisfies nothing. That is the rule that makes
 * removal safe (rule 4 below) and makes a session written by a newer version
 * harmless when read by an older one.
 */
export const SAFETY_CONFIRMATIONS: readonly SafetyConfirmation[] = [
  /* ── B · تركيب المحركات ──────────────────────────────────────────────
   * The screw-length check has no shared-checklist item, and it is the one
   * mistake in this stage that destroys a motor before it ever spins: a screw
   * longer than the arm is thick reaches the windings. `safetyNotes.ts`
   * already carries the hazard text; this is its confirmation.
   */
  { id: 'asm-motors-screw-length', stageId: 'motors', source: 'v2' },

  /* ── D · لحام مسار الطاقة والمحركات ─────────────────────────────────
   * «The battery is disconnected» is a precondition that holds for the whole
   * stage rather than a step inside it, which is why it is a confirmation and
   * not a line of prose.
   */
  { id: 'asm-solder-battery-disconnected', stageId: 'power-soldering', source: 'v2' },

  /* ── E · توصيل Receiver ──────────────────────────────────────────────
   * The shared list already owns the TX/RX requirement, at the point where it
   * is inspected rather than where it is wired. V2 confirms the wiring at the
   * stage that performs it; `prb-8` re-confirms it before power.
   */
  { id: 'asm-receiver-txrx-reviewed', stageId: 'receiver', source: 'v2' },

  /* ── F · توصيل نظام الفيديو ──────────────────────────────────────────
   * Powering a VTX with no antenna attached can destroy its transmit stage.
   * It is confirmed HERE, where the antenna is fitted, and the hazard is
   * repeated at the gate before current flows — the two can be days apart and
   * only one of them is the point of no return.
   */
  { id: 'asm-video-antenna-attached', stageId: 'video', source: 'v2' },

  /* ── G · الفحص النهائي قبل الطاقة ───────────────────────────────────
   * Identities borrowed from «قبل البطارية». Their text is the shared list's
   * and is not restated here.
   *
   * `prb-4` is ABSENT ON PURPOSE — see RETIRED_CONFIRMATION_IDS.
   */
  { id: 'prb-1', stageId: 'pre-power', source: 'shared-checklist', sharedGroupId: 'pre-battery' },
  { id: 'prb-2', stageId: 'pre-power', source: 'shared-checklist', sharedGroupId: 'pre-battery' },
  { id: 'prb-3', stageId: 'pre-power', source: 'shared-checklist', sharedGroupId: 'pre-battery' },
  { id: 'prb-5', stageId: 'pre-power', source: 'shared-checklist', sharedGroupId: 'pre-battery' },
  { id: 'prb-6', stageId: 'pre-power', source: 'shared-checklist', sharedGroupId: 'pre-battery' },
  { id: 'prb-7', stageId: 'pre-power', source: 'shared-checklist', sharedGroupId: 'pre-battery' },
  { id: 'prb-8', stageId: 'pre-power', source: 'shared-checklist', sharedGroupId: 'pre-battery' },
  { id: 'prb-9', stageId: 'pre-power', source: 'shared-checklist', sharedGroupId: 'pre-battery' },
  /*
   * THE REPLACEMENT FOR `prb-4`, AND WHY IT IS A NEW ID.
   *
   * `prb-4` reads «Smoke Stopper جاهز» — it names a PRODUCT. The policy this
   * phase implements is broader: what is required is a CURRENT-LIMITED first
   * power, which a smoke stopper provides and so does a current-limited bench
   * supply. Widening what satisfies a safety requirement is a material change
   * under rule 2, so the old id is retired rather than reworded: a reader who
   * ticked «I have a Smoke Stopper» has not answered the question «do you have
   * a current-limited path?», even though their answer probably implies yes.
   */
  { id: 'asm-power-current-limit-ready', stageId: 'pre-power', source: 'v2' },

  /* ── H · أول تشغيل محدود التيار ─────────────────────────────────────
   * Two separate facts. Performing the procedure is not the same claim as
   * observing nothing wrong, and collapsing them would let «I did it» stand in
   * for «and it was fine».
   */
  { id: 'asm-power-first-limited-done', stageId: 'first-power', source: 'v2' },
  { id: 'asm-power-no-fault-observed', stageId: 'first-power', source: 'v2' },
];

const CONFIRMATION_BY_ID: ReadonlyMap<string, SafetyConfirmation> =
  new Map(SAFETY_CONFIRMATIONS.map(c => [c.id, c]));

/**
 * IDS THAT MAY NEVER BE HONOURED AGAIN, AND MAY NEVER BE REUSED.
 *
 * Rule 4 needs somewhere to live or it is only a convention. A retired id is
 * not merely absent from the registry — it is recorded as retired, so that
 * re-adding it later (which would silently resurrect stale confirmations on
 * devices that still hold it) fails a test rather than shipping.
 */
export const RETIRED_CONFIRMATION_IDS: ReadonlySet<string> = new Set([
  /* Replaced by `asm-power-current-limit-ready`; named a product, not a method. */
  'prb-4',
]);

/** Known to THIS version, and not retired. Everything else satisfies nothing. */
export const isKnownConfirmationId = (v: unknown): v is string =>
  typeof v === 'string' && CONFIRMATION_BY_ID.has(v) && !RETIRED_CONFIRMATION_IDS.has(v);

export const confirmationById = (id: string): SafetyConfirmation | undefined =>
  RETIRED_CONFIRMATION_IDS.has(id) ? undefined : CONFIRMATION_BY_ID.get(id);

/** Every confirmation a stage needs before it can be called complete. */
export const confirmationsForStage = (stageId: AssemblyStageId): readonly SafetyConfirmation[] =>
  SAFETY_CONFIRMATIONS.filter(c => c.stageId === stageId);

/**
 * The shared list's own wording for a borrowed id.
 *
 * Looked up, never copied. If the shared text is corrected the reader sees the
 * correction and their confirmation stands — which is rule 1, implemented
 * rather than promised.
 */
export function sharedConfirmationText(id: string): string | undefined {
  const entry = confirmationById(id);
  if (!entry || entry.source !== 'shared-checklist') return undefined;
  const group = checklistsData.find(g => g.id === entry.sharedGroupId);
  return group?.items.find(i => i.id === id)?.text;
}

/* ── MANUAL REVIEWS ───────────────────────────────────────────────────────
 *
 * A manual check is a question the CATALOGUE cannot settle. It is not a
 * confirmation that a step was performed; it is the reader stating they went
 * and read something the data does not contain.
 *
 * `current-headroom` is the engine's own finding id, reused so the two cannot
 * drift apart.
 */
export const MANUAL_REVIEW_IDS = ['current-headroom'] as const;
export type ManualReviewId = typeof MANUAL_REVIEW_IDS[number];

const MANUAL_ID_SET: ReadonlySet<string> = new Set(MANUAL_REVIEW_IDS);
export const isManualReviewId = (v: unknown): v is ManualReviewId =>
  typeof v === 'string' && MANUAL_ID_SET.has(v);

/* ── FIRST POWER ──────────────────────────────────────────────────────────
 *
 * The two accepted ways to put current into a build for the first time.
 *
 * There is no third member and no absent-but-acknowledged member. «I do not
 * have one» is not a method, and «I understand the risk» is not a method: a
 * reader without a current-limited path may finish every physical stage, and
 * the first-power stage simply stays unavailable to them. Encoding a bypass
 * as a value is how a bypass gets a button.
 *
 * A multimeter is NOT here. Continuity and polarity are separate confirmations
 * (`prb-2`, `prb-3`) that answer a different question — whether the circuit is
 * wrong, not whether the first current through it is limited.
 */
export const FIRST_POWER_METHODS = ['smoke-stopper', 'current-limited-bench-supply'] as const;
export type FirstPowerMethod = typeof FIRST_POWER_METHODS[number];

const METHOD_SET: ReadonlySet<string> = new Set(FIRST_POWER_METHODS);
export const isFirstPowerMethod = (v: unknown): v is FirstPowerMethod =>
  typeof v === 'string' && METHOD_SET.has(v);
