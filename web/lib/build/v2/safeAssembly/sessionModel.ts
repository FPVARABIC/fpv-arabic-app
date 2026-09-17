import type { RecommendationInput } from '@core/data/assembly/recommendation/types';
import {
  isAssemblyStageId, isKnownConfirmationId, isManualReviewId, isFirstPowerMethod,
  confirmationsForStage, manualReviewsForStage, STAGE_PREREQUISITES, ASSEMBLY_STAGE_IDS,
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

/**
 * WHERE THE SESSION STANDS RELATIVE TO A REVIEWED BUILD.
 *
 * `needs-revalidation` is the state that keeps an edit from being destructive.
 * A reader who changes their budget preference has probably not changed a
 * single physical part — but this module cannot know that, because it does not
 * run the engine. So the edit moves the session here, the physical record is
 * set aside rather than deleted, and `reconcileSession` decides once the engine
 * has actually answered.
 */
export type ReviewState = 'unreviewed' | 'reviewed' | 'needs-revalidation';

/* ── THE SESSION ──────────────────────────────────────────────────────────── */

/**
 * The Phase-1 answers, WITHOUT the reader's part choices.
 *
 * Mechanically derived from the canonical engine type rather than retyped, so
 * a field added to `RecommendationInput` arrives here automatically and this
 * never becomes a parallel DTO to keep in step.
 *
 * `selectedParts` is subtracted because the session stores it once, beside the
 * inputs, at `phase1.selectedParts`. Two persisted copies of one answer is two
 * answers to the same question, and nothing decides which one is right.
 * `recommendationInputFromSession` puts them back together for the engine.
 */
export type Phase1SourceInputs = Omit<RecommendationInput, 'selectedParts'>;

export interface AssemblyProgress {
  readonly currentStageId?: AssemblyStageId;
  readonly completedStageIds: readonly AssemblyStageId[];
  readonly confirmations: Readonly<Record<string, ConfirmationState>>;
  readonly manualReviews: Readonly<Record<string, ManualReviewState>>;
  readonly firstPowerMethod?: FirstPowerMethod;
}

/**
 * Physical work set aside while the build is being revalidated.
 *
 * It is a SEPARATE FIELD rather than a flag on `assembly` so that no consumer
 * can receive it by accident. `assembly` is always the usable record; anything
 * in here is not progress until `reconcileSession` puts it back, and no
 * transition in this file reads it.
 */
export interface QuarantinedProgress {
  /** The build this work was done against. */
  readonly fingerprint: string;
  readonly assembly: AssemblyProgress;
}

export interface BuildV2Session {
  readonly version: 1;
  readonly phase1: {
    readonly inputs: Phase1SourceInputs;
    readonly selectedParts: Readonly<Record<string, string>>;
  };
  readonly reviewState: ReviewState;
  /** The build the reader accepted. Present only while `reviewState` is `reviewed`. */
  readonly reviewedBuildFingerprint?: string;
  readonly assembly: AssemblyProgress;
  readonly quarantine?: QuarantinedProgress;
}

const EMPTY_PROGRESS: AssemblyProgress = Object.freeze({
  completedStageIds: Object.freeze([]) as readonly AssemblyStageId[],
  confirmations: Object.freeze({}),
  manualReviews: Object.freeze({}),
});

export function createSession(
  inputs: Phase1SourceInputs,
  selectedParts: Readonly<Record<string, string>> = {},
): BuildV2Session {
  return {
    version: 1,
    phase1: { inputs, selectedParts },
    reviewState: 'unreviewed',
    assembly: EMPTY_PROGRESS,
  };
}

/**
 * THE ONE PLACE THE ENGINE'S INPUT IS REASSEMBLED.
 *
 * Callers rerun `proposeBuild` with this and nothing else. Hand-merging the two
 * fields at a call site would be a second answer to «what does the engine get?»,
 * and the first time the two disagreed the build on screen would not be the
 * build the fingerprint describes.
 */
export function recommendationInputFromSession(
  session: BuildV2Session,
): RecommendationInput {
  return { ...session.phase1.inputs, selectedParts: session.phase1.selectedParts };
}

/* ── TRANSITIONS ──────────────────────────────────────────────────────────── */

/**
 * The reader went back and changed an answer or a part.
 *
 * QUARANTINE, NOT DEMOLITION. The first version of this function deleted the
 * reviewed fingerprint and every confirmation immediately — before anything had
 * established that the build actually changed. A reader who switched their
 * budget answer from «متوازن» to «لا تفضيل» and got back the identical eight
 * parts lost an evening of soldering confirmations for nothing.
 *
 * So the physical record is moved aside with the fingerprint it was earned
 * against, and `reconcileSession` decides its fate once the engine has run. It
 * is not usable in the meantime — `assembly` is empty and every transition
 * below refuses while `reviewState` is not `reviewed`.
 *
 * Editing twice does not lose the original: a second edit while already in
 * quarantine keeps the first quarantine, because the work being protected was
 * done against THAT build, not against the empty record left behind.
 */
export function updatePhase1Sources(
  session: BuildV2Session,
  inputs: Phase1SourceInputs,
  selectedParts: Readonly<Record<string, string>>,
): BuildV2Session {
  const phase1 = { inputs, selectedParts };

  if (session.reviewState === 'needs-revalidation') {
    return { ...session, phase1 };
  }

  if (session.reviewState === 'reviewed' && session.reviewedBuildFingerprint !== undefined) {
    return {
      version: 1,
      phase1,
      reviewState: 'needs-revalidation',
      assembly: EMPTY_PROGRESS,
      quarantine: hasProgress(session.assembly)
        ? { fingerprint: session.reviewedBuildFingerprint, assembly: session.assembly }
        : undefined,
    };
  }

  /* Never reviewed: there is nothing earned against a build to protect. */
  return { version: 1, phase1, reviewState: 'unreviewed', assembly: EMPTY_PROGRESS };
}

/** The reader reached the end of «اختيار القطع» with this exact build. */
export function markBuildReviewed(
  session: BuildV2Session, fingerprint: string,
): BuildV2Session {
  /*
   * Re-marking the SAME build is not a reset. A reader who walks back to the
   * review and forward again has not undone their soldering.
   */
  if (session.reviewState === 'reviewed' && session.reviewedBuildFingerprint === fingerprint) {
    return session;
  }
  return {
    ...session,
    reviewState: 'reviewed',
    reviewedBuildFingerprint: fingerprint,
    assembly: EMPTY_PROGRESS,
    quarantine: undefined,
  };
}

/**
 * Every transition that records physical work asks this first.
 *
 * Progress may only be created against a build the reader has actually
 * reviewed and that is currently valid. An unreviewed session has no build for
 * a confirmation to be about; a quarantined one has a build whose identity is
 * in doubt until the engine settles it.
 */
const acceptsProgress = (s: BuildV2Session): boolean => s.reviewState === 'reviewed';

export function setCurrentAssemblyStage(
  session: BuildV2Session, stageId: AssemblyStageId,
): BuildV2Session {
  if (!acceptsProgress(session) || !isAssemblyStageId(stageId)) return session;
  return { ...session, assembly: { ...session.assembly, currentStageId: stageId } };
}

/**
 * Mark a stage finished.
 *
 * Every precondition is checked HERE rather than left to a screen. A pure model
 * that can be driven into an impossible state by a direct call has made the UI
 * the only safety layer, and the UI is the part most likely to be rewritten.
 *
 * Refused unless: the session is reviewed and valid; every prerequisite stage
 * is already complete; every safety confirmation AND manual review the stage
 * requires is held; and — for first power alone — a current-limited method
 * exists.
 */
export function completeAssemblyStage(
  session: BuildV2Session, stageId: AssemblyStageId,
): BuildV2Session {
  if (!acceptsProgress(session)) return session;
  if (!canCompleteStage(session, stageId)) return session;
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
  if (!acceptsProgress(session) || !isKnownConfirmationId(id)) return session;
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
 * Taking a confirmation back also un-completes everything that rested on it.
 *
 * Otherwise a stage stays «complete» while the requirement that made it
 * complete is gone — and, worse, first power stays complete while the
 * inspection before it does not. `pruneCompletions` walks that to a fixpoint.
 */
export function revokeSafetyItem(session: BuildV2Session, id: string): BuildV2Session {
  if (!(id in session.assembly.confirmations)) return session;
  const confirmations = { ...session.assembly.confirmations };
  delete confirmations[id];
  return pruneCompletions({ ...session, assembly: { ...session.assembly, confirmations } });
}

export function confirmManualReview(
  session: BuildV2Session, id: ManualReviewId, at: number,
): BuildV2Session {
  if (!acceptsProgress(session) || !isManualReviewId(id)) return session;
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
 * The symmetric operation, and it exists because the review now GATES a stage.
 *
 * A reader who realises they compared the wrong prop must be able to take the
 * statement back — and taking it back has to withdraw the pre-power completion
 * and, through it, first power. A review that could only ever be added would be
 * a one-way door on the most consequential claim in the phase.
 */
export function revokeManualReview(session: BuildV2Session, id: string): BuildV2Session {
  if (!(id in session.assembly.manualReviews)) return session;
  const manualReviews = { ...session.assembly.manualReviews };
  delete manualReviews[id];
  return pruneCompletions({ ...session, assembly: { ...session.assembly, manualReviews } });
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
  if (!acceptsProgress(session) || !isFirstPowerMethod(method)) return session;
  return { ...session, assembly: { ...session.assembly, firstPowerMethod: method } };
}

/* ── DERIVED QUESTIONS ────────────────────────────────────────────────────── */

/**
 * Every requirement this stage has, held.
 *
 * Both kinds count. A safety confirmation is «I did this»; a manual review is
 * «I went and read what the catalogue could not tell me». The pre-power stage
 * needs both, and treating the second as an aside is how first power became
 * reachable without anyone looking at the motor's current data.
 */
export function isStageSatisfied(session: BuildV2Session, stageId: AssemblyStageId): boolean {
  const confirmed = confirmationsForStage(stageId)
    .every(c => session.assembly.confirmations[c.id]?.state === 'user-confirmed');
  const reviewed = manualReviewsForStage(stageId)
    .every(r => session.assembly.manualReviews[r.id]?.state === 'user-confirmed-review');
  return confirmed && reviewed;
}

/** Its own requirements, its prerequisites, and — for first power — a method. */
export function canCompleteStage(
  session: BuildV2Session, stageId: AssemblyStageId,
): boolean {
  if (!isStageSatisfied(session, stageId)) return false;
  if (!STAGE_PREREQUISITES[stageId].every(p => session.assembly.completedStageIds.includes(p))) {
    return false;
  }
  if (stageId === 'first-power') return canEnterFirstPower(session);
  return true;
}

/**
 * May the reader put current into the build?
 *
 * Three independent conditions, and none is a formality: a current-limited path
 * exists, the inspection before it is genuinely complete — every confirmation
 * AND the current-headroom review — and the session belongs to a reviewed
 * build. There is no fourth branch: no override, no acknowledgement, no
 * «continue anyway».
 */
export function canEnterFirstPower(session: BuildV2Session): boolean {
  return acceptsProgress(session)
    && session.assembly.firstPowerMethod !== undefined
    && isStageSatisfied(session, 'pre-power')
    && session.assembly.completedStageIds.includes('pre-power');
}

/**
 * Withdraw every completion that no longer stands, repeatedly.
 *
 * One pass is not enough: revoking a pre-power confirmation invalidates
 * pre-power, which invalidates first power, whose own confirmations are
 * untouched and would otherwise keep it looking finished. The loop runs to a
 * fixpoint — at most eight rounds, since each round removes at least one stage.
 */
function pruneCompletions(session: BuildV2Session): BuildV2Session {
  let completed = session.assembly.completedStageIds;
  for (;;) {
    const kept = completed.filter(stageId => {
      if (!isStageSatisfied(session, stageId)) return false;
      if (!STAGE_PREREQUISITES[stageId].every(p => completed.includes(p))) return false;
      if (stageId === 'first-power' && session.assembly.firstPowerMethod === undefined) {
        return false;
      }
      return true;
    });
    if (kept.length === completed.length) break;
    completed = kept;
  }
  if (completed === session.assembly.completedStageIds) return session;
  return { ...session, assembly: { ...session.assembly, completedStageIds: completed } };
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
  /** True when quarantined work was handed back because the build is the same. */
  readonly restored?: boolean;
}

/**
 * Decide whether persisted physical progress still belongs to the live build.
 *
 * The engine and the review run OUTSIDE this function — the caller reruns them
 * and passes in what came back. That keeps this pure, and keeps the decision
 * testable against constructed worlds rather than only against whatever the
 * current catalogue happens to produce.
 *
 * THE ONE CASE WORTH PRESERVING, AND THE THREE THAT FAIL CLOSED.
 *
 * A session awaiting revalidation whose build comes back IDENTICAL gets its
 * work returned exactly as it was — that is the whole reason quarantine exists,
 * and it is the common case: most edits to a Phase-1 answer do not move a
 * single part.
 *
 * Everything else clears: a fingerprint that moved, a build that stopped
 * qualifying, or progress recorded against no reviewed build at all. No
 * partial-survival rule («the workspace stage cannot depend on the parts») is
 * written yet, and deliberately: it would be a second set of rules about which
 * physical work depends on which part, maintained alongside the first, and
 * wrong in exactly the cases nobody thought of.
 */
export function reconcileSession(
  session: BuildV2Session,
  fresh: { fingerprint: string; reviewEligible: boolean },
): ReconcileResult {
  const clearedBase: BuildV2Session = {
    version: 1,
    phase1: session.phase1,
    reviewState: 'unreviewed',
    assembly: EMPTY_PROGRESS,
  };

  if (session.reviewState === 'needs-revalidation') {
    const held = session.quarantine;
    if (fresh.reviewEligible && held !== undefined && held.fingerprint === fresh.fingerprint) {
      return {
        status: 'valid',
        restored: true,
        session: {
          version: 1,
          phase1: session.phase1,
          reviewState: 'reviewed',
          reviewedBuildFingerprint: fresh.fingerprint,
          assembly: held.assembly,
        },
      };
    }
    return {
      status: 'needs-build-revalidation',
      session: clearedBase,
      discarded: held?.assembly,
      reason: fresh.reviewEligible ? 'fingerprint-changed' : 'no-longer-eligible',
    };
  }

  if (session.reviewState === 'unreviewed' || session.reviewedBuildFingerprint === undefined) {
    /*
     * Progress without a reviewed build should not exist — but a hand-edited
     * or half-written record can contain it, and it must not be honoured.
     */
    return hasProgress(session.assembly)
      ? {
        status: 'needs-build-revalidation', session: clearedBase,
        discarded: session.assembly, reason: 'never-reviewed',
      }
      : { status: 'valid', session };
  }

  if (!fresh.reviewEligible) {
    return {
      status: 'needs-build-revalidation',
      session: clearedBase,
      discarded: hasProgress(session.assembly) ? session.assembly : undefined,
      reason: 'no-longer-eligible',
    };
  }

  if (session.reviewedBuildFingerprint !== fresh.fingerprint) {
    return {
      status: 'needs-build-revalidation',
      session: clearedBase,
      discarded: hasProgress(session.assembly) ? session.assembly : undefined,
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

function validateInputs(raw: unknown): Phase1SourceInputs | null {
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
  /*
   * TWO AUTHORITIES FOR ONE ANSWER IS NO AUTHORITY.
   *
   * `selectedParts` lives at `phase1.selectedParts` and nowhere else. A record
   * carrying it inside `inputs` as well has two answers to «what did the reader
   * choose?», and nothing in the system decides which one wins — so the build
   * the engine produces could differ from the build the fingerprint describes.
   * Refused rather than preferred one way or the other.
   */
  if ('selectedParts' in raw) return null;
  return raw as unknown as Phase1SourceInputs;
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

const REVIEW_STATES: ReadonlySet<string> = new Set<ReviewState>([
  'unreviewed', 'reviewed', 'needs-revalidation',
]);

export function validateSession(raw: unknown): BuildV2Session | null {
  if (!isObject(raw)) return null;
  if (raw.version !== 1) return null;
  if (!isObject(raw.phase1)) return null;

  const inputs = validateInputs(raw.phase1.inputs);
  if (!inputs) return null;
  if (!isStringMap(raw.phase1.selectedParts)) return null;

  if (typeof raw.reviewState !== 'string' || !REVIEW_STATES.has(raw.reviewState)) return null;
  const reviewState = raw.reviewState as ReviewState;

  if (raw.reviewedBuildFingerprint !== undefined
    && (typeof raw.reviewedBuildFingerprint !== 'string'
      || raw.reviewedBuildFingerprint.length === 0)) return null;
  /* A reviewed session without the build it reviewed is not a session. */
  if (reviewState === 'reviewed' && raw.reviewedBuildFingerprint === undefined) return null;

  const assembly = validateProgress(raw.assembly);
  if (!assembly) return null;

  let quarantine: QuarantinedProgress | undefined;
  if (raw.quarantine !== undefined) {
    if (!isObject(raw.quarantine)) return null;
    if (typeof raw.quarantine.fingerprint !== 'string'
      || raw.quarantine.fingerprint.length === 0) return null;
    const held = validateProgress(raw.quarantine.assembly);
    if (!held) return null;
    /* Quarantine only means something while revalidation is pending. */
    if (reviewState !== 'needs-revalidation') return null;
    quarantine = { fingerprint: raw.quarantine.fingerprint, assembly: held };
  }

  return {
    version: 1,
    phase1: { inputs, selectedParts: raw.phase1.selectedParts },
    reviewState,
    reviewedBuildFingerprint: raw.reviewedBuildFingerprint as string | undefined,
    assembly,
    quarantine,
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

/** The stages, in build order. For a future UI. */
export const stageOrder = (): readonly AssemblyStageId[] => ASSEMBLY_STAGE_IDS;
