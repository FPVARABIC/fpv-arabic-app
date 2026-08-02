/**
 * Reads the user's project into a platform-level snapshot.
 *
 * Deliberately a READER, not a second store. `loadAndValidateAssemblyProject`
 * already rehydrates saved ids against the live catalogue and discards
 * structurally invalid snapshots, so all of that hard-won correctness is
 * reused rather than reimplemented. The Assembly section stays the single
 * writer; every other surface in the app consumes this.
 */

import { loadAndValidateAssemblyProject } from './store';
import { droneTypes } from '../assembly/droneTypes';
import { buildStages } from '../assembly/buildStages';
import type {
  BasePart, Frame, Motor, Esc, Battery, Propeller,
  FlightController, Receiver, VideoUnit, Gps,
} from '../assembly/types';
import type { ProjectSnapshot } from './types';

const EMPTY: ProjectSnapshot = {
  exists: false,
  stageIndex: 0,
  totalStages: buildStages.length,
  parts: {},
};

/** Narrowing helper — the catalogue guarantees the shape, the map does not. */
function pick<T extends BasePart>(parts: Record<string, BasePart>, key: string): T | undefined {
  return parts[key] as T | undefined;
}

export function readProjectSnapshot(): ProjectSnapshot {
  const restored = loadAndValidateAssemblyProject();
  if (!restored) return EMPTY;

  const parts = restored.parts;
  const droneType = droneTypes.find(d => d.id === restored.droneTypeId);

  return {
    exists: true,
    droneTypeId: restored.droneTypeId,
    droneTypeName: droneType?.primaryName,
    sizeInch: restored.sizeInch,
    cellCount: restored.batteryVoltage,
    stageIndex: restored.stageIndex,
    totalStages: buildStages.length,

    frame: pick<Frame>(parts, 'frames'),
    motor: pick<Motor>(parts, 'motors'),
    esc: pick<Esc>(parts, 'escs'),
    flightController: pick<FlightController>(parts, 'flightControllers'),
    battery: pick<Battery>(parts, 'batteries'),
    propeller: pick<Propeller>(parts, 'propellers'),
    receiver: pick<Receiver>(parts, 'receivers'),
    videoUnit: pick<VideoUnit>(parts, 'videoUnits'),
    gps: pick<Gps>(parts, 'gps'),
    rcSetup: restored.rcSetup,
    parts,
  };
}

/** How many part categories the user has actually chosen. */
export function selectedPartCount(p: ProjectSnapshot): number {
  return Object.keys(p.parts).length;
}
