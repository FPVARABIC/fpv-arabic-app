import type { RecommendationInput } from '@core/data/assembly/recommendation/types';

/**
 * WHICH ANSWER ACTUALLY CLOSED THE DOOR
 * =====================================
 *
 * When no complete blocker-free build exists, the engine says so once, in one
 * sentence, on every unavailable category:
 *
 *   «لا توجد تركيبة كاملة خالية من الموانع لهذا النوع في الكتالوج الحالي.»
 *
 * That sentence names THE TYPE. For 108 of the 180 readers who can reach it,
 * the type is not the cause — their own radio or goggles is. Freestyle is
 * perfectly buildable; it is a Crossfire receiver that has nowhere to go. A
 * reader told «this type cannot be built» does the rational thing and abandons
 * the type, which is the one answer that was fine.
 *
 * WHY THIS IS NOT READ OFF THE ENGINE'S REASONS
 * ---------------------------------------------
 * It would be, if the information were there. `DecisionReason.inputKey` is the
 * right channel and the engine does populate it — `receivers` on a HEALTHY
 * build carries `ownedRcSystem`. But on the global-failure path every reason
 * is a bare `no-candidate` with `inputKey: undefined`: the search failed as a
 * whole, so there is no per-category filter to attribute. Measured, not
 * assumed — see `scripts/testReaderSelection.ts`, section AG.
 *
 * Adding that provenance is a DOMAIN change, and the domain is frozen. So this
 * asks the engine a different question instead — one it can already answer.
 *
 * THE ENGINE AS AN ORACLE, NOT AS A STRING TO PARSE
 * -------------------------------------------------
 * «Would a build exist if you had not told us about your radio?» is a question
 * `proposeBuild` answers exactly, by running it again without that answer. So
 * the diagnosis is a small set of counterfactuals:
 *
 *   1. no owned equipment named at all      → nothing to blame but the type
 *   2. drop EVERYTHING owned; still no path → the type really is the cause
 *   3. otherwise at least one owned answer is implicated. For each one, ask
 *      whether it is fatal ON ITS OWN — that is what lets «your radio» and
 *      «your goggles» be reported as two separate facts rather than one vague
 *      «your equipment».
 *   4. if no single one is fatal but the pair is, say that, and do not claim
 *      either is individually impossible — because it is not.
 *
 * Never a substring match on Arabic prose. A diagnosis that depends on the
 * wording of a sentence breaks the day somebody improves the sentence, and
 * breaks silently, in the direction of telling the reader something false.
 *
 * COST
 * ----
 * At most three extra `proposeBuild` runs, ~4ms each, and only on a screen the
 * reader reaches because a build already failed. Across all 108 real dead ends
 * it averages 2.67 runs.
 */

/** The reader's own equipment answers, as causes a sentence can name. */
export type DeadEndCause = 'rc' | 'video';

export type DeadEndDiagnosis =
  /**
   * The type, size or voltage cannot be finished from this catalogue whatever
   * the reader owns. The engine's own sentence is the right one to show.
   */
  | { kind: 'type-level' }
  /**
   * The reader's own equipment is what closed the door.
   *
   * `causes` names every answer to report. `jointOnly` distinguishes two
   * genuinely different facts: with it false, each named answer is impossible
   * on its own; with it true, each is individually fine and only the
   * combination fails — so the copy must not accuse either one.
   */
  | { kind: 'owned-equipment'; causes: readonly DeadEndCause[]; jointOnly: boolean };

/** Just enough of a build to ask «does one exist?». */
interface HasProvenPath { provenPath: unknown | null }

/**
 * Diagnose a build that has already failed.
 *
 * `propose` is injected rather than imported so this module holds no opinion
 * about the engine and a test can hand it a constructed world — which is the
 * only way to exercise the `jointOnly` branch, since the current catalogue
 * produces no reader for whom two ecosystems are fine apart and fatal
 * together. The branch exists so a catalogue change cannot quietly turn a true
 * sentence into a false one.
 *
 * Call ONLY when `provenPath === null`. On a healthy build every counterfactual
 * is wasted work and the answer is meaningless.
 */
export function diagnoseDeadEnd(
  input: RecommendationInput,
  propose: (i: RecommendationInput) => HasProvenPath,
): DeadEndDiagnosis {
  const rcSystem = input.owned?.rcSystem;
  const videoSystem = input.owned?.videoSystem;

  // 1 — they named no equipment, so no equipment answer can be at fault.
  if (!rcSystem && !videoSystem) return { kind: 'type-level' };

  // 2 — with the equipment set aside, is there a build at all?
  if (propose({ ...input, owned: {} }).provenPath === null) return { kind: 'type-level' };

  // 3 — which single answers are fatal on their own?
  const causes: DeadEndCause[] = [];
  if (rcSystem && propose({ ...input, owned: { rcSystem } }).provenPath === null) {
    causes.push('rc');
  }
  if (videoSystem && propose({ ...input, owned: { videoSystem } }).provenPath === null) {
    causes.push('video');
  }
  if (causes.length > 0) return { kind: 'owned-equipment', causes, jointOnly: false };

  // 4 — each is survivable alone; together they are not.
  const both: DeadEndCause[] = [];
  if (rcSystem) both.push('rc');
  if (videoSystem) both.push('video');
  return { kind: 'owned-equipment', causes: both, jointOnly: true };
}
