import type { RecommendationInput } from '@core/data/assembly/recommendation/types';
import {
  isAssemblyStageId, isKnownConfirmationId, isManualReviewId, isFirstPowerMethod,
  confirmationsForStage, ASSEMBLY_STAGE_IDS,
  type AssemblyStageId, type ManualReviewId, type FirstPowerMethod,
} from './ids';

/**
 * WHAT IS WRITTEN DOWN, AND WHAT IS WORKED OUT AGAIN EVERY TIME
 * =============================================================
 *
 * «التجميع الآمن» happens over days. Somebody solders on Tuesday, waits for a
 * connector, and comes back on Saturday. A phase that asks for safety
 * confirmations and forgets them on refresh does not merely inconvenience that
 * person — it teaches them to tick without reading, which is the exact failure
 * the confirmations exist to prevent. So this phase persists.
 *
 * THE LINE THIS FILE EXISTS TO DRAW
 * ---------------------------------
 * Only SOURCE data is written down: what the reader answered, what they chose,
 * what they confirmed with their hands. Everything else — the proposal, the
 * eight resolved parts, eligibility, the price, the compatibility evidence —
 * is DERIVED, and is derived again from the engine on every load.
 *
 * `ProposedBuild` is deliberately not persisted. It is the engine's answer to a
 * question, and the catalogue underneath it moves: a part is withdrawn, a spec
 * is corrected, a rule is fixed. A stored answer would keep asserting the old
 * one, and the reader would be assembling against a plan the system no longer
 * stands behind — with no way to tell, because the stored copy looks exactly
 * like a fresh one.
 *
 * Storing sources and replaying them costs one engine run on load (~4ms) and
 * buys the guarantee that what the reader sees is what the current catalogue
 * actually says.
 *
 * NOTHING HERE TOUCHES STORAGE
 * ----------------------------
 * Every function in this file is pure: session in, session out. The only module
 * that calls `platform/storage` is `storage.ts` next door. That split is what
 * lets the whole revalidation contract be tested without a browser.
 */

/* ── STATE VOCABULARY ─────────────────────────────────────────────────────
 *
 * These are literal types rather than strings on purpose. `'pass'`, `'verified'`
 * and `'safe'` are not merely discouraged here — they do not typecheck. A
 * system verdict and a person's word are different kinds of fact, and the day
 * somebody wants to record the first one, they will have to add a type for it
 * and explain what check produced it.
 */

/** A person performed a step, or inspected something, and says so. */
export interface ConfirmationState {
  readonly state: 'user-confirmed';
  /** Supplied by the caller — this module never reads a clock. */
  readonly at: number;
}

/**
 * A person went and read something the catalogue does not contain.
 *
 * `current-headroom` is the case this exists for: no motor in the catalogue
 * documents current draw, because draw is not a property of a motor — it is a
 * property of a motor turning a given prop at a given voltage. The reader can
 * state they consulted the manufacturer and compared it with the ESC's
 * documented rating. That is a REVIEW, and it never becomes a compatibility
 * PASS: the data that would justify a pass still does not exist.
 */
export interface ManualReviewState {
  readonly state: 'user-confirmed-review';
  readonly at: number;
}

/* ── THE SESSION ──────────────────────────────────────────────────────────── */

export interface AssemblyProgress {
  readonly currentStageId?: AssemblyStageId;
  readonly completedStageIds: readonly AssemblyStageId[];
  readonly confirmations: Readonly<Record<string, ConfirmationState>>;
  readonly manualReviews: Readonly<Record<string, ManualReviewState>>;
  readonly firstPowerMethod?: FirstPowerMethod;
}

export interface BuildV2Session {
  readonly version: 1;
  /**
   * PHASE-1 SOURCES — exactly what the engine is given, nothing beside it.
   *
   * `RecommendationInput` is reused rather than restated. A parallel DTO would
   * be a second place for the question «what does the engine need?» to be
   * answered, and the two answers would drift the first time the engine gained
   * a field.
   */
  readonly phase1: {
    readonly inputs: RecommendationInput;
    readonly selectedParts: Readonly<Record<string, string>>;
  };
  /**
   * The build the reader accepted at the end of «اختيار القطع».
   *
   * Absent until they reach the review. Present means: physical progress below
   * belongs to THIS build and no other.
   */
  readonly reviewedBuildFingerprint?: string;
  readonly assembly: AssemblyProgress;
}

const EMPTY_PROGRESS: AssemblyProgress = Object.freeze({
  completedStageIds: Object.freeze([]) as readonly AssemblyStageId[],
  confirmations: Object.freeze({}),
  manualReviews: Object.freeze({}),
});

