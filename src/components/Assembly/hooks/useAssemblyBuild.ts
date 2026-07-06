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
  const selectBatteryVoltage = useCallback((batteryVoltage: number) => setSelections(s => ({ ...s, batteryVoltage })), []);
  const selectPart = useCallback(
    (category: string, part: BasePart) => setSelections(s => ({ ...s, parts: { ...s.parts, [category]: part } })),
    [],
  );

  return { stage, stageIndex, totalStages, selections, goNext, goPrev, selectSize, selectBatteryVoltage, selectPart };
}
