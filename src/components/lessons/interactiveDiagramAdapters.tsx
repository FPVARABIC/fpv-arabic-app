import React from 'react';
import type { DiagramType } from '../../types';
import { QuadXLayout } from '../diagrams/QuadXLayout';
import { SignalFlow } from '../diagrams/SignalFlow';
import { PartsMap } from '../diagrams/PartsMap';
import { SizeComparison } from '../diagrams/SizeComparison';
import { ElectricityBasics } from '../diagrams/ElectricityBasics';
import { LipoCells } from '../diagrams/LipoCells';
import { GndFiveVbat } from '../diagrams/GndFiveVbat';
import { FrameAssembly } from '../diagrams/FrameAssembly';
import { EscPlacement } from '../diagrams/EscPlacement';

/**
 * Narrow component slot: which diagram component handles which diagramType
 * for an 'interactive_diagram' stage, and how its own click callback maps
 * onto the stage's generic requiredVariants.
 */
export const interactiveDiagramAdapters: Partial<Record<DiagramType, React.FC<{ onVariant: (variant: string) => void }>>> = {
  'quad-x-layout': ({ onVariant }) => (
    <QuadXLayout onMotorExplore={(_motorId, cw) => onVariant(cw ? 'cw' : 'ccw')} />
  ),
  'signal-flow': ({ onVariant }) => (
    <SignalFlow onNodeExplore={nodeId => onVariant(nodeId)} />
  ),
  'parts-map': ({ onVariant }) => (
    <PartsMap onPartExplore={partId => onVariant(partId)} />
  ),
  'size-comparison': ({ onVariant }) => (
    <SizeComparison onSizeExplore={sizeId => onVariant(sizeId)} />
  ),
  'electricity-basics': ({ onVariant }) => (
    <ElectricityBasics onConceptExplore={conceptId => onVariant(conceptId)} />
  ),
  'lipo-cells': ({ onVariant }) => (
    <LipoCells onPackExplore={packId => onVariant(packId)} />
  ),
  'gnd-5v-vbat': ({ onVariant }) => (
    <GndFiveVbat onRailExplore={railId => onVariant(railId)} />
  ),
  'frame-assembly': ({ onVariant }) => (
    <FrameAssembly onPartExplore={partId => onVariant(partId)} />
  ),
  'esc-placement': ({ onVariant }) => (
    <EscPlacement onPartExplore={partId => onVariant(partId)} />
  ),
};