export function createSession(
  inputs: RecommendationInput,
  selectedParts: Readonly<Record<string, string>> = {},
): BuildV2Session {
  return { version: 1, phase1: { inputs, selectedParts }, assembly: EMPTY_PROGRESS };
}

/* ── TRANSITIONS ──────────────────────────────────────────────────────────── */

/**
 * The reader went back and changed an answer or a part.
 *
 * The reviewed fingerprint is dropped and physical progress is cleared, without
 * waiting to find out whether the build actually changed. That is deliberate:
 * this function does not run the engine, so it cannot know. Clearing here and
 * letting `reconcileSession` restore nothing is the fail-closed direction — the
 * alternative is carrying a fingerprint that may no longer describe the build
 * and hoping something downstream notices.
 *
 * The sources themselves survive, because the reader is editing them.
 */
export function updatePhase1Sources(
  session: BuildV2Session,
  inputs: RecommendationInput,
  selectedParts: Readonly<Record<string, string>>,
): BuildV2Session {
  return {
    version: 1,
    phase1: { inputs, selectedParts },
    assembly: EMPTY_PROGRESS,
  };
}

/** The reader reached the end of «اختيار القطع» with this exact build. */
export function markBuildReviewed(
  session: BuildV2Session, fingerprint: string,
): BuildV2Session {
  /*
   * Re-marking the SAME build is not a reset. A reader who walks back to the
   * review and forward again has not undone their soldering.
   */
  if (session.reviewedBuildFingerprint === fingerprint) return session;
  return { ...session, reviewedBuildFingerprint: fingerprint, assembly: EMPTY_PROGRESS };
}

export function setCurrentAssemblyStage(
  session: BuildV2Session, stageId: AssemblyStageId,
): BuildV2Session {
  return { ...session, assembly: { ...session.assembly, currentStageId: stageId } };
}

/**
 * Mark a stage finished — but only when its confirmations are actually held.
 *
 * The check is here rather than in a caller so there is one answer to «is this
 * stage done?». A caller that could mark a stage complete without it would be a
 * second, weaker definition of completion.
 */
export function completeAssemblyStage(
  session: BuildV2Session, stageId: AssemblyStageId,
): BuildV2Session {
  if (!isStageSatisfied(session, stageId)) return session;
  if (session.assembly.completedStageIds.includes(stageId)) return session;
  return {
    ...session,
    assembly: {
      ...session.assembly,
      completedStageIds: [...session.assembly.completedStageIds, stageId],
    },
  };
}

/**
 * A confirmation is recorded only for a requirement THIS VERSION knows.
 *
 * An unknown or retired id is refused outright rather than stored and ignored:
 * storing it would put a value in the record that can never be honoured, and
 * every reader of the session would have to remember that.
 */
export function confirmSafetyItem(
  session: BuildV2Session, id: string, at: number,
): BuildV2Session {
  if (!isKnownConfirmationId(id)) return session;
  return {
    ...session,
    assembly: {
      ...session.assembly,
      confirmations: {
        ...session.assembly.confirmations,
        [id]: { state: 'user-confirmed', at },
      },
    },
  };
}

/**
 * Taking a confirmation back also un-completes anything that rested on it.
 *
 * Otherwise a stage stays «complete» while the requirement that made it
 * complete is gone — a completion record that outlives its own evidence.
 */
export function revokeSafetyItem(session: BuildV2Session, id: string): BuildV2Session {
  if (!(id in session.assembly.confirmations)) return session;
  const confirmations = { ...session.assembly.confirmations };
  delete confirmations[id];
  const next: BuildV2Session = { ...session, assembly: { ...session.assembly, confirmations } };
  return {
    ...next,
    assembly: {
      ...next.assembly,
      completedStageIds: next.assembly.completedStageIds.filter(s => isStageSatisfied(next, s)),
    },
  };
}

export function confirmManualReview(
  session: BuildV2Session, id: ManualReviewId, at: number,
): BuildV2Session {
  if (!isManualReviewId(id)) return session;
  return {
    ...session,
    assembly: {
      ...session.assembly,
      manualReviews: {
        ...session.assembly.manualReviews,
        [id]: { state: 'user-confirmed-review', at },
      },
    },
  };
}

/**
 * Record how the reader will limit current on first power.
 *
 * There is no way to record «none». Absence is the state that means the reader
 * has no path, and `canEnterFirstPower` reads absence directly — so the
 * unavailable case needs no value of its own, and cannot be set by anything
 * that is not one of the two real methods.
 */
export function setFirstPowerMethod(
  session: BuildV2Session, method: FirstPowerMethod,
): BuildV2Session {
  if (!isFirstPowerMethod(method)) return session;
  return { ...session, assembly: { ...session.assembly, firstPowerMethod: method } };
}

