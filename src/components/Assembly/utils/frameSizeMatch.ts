// Assembly Stage 2 size <-> frame matching (Phase 3). Split into its own
// tiny module so the exact same tolerance and match logic is shared by
// every place that needs it: the frame-stage filter (BuildFlow.tsx), the
// size-change invalidation (useAssemblyBuild.ts), and restored-project
// validation (utils/assemblyPersistence.ts) — one source of truth, not
// three copies of the same magic number.
import type { Frame } from '../../../data/assembly/types';
import { droneSizeOptions, type DroneSizeOption } from '../../../data/assembly/droneSizeOptions';
import { frames } from '../../../data/assembly/parts/frames';

// Frame sizeInch values are real decimals (5, 5.1, 5.5, 7); Stage 2's
// droneSizeOptions.ts offers rounded nominal-class labels instead (3.5, 5,
// 7). This is the EXACT same nominal-vs-real-decimal precision mismatch
// already documented and handled by
// data/assembly/compatibility/validators.ts's own frame-motor tolerance —
// a frame's own sourced text often calls itself "5 inch" even at
// sizeInch: 5.1 (see frame-speedybee-mario5-budget, frame-aos5-evo-mid).
// Reusing that exact, already-established 0.15" tolerance value here is
// applying the current data model's own convention, not fabricating a new
// approximate range: an exact-match-only rule would make "5 إنش" wrongly
// exclude two otherwise fully-buildable real 5.1" freestyle frames.
export const FRAME_SIZE_TOLERANCE_INCH = 0.15;

export function frameMatchesSize(frame: Frame, sizeInch: number): boolean {
  return Math.abs(frame.specs.sizeInch - sizeInch) <= FRAME_SIZE_TOLERANCE_INCH;
}

// Single source of truth for "which of the canonical droneSizeOptions are
// actually reachable for a given drone type" — derived live from the real
// frame catalog (each frame's own compatibilityTags.droneTypes, the exact
// field BuildFlow.tsx already uses to filter every other category, and its
// real specs.sizeInch via frameMatchesSize above), never a hardcoded
// per-drone-type size map. A size only appears here when at least one real
// frame for that drone type is genuinely reachable at it, so nothing that
// calls this can ever offer a guaranteed dead end.
export function getAvailableSizeOptions(droneTypeId: string): DroneSizeOption[] {
  return droneSizeOptions.filter(opt =>
    frames.some(f => f.compatibilityTags.droneTypes.includes(droneTypeId) && frameMatchesSize(f, opt.sizeInch)),
  );
}
