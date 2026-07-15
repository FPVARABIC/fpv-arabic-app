import { useState, useCallback } from 'react';
import { buildStages } from '../../../data/assembly/buildStages';
import type { BasePart } from '../../../data/assembly/types';

export interface AssemblySelections {
  sizeInch?: number;
  batteryVoltage?: number;
  parts: Record<string, BasePart>;
}

export function useAssemblyBuild(initialStageIndex = 1) {
  const [stageIndex, setStageIndex] = useState(initialStageIndex);
  const [selections, setSelections] = useState<AssemblySelections>({ parts: {} });

  const totalStages = buildStages.length;
  const stage = buildStages[stageIndex];

  const goNext = useCallback(() => setStageIndex(i => Math.min(i + 1, totalStages - 1)), [totalStages]);
  const goPrev = useCallback(() => setStageIndex(i => Math.max(i - 1, 0)), []);

  const selectSize = useCallback((sizeInch: number) => setSelections(s => ({ ...s, sizeInch })), []);
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

  return { stage, stageIndex, totalStages, selections, goNext, goPrev, selectSize, selectBatteryVoltage, selectPart };
}