/* ── DERIVED QUESTIONS ────────────────────────────────────────────────────── */

/** Every confirmation this stage needs, held. Unknown ids cannot contribute. */
export function isStageSatisfied(session: BuildV2Session, stageId: AssemblyStageId): boolean {
  return confirmationsForStage(stageId)
    .every(c => session.assembly.confirmations[c.id]?.state === 'user-confirmed');
}

/**
 * May the reader put current into the build?
 *
 * Two independent conditions, and neither is a formality: the stage before it
 * must be genuinely complete, and a current-limited path must exist. There is
 * no third branch — no override, no acknowledgement, no «continue anyway».
 */
export function canEnterFirstPower(session: BuildV2Session): boolean {
  return session.assembly.firstPowerMethod !== undefined
    && isStageSatisfied(session, 'pre-power');
}

/* ── RECONCILIATION — THE CONTRACT THIS WHOLE MODULE EXISTS FOR ───────────── */

export type ReconcileStatus = 'valid' | 'needs-build-revalidation';

export interface ReconcileResult {
  readonly status: ReconcileStatus;
  /**
   * The session a consumer may act on.
   *
   * On `needs-build-revalidation` this carries the reader's SOURCES — so they
   * can go back and edit — and an empty assembly record. No caller has to
   * remember to ignore stale progress, because no caller is handed any.
   */
  readonly session: BuildV2Session;
  /**
   * What was set aside, for diagnostics only.
   *
   * Kept because «you lost an evening's confirmations» deserves an explanation
   * with something behind it. It is not progress and no consumer may treat it
   * as progress — it is deliberately not part of `session`.
   */
  readonly discarded?: AssemblyProgress;
  readonly reason?: 'fingerprint-changed' | 'never-reviewed' | 'no-longer-eligible';
}

/**
 * Decide whether persisted physical progress still belongs to the live build.
 *
 * The engine and the review run OUTSIDE this function — the caller reruns them
 * and passes in what came back. That keeps this pure, and keeps the decision
 * testable against constructed worlds rather than only against whatever the
 * current catalogue happens to produce.
 *
 * FAIL-CLOSED, AND NOT CLEVER ABOUT IT.
 *
 * When the fingerprint has moved, everything physical goes: confirmations,
 * manual reviews, completed stages, the current position, and the first-power
 * method — that last one because it was chosen for a first power that no longer
 * applies to this build.
 *
 * A partial-survival rule («the workspace stage cannot depend on the parts»)
 * is tempting and is deliberately not written yet. It would be a second set of
 * rules about which physical work depends on which part, maintained alongside
 * the first, and wrong in exactly the cases nobody thought of. Physical
 * progress belonging to a different eight-part build is more dangerous than
 * asking a reader to re-confirm.
 */
export function reconcileSession(
  session: BuildV2Session,
  fresh: { fingerprint: string; reviewEligible: boolean },
): ReconcileResult {
  const cleared: BuildV2Session = { ...session, assembly: EMPTY_PROGRESS };
  const had = hasProgress(session.assembly);

  if (session.reviewedBuildFingerprint === undefined) {
    /*
     * Progress without a reviewed build should not exist — but a hand-edited
     * or half-written record can contain it, and it must not be honoured.
     */
    return had
      ? { status: 'needs-build-revalidation', session: cleared,
        discarded: session.assembly, reason: 'never-reviewed' }
      : { status: 'valid', session };
  }

  if (!fresh.reviewEligible) {
    /*
     * The reader's own build stopped qualifying — a part went out of the
     * catalogue, or a choice reopened. Their sources are still theirs to edit;
     * their physical progress is no longer attached to anything reviewed.
     */
    return {
      status: 'needs-build-revalidation',
      session: { ...cleared, reviewedBuildFingerprint: undefined },
      discarded: had ? session.assembly : undefined,
      reason: 'no-longer-eligible',
    };
  }

  if (session.reviewedBuildFingerprint !== fresh.fingerprint) {
    return {
      status: 'needs-build-revalidation',
      session: { ...cleared, reviewedBuildFingerprint: undefined },
      discarded: had ? session.assembly : undefined,
      reason: 'fingerprint-changed',
    };
  }

  return { status: 'valid', session };
}

const hasProgress = (a: AssemblyProgress): boolean =>
  a.completedStageIds.length > 0
  || Object.keys(a.confirmations).length > 0
  || Object.keys(a.manualReviews).length > 0
  || a.firstPowerMethod !== undefined
  || a.currentStageId !== undefined;

