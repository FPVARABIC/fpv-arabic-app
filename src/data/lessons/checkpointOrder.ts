/**
 * The order a checkpoint's options are SHOWN in.
 *
 * WHAT WAS WRONG
 * --------------
 * The options are authored in a fixed order, and the correct one kept landing
 * in the same place: of the section's 68 checkpoints, 57 had their answer at
 * «b» and not one at «d». A learner who noticed — and learners do — could
 * score without reading, and «3 من 4 من أول محاولة» stopped measuring
 * anything.
 *
 * WHAT THIS DOES
 * --------------
 * Permutes the options for display, deterministically, seeded by the
 * checkpoint's own id. Deterministic matters twice over: the same learner
 * sees the same layout every time they come back to a question (a list that
 * reshuffles under a saved answer is a bug, not a quiz), and the section's
 * distribution is a fact a test can assert rather than a die roll.
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH
 * -----------------------------------
 * Option IDS. Everything that persists, scores or is tested — the saved
 * answer, `checkpointFirstAnswers`, the per-option feedback, the browser
 * test's `checkpoint-x-option-b` selectors — is keyed by id, and an id never
 * moves. This module changes what position an option is drawn at, and
 * nothing else.
 *
 * Pure; used by both renderers. Exercised by `scripts/testCheckpointOrder.ts`.
 */
import type { JourneyCheckpoint, JourneyCheckpointOption } from '../../types/lessonJourney';

/** FNV-1a: a small, well-spread string hash. Stable across engines and runs. */
function seedFrom(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0 || 1;
}

/** xorshift32: one step of a deterministic PRNG. */
function step(state: number): number {
  let x = state >>> 0;
  x ^= (x << 13) >>> 0; x >>>= 0;
  x ^= x >>> 17;
  x ^= (x << 5) >>> 0; x >>>= 0;
  return x >>> 0 || 1;
}

/**
 * A stable permutation of `options`, seeded by `seedText` (the checkpoint id).
 * Fisher-Yates, so every option appears exactly once.
 */
export function shuffledBySeed<T>(seedText: string, options: readonly T[]): T[] {
  const out = [...options];
  let state = seedFrom(seedText);
  for (let i = out.length - 1; i > 0; i--) {
    state = step(state);
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The options of one checkpoint, in the order a learner should see them. */
export function displayOptions(checkpoint: JourneyCheckpoint): JourneyCheckpointOption[] {
  return shuffledBySeed(checkpoint.id, checkpoint.options);
}

/** Zero-based position the correct option is drawn at. For tests and audits. */
export function correctOptionPosition(checkpoint: JourneyCheckpoint): number {
  return displayOptions(checkpoint).findIndex(o => o.correct);
}
