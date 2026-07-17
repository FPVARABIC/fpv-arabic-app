// Assembly build persistence (Phase 2) — the originally-planned but never-
// implemented `localStorage` key referenced in AssemblyView.tsx's own
// "KNOWN GAP" comment. Deliberately stores only stable IDs and primitive
// values, never full BasePart objects — every read rehydrates against the
// CURRENT part catalog (PART_CATEGORY_MAP below), so a part removed or
// renamed in a future data update can never resurrect a stale object from
// an old save. A structurally invalid snapshot (bad shape/type, unknown
// drone type, unknown/stale part id, etc.) is discarded entirely; a
// restored frame that merely no longer matches the restored Stage 2 size
// (Phase 3) is the one deliberate exception — only that single selection
// is invalidated, mirroring selectSize()'s own live-session behavior (see
// loadAndValidateAssemblyProject below for both).
import { droneTypes } from '../../../data/assembly/droneTypes';
import { buildStages } from '../../../data/assembly/buildStages';
import { frames } from '../../../data/assembly/parts/frames';
import { motors } from '../../../data/assembly/parts/motors';
import { escs } from '../../../data/assembly/parts/escs';
import { flightControllers } from '../../../data/assembly/parts/flightControllers';
import { receivers } from '../../../data/assembly/parts/receivers';
import { videoUnits } from '../../../data/assembly/parts/videoUnits';
import { gps } from '../../../data/assembly/parts/gps';
import { buzzers } from '../../../data/assembly/parts/buzzers';
import { capacitors } from '../../../data/assembly/parts/capacitors';
import { propellers } from '../../../data/assembly/parts/propellers';
import { batteries } from '../../../data/assembly/parts/batteries';
import { tools } from '../../../data/assembly/parts/tools';
import type { BasePart, Frame } from '../../../data/assembly/types';
import { frameMatchesSize, getAvailableSizeOptions } from './frameSizeMatch';

// Single source of truth for "which parts/*.ts array backs which stage
// category" — previously duplicated inline inside BuildFlow.tsx; moved here
// since persistence rehydration needs the exact same map to resolve a
// saved part id back to a real BasePart object.
export const PART_CATEGORY_MAP: Record<string, BasePart[]> = {
  frames, motors, escs, flightControllers, receivers, videoUnits,
  gps, buzzers, capacitors, propellers, batteries, tools,
};

export const ASSEMBLY_STORAGE_KEY = 'fpv-assembly-project-v1';
const SCHEMA_VERSION = 1;

interface PersistedAssemblyProject {
  version: number;
  droneTypeId: string;
  stageIndex: number;
  sizeInch?: number;
  batteryVoltage?: number;
  partIds: Record<string, string>;
}

export interface RestoredAssemblyProject {
  droneTypeId: string;
  stageIndex: number;
  sizeInch?: number;
  batteryVoltage?: number;
  parts: Record<string, BasePart>;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Saving is a best-effort convenience, never a hard requirement — a
// disabled/unavailable localStorage (private browsing, quota exceeded,
// browser settings) must never crash the build flow. Silently no-ops.
export function saveAssemblyProject(project: {
  droneTypeId: string;
  stageIndex: number;
  sizeInch?: number;
  batteryVoltage?: number;
  parts: Record<string, BasePart>;
}): void {
  const payload: PersistedAssemblyProject = {
    version: SCHEMA_VERSION,
    droneTypeId: project.droneTypeId,
    stageIndex: project.stageIndex,
    sizeInch: project.sizeInch,
    batteryVoltage: project.batteryVoltage,
    partIds: Object.fromEntries(
      Object.entries(project.parts).map(([category, part]) => [category, part.id]),
    ),
  };
  try {
    localStorage.setItem(ASSEMBLY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable — persistence is best-effort, not fatal.
  }
}

export function clearAssemblyProject(): void {
  try {
    localStorage.removeItem(ASSEMBLY_STORAGE_KEY);
  } catch {
    // Storage unavailable — nothing to clear, nothing to crash over.
  }
}

// Reads, parses, and validates the persisted project against the CURRENT
// catalog. Returns null on absolutely any doubt — missing key, disabled
// storage, invalid JSON, wrong/future schema version, an unknown
// droneTypeId, an out-of-range stageIndex, a malformed field, an unknown
// category, or a part id that no longer exists in that category's real
// data file. Deliberately all-or-nothing: a single bad field discards the
// whole snapshot rather than partially trusting the rest of it, matching
// "fail safely by resetting to a clean build" — never a partially-hydrated,
// logically-inconsistent build.
export function loadAndValidateAssemblyProject(): RestoredAssemblyProject | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(ASSEMBLY_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;

  if (parsed.version !== SCHEMA_VERSION) return null;

  const { droneTypeId, stageIndex, sizeInch, batteryVoltage, partIds } = parsed;

  if (typeof droneTypeId !== 'string' || !droneTypes.some(t => t.id === droneTypeId)) return null;
  if (typeof stageIndex !== 'number' || !Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= buildStages.length) return null;
  if (sizeInch !== undefined && typeof sizeInch !== 'number') return null;
  if (batteryVoltage !== undefined && typeof batteryVoltage !== 'number') return null;
  if (!isPlainObject(partIds)) return null;

  const parts: Record<string, BasePart> = {};
  for (const [category, id] of Object.entries(partIds)) {
    if (typeof id !== 'string') return null;
    const list = PART_CATEGORY_MAP[category];
    if (!list) return null; // unknown category — the catalog changed shape since this was saved
    const part = list.find(p => p.id === id);
    if (!part) return null; // stale/unknown part id — the catalog no longer contains it
    parts[category] = part;
  }

  // Stage 2 size <-> frame validation (Phase 3): a restored frame that no
  // longer matches the restored sizeInch (e.g. the size options or a
  // frame's own sizeInch changed since this was saved) must not be
  // trusted. Unlike the structural checks above, this ISN'T rejected as a
  // whole-snapshot failure — it mirrors the exact same live-session
  // behavior as selectSize() in useAssemblyBuild.ts (invalidate only the
  // frame, keep everything else), so a restore behaves identically to a
  // user changing size mid-session.
  if (typeof sizeInch === 'number' && parts.frames && !frameMatchesSize(parts.frames as Frame, sizeInch)) {
    delete parts.frames;
  }

  // A previously-saved size that is no longer valid for THIS restored
  // droneTypeId — either a globally-removed option (e.g. an old 3.5" save)
  // or one that's simply unreachable for this specific drone type (e.g. a
  // long-range save recording "5 إنش", when long-range only ever reaches
  // 7") — is dropped the same single-field way. getAvailableSizeOptions is
  // the same live, catalog-derived helper the Stage 2 UI itself uses, so
  // restore validation can never be more permissive than what a real user
  // could actually select. The frame check above already ran against the
  // real recorded value, so any frame that depended on it is already
  // handled; the stale size itself just isn't restored, matching a fresh,
  // not-yet-reached Stage 2.
  const validSizeInch = typeof sizeInch === 'number' && getAvailableSizeOptions(droneTypeId).some(o => o.sizeInch === sizeInch)
    ? sizeInch
    : undefined;

  return { droneTypeId, stageIndex, sizeInch: validSizeInch, batteryVoltage, parts };
}