/* ── VALIDATION ───────────────────────────────────────────────────────────
 *
 * Shared with the storage adapter, and kept here because what a valid session
 * IS belongs to the model rather than to the thing that writes it.
 *
 * Every branch fails closed. A record that is wrong in any way is refused
 * whole rather than repaired — a repaired safety record is a record nobody
 * can vouch for, and the cost of refusing is that the reader re-confirms.
 */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isStringMap = (v: unknown): v is Record<string, string> =>
  isObject(v) && Object.values(v).every(x => typeof x === 'string');

function validateInputs(raw: unknown): RecommendationInput | null {
  if (!isObject(raw)) return null;
  if (typeof raw.droneTypeId !== 'string' || raw.droneTypeId.length === 0) return null;
  for (const k of ['sizeInch', 'cellCount'] as const) {
    if (raw[k] !== undefined && typeof raw[k] !== 'number') return null;
  }
  if (raw.budgetTier !== undefined && typeof raw.budgetTier !== 'string') return null;
  if (raw.owned !== undefined) {
    if (!isObject(raw.owned)) return null;
    for (const k of ['videoSystem', 'rcSystem'] as const) {
      if (raw.owned[k] !== undefined && typeof raw.owned[k] !== 'string') return null;
    }
    /*
     * `owned.parts` means «hardware already in my hands», and the V2 journey
     * never populates it — it asks about ECOSYSTEMS. A session carrying one
     * would be claiming ownership the reader never stated, so it is refused
     * rather than passed through.
     */
    if (raw.owned.parts !== undefined) return null;
  }
  if (raw.selectedParts !== undefined && !isStringMap(raw.selectedParts)) return null;
  return raw as unknown as RecommendationInput;
}

function validateProgress(raw: unknown): AssemblyProgress | null {
  if (!isObject(raw)) return null;

  if (raw.currentStageId !== undefined && !isAssemblyStageId(raw.currentStageId)) return null;

  if (!Array.isArray(raw.completedStageIds)) return null;
  /*
   * Unknown stage ids are REFUSED rather than filtered. A completion list is
   * small and fully known; an entry that is not a stage means the record was
   * written by something this version does not understand, and silently
   * dropping part of a safety record is how a partially-trusted one is born.
   */
  if (!raw.completedStageIds.every(isAssemblyStageId)) return null;
  if (new Set(raw.completedStageIds).size !== raw.completedStageIds.length) return null;

  if (!isObject(raw.confirmations)) return null;
  for (const [id, v] of Object.entries(raw.confirmations)) {
    if (typeof id !== 'string' || id.length === 0) return null;
    if (!isObject(v) || v.state !== 'user-confirmed' || typeof v.at !== 'number') return null;
  }

  if (!isObject(raw.manualReviews)) return null;
  for (const [id, v] of Object.entries(raw.manualReviews)) {
    if (typeof id !== 'string' || id.length === 0) return null;
    if (!isObject(v) || v.state !== 'user-confirmed-review' || typeof v.at !== 'number') {
      return null;
    }
  }

  if (raw.firstPowerMethod !== undefined && !isFirstPowerMethod(raw.firstPowerMethod)) return null;

  return raw as unknown as AssemblyProgress;
}

export function validateSession(raw: unknown): BuildV2Session | null {
  if (!isObject(raw)) return null;
  if (raw.version !== 1) return null;
  if (!isObject(raw.phase1)) return null;

  const inputs = validateInputs(raw.phase1.inputs);
  if (!inputs) return null;
  if (!isStringMap(raw.phase1.selectedParts)) return null;

  if (raw.reviewedBuildFingerprint !== undefined
    && (typeof raw.reviewedBuildFingerprint !== 'string'
      || raw.reviewedBuildFingerprint.length === 0)) return null;

  const assembly = validateProgress(raw.assembly);
  if (!assembly) return null;

  return {
    version: 1,
    phase1: { inputs, selectedParts: raw.phase1.selectedParts },
    reviewedBuildFingerprint: raw.reviewedBuildFingerprint as string | undefined,
    assembly,
  };
}

/**
 * Confirmations a stored session holds that THIS version cannot honour.
 *
 * A session written by a newer build may legitimately contain ids this one has
 * never heard of, and one written before a retirement may hold a retired id.
 * Neither satisfies anything — `isStageSatisfied` only ever asks the registry —
 * and this is the way to see that rather than infer it.
 */
export const unknownConfirmationIds = (session: BuildV2Session): readonly string[] =>
  Object.keys(session.assembly.confirmations).filter(id => !isKnownConfirmationId(id));

/** The stages, in build order, with what each still needs. For a future UI. */
export const stageOrder = (): readonly AssemblyStageId[] => ASSEMBLY_STAGE_IDS;
