import React from 'react';
import type { DiagramType } from '../../types';
import { QuadXLayout } from '../diagrams/QuadXLayout';
import { SignalFlow } from '../diagrams/SignalFlow';
import { PartsMap } from '../diagrams/PartsMap';

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
};
