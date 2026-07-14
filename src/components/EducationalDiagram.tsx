import React from 'react';
import type { DiagramType } from '../types';
import { QuadXLayout } from './diagrams/QuadXLayout';
import { SignalFlow } from './diagrams/SignalFlow';
import { PartsMap } from './diagrams/PartsMap';
import { PartsCompatibility } from './diagrams/PartsCompatibility';
import { SizeComparison } from './diagrams/SizeComparison';
import { ElectricityBasics } from './diagrams/ElectricityBasics';
import { LipoCells } from './diagrams/LipoCells';
import { GndFiveVbat } from './diagrams/GndFiveVbat';
import { TxRxCross } from './diagrams/TxRxCross';
import { SafetyBeforeBattery } from './diagrams/SafetyBeforeBattery';
import { FrameAssembly } from './diagrams/FrameAssembly';
import { MotorMount } from './diagrams/MotorMount';
import { EscPlacement } from './diagrams/EscPlacement';
import { FcOrientation } from './diagrams/FcOrientation';
import { ReceiverUart } from './diagrams/ReceiverUart';
import { CameraVtx } from './diagrams/CameraVtx';

const registry: Record<DiagramType, React.FC> = {
  'quad-x-layout': QuadXLayout,
  'signal-flow': SignalFlow,
  'parts-map': PartsMap,
  'parts-compatibility': PartsCompatibility,
  'size-comparison': SizeComparison,
  'electricity-basics': ElectricityBasics,
  'lipo-cells': LipoCells,
  'gnd-5v-vbat': GndFiveVbat,
  'tx-rx-cross': TxRxCross,
  'safety-before-battery': SafetyBeforeBattery,
  'frame-assembly': FrameAssembly,
  'motor-mount': MotorMount,
  'esc-placement': EscPlacement,
  'fc-orientation': FcOrientation,
  'receiver-uart': ReceiverUart,
  'camera-vtx': CameraVtx,
};

interface Props { type: DiagramType; }

/** Selects and renders the right interactive educational diagram for a lesson. */
export const EducationalDiagram: React.FC<Props> = ({ type }) => {
  const Diagram = registry[type];
  if (!Diagram) return null;
  return <Diagram />;
};
