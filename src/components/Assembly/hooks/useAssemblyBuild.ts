import { useState, useCallback, useEffect } from 'react';
import { buildStages } from '../../../data/assembly/buildStages';
import type { BasePart, Frame } from '../../../data/assembly/types';
import { saveAssemblyProject, type RestoredAssemblyProject } from '../utils/assemblyPersistence';
import { frameMatchesSize } from '../utils/frameSizeMatch';

export interface AssemblySelections {
  sizeInch?: number;
  batteryVoltage?: number;
  parts: Record<string, BasePart>;
}

// droneTypeId is threaded through only for persistence bookkeeping (it's
// never read for any selection/filtering logic here — that stays exactly
// where it already lived, in BuildFlow.tsx). `restored`, when present, seeds
// the hook's initial state directly from an already-validated saved project
// (see utils/assemblyPersistence.ts) instead of starting a fresh build —
// the caller (BuildFlow.tsx) is responsible for only passing a `restored`
// value whose own droneTypeId matches this exact build.
export function useAssemblyBuild(
  droneTypeId: string,
  restored?: RestoredAssemblyProject | null,
  initialStageIndex = 1,
) {
  const [stageIndex, setStageIndex] = useState(restored?.stageIndex ?? initialStageIndex);
  const [selections, setSelections] = useState<AssemblySelections>(() => (
    restored
      ? { sizeInch: restored.sizeInch, batteryVoltage: restored.batteryVoltage, parts: restored.parts }
      : { parts: {} }
  ));

  const totalStages = buildStages.length;
  const stage = buildStages[stageIndex];

  const goNext = useCallback(() => setStageIndex(i => Math.min(i + 1, totalStages - 1)), [totalStages]);
  const goPrev = useCallback(() => setStageIndex(i => Math.max(i - 1, 0)), []);

  // Stage 2's size is a real build constraint (Phase 3), not write-only
  // state: an already-selected frame that no longer matches the new size
  // (per frameMatchesSize's tolerance) is cleared. Nothing else is touched
  // — no other category has its own selection gated on frame size today
  // (motor/propeller-vs-frame is only ever cross-checked later in the
  // final compatibility report, never as a selection-time filter), so
  // "clear only what genuinely depends on it" means clearing the frame
  // itself and nothing more.
  const selectSize = useCallback((sizeInch: number) => setSelections(s => {
    const currentFrame = s.parts.frames as Frame | undefined;
    if (!currentFrame || frameMatchesSize(currentFrame, sizeInch)) {
      return { ...s, sizeInch };
    }
    const nextParts = { ...s.parts };
    delete nextParts.frames;
    return { ...s, sizeInch, parts: nextParts };
  }), []);
  // Changing the battery voltage can invalidate parts selected under the
  // previous voltage. Only a part genuinely tagged incompatible with the
  // new voltage (per its own compatibilityTags.batteryVoltages — the same
  // field BuildFlow.tsx uses to filter each stage's part list) is cleared;
  // everything else (drone type, size, and any voltage-agnostic selection
  // such as frame/receiver/gps/buzzer/capacitor/tools) is left untouched.
  const selectBatteryVoltage = useCallback((batteryVoltage: number) => setSelections(s => {
    const nextParts: typeof s.parts = {};
    for (const [category, part] of Object.entries(s.parts)) {
      if (part.compatibilityTags.batteryVoltages.includes(batteryVoltage)) {
        nextParts[category] = part;
      }
    }
    return { ...s, batteryVoltage, parts: nextParts };
  }), []);
  const selectPart = useCallback(
    (category: string, part: BasePart) => setSelections(s => ({ ...s, parts: { ...s.parts, [category]: part } })),
    [],
  );

  // Persists on every change (stage advance/back, size, voltage, any part
  // pick) — a plain best-effort write, see saveAssemblyProject's own doc
  // comment for why it can never throw or crash this effect.
  useEffect(() => {
    saveAssemblyProject({ droneTypeId, stageIndex, sizeInch: selections.sizeInch, batteryVoltage: selections.batteryVoltage, parts: selections.parts });
  }, [droneTypeId, stageIndex, selections]);

  return { stage, stageIndex, totalStages, selections, goNext, goPrev, selectSize, selectBatteryVoltage, selectPart };
}
