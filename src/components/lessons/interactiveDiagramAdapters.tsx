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
import { FcOrientation } from '../diagrams/FcOrientation';
import { ReceiverUart } from '../diagrams/ReceiverUart';
import { CameraVtx } from '../diagrams/CameraVtx';
import { StickControl } from '../diagrams/StickControl';
import { PartsCompatibility } from '../diagrams/PartsCompatibility';
import { TxRxCross } from '../diagrams/TxRxCross';
import { SafetyBeforeBattery } from '../diagrams/SafetyBeforeBattery';
import { MotorMount } from '../diagrams/MotorMount';

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
  'fc-orientation': ({ onVariant }) => (
    <FcOrientation onPartExplore={partId => onVariant(partId)} />
  ),
  'receiver-uart': ({ onVariant }) => (
    <ReceiverUart onPartExplore={partId => onVariant(partId)} />
  ),
  'camera-vtx': ({ onVariant }) => (
    <CameraVtx onPartExplore={partId => onVariant(partId)} />
  ),
  'stick-control': ({ onVariant }) => (
    <StickControl onAxisExplore={axis => onVariant(axis)} />
  ),
  // The four diagrams that were passive until the lessons rebuild. Each gained
  // an explore callback so its lesson could have an interactive stage like the
  // other twelve — every lesson now has one.
  'parts-compatibility': ({ onVariant }) => (
    <PartsCompatibility onStepExplore={stepId => onVariant(stepId)} />
  ),
  'tx-rx-cross': ({ onVariant }) => (
    <TxRxCross onWiringExplore={panel => onVariant(panel)} />
  ),
  'safety-before-battery': ({ onVariant }) => (
    <SafetyBeforeBattery onStepExplore={stepId => onVariant(stepId)} />
  ),
  'motor-mount': ({ onVariant }) => (
    <MotorMount onScrewExplore={which => onVariant(which)} />
  ),
};
