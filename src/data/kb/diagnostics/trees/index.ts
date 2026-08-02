import type { DxTree } from '../types';
import {
  dxFcNoUsb,
  dxFcNoPower,
  dxFcReceiverNotDetected,
  dxFcMotorNotSpinning,
  dxFcGyroNoise,
} from './flightController';
import { dxMotorHot, dxMotorWrongDirection } from './motors';
import { dxPropVibration, dxPropThrown } from './propellers';

export const allDxTrees: DxTree[] = [
  dxFcNoUsb,
  dxFcNoPower,
  dxFcReceiverNotDetected,
  dxFcMotorNotSpinning,
  dxFcGyroNoise,
  dxMotorHot,
  dxMotorWrongDirection,
  dxPropVibration,
  dxPropThrown,
];

const byId = new Map(allDxTrees.map(t => [t.id, t]));

export function getDxTree(id: string): DxTree | undefined {
  return byId.get(id);
}

export function dxTreesForModule(moduleId: string): DxTree[] {
  return allDxTrees.filter(t => t.moduleId === moduleId);
}
