/**
 * The user's project — the one store, and the only writer.
 *
 * MOVED HERE FROM `components/Assembly/utils/assemblyPersistence.ts`, unchanged
 * in behaviour. It was the single place in the codebase where `src/data/**`
 * reached into `src/components/**`, and it was the worst possible place for
 * that to happen: the project is the platform's spine, so every system that
 * later reads it — the verdict engine, the article context panel, the bot, a
 * future web client — would have inherited a dependency on a phone-UI folder.
 * The Assembly section is still the only writer; it now imports downward like
 * everything else instead of owning the store.
 *
 * Storage access goes through `platform/storage.ts`, which is what gives this
 * store the five properties a syncable store needs: a written model, a schema
 * version in the payload, whole-value validation, migration from older
 * versions, and export/import as plain data. Values written before that
 * contract existed are un-enveloped; they migrate from version 0 on first read,
 * so nobody's saved project is lost to the refactor.
 */
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
import { droneTypes } from '../assembly/droneTypes';
import { buildStages } from '../assembly/buildStages';
import { frames } from '../assembly/parts/frames';
import { motors } from '../assembly/parts/motors';
import { escs } from '../assembly/parts/escs';
import { flightControllers } from '../assembly/parts/flightControllers';
import { receivers } from '../assembly/parts/receivers';
import { videoUnits } from '../assembly/parts/videoUnits';
import { gps } from '../assembly/parts/gps';
import { buzzers } from '../assembly/parts/buzzers';
import { capacitors } from '../assembly/parts/capacitors';
import { propellers } from '../assembly/parts/propellers';
import { batteries } from '../assembly/parts/batteries';
import { tools } from '../assembly/parts/tools';
import type { BasePart, Frame } from '../assembly/types';
import { frameMatchesSize, getAvailableSizeOptions } from '../assembly/frameSizeMatch';
import { validateRcSetup, type RcSetup } from './rcSetup';
import { validateVideoSetup, type VideoSetup } from './videoSetup';
import {
  load as loadStore, save as saveStore, clear as clearStore,
  exportStore, importStore,
  type StoreDefinition, type ExportedStore,
} from '../../platform/storage';

// Single source of truth for "which parts/*.ts array backs which stage
// category" — previously duplicated inline inside BuildFlow.tsx; moved here
// since persistence rehydration needs the exact same map to resolve a
// saved part id back to a real BasePart object.
export const PART_CATEGORY_MAP: Record<string, BasePart[]> = {
  frames, motors, escs, flightControllers, receivers, videoUnits,
  gps, buzzers, capacitors, propellers, batteries, tools,
};

/**
 * What each part category is CALLED, in Arabic.
 *
 * Lifted out of `FinalReportScreen.tsx`, where it lived as a private constant.
 * A category's name is platform data — the build flow, the report, the web
 * workspace and any future surface all need it, and a second copy on the web
 * would be a second vocabulary for the same twelve things. The keys are exactly
 * `PART_CATEGORY_MAP`'s, and `scripts/testProject.ts` asserts they stay in step.
 */
export const PART_CATEGORY_LABEL_AR: Record<string, string> = {
  videoUnits: 'نظام الفيديو (VTX)',
  frames: 'الإطار (Frame)',
  motors: 'المحركات (Motors)',
  escs: 'الـESC',
  flightControllers: 'الـFlight Controller',
  receivers: 'الـReceiver',
  gps: 'GPS',
  buzzers: 'الـBuzzer',
  capacitors: 'الـCapacitor',
  propellers: 'المراوح (Props)',
  batteries: 'البطارية (LiPo)',
  tools: 'الأدوات',
};

export const ASSEMBLY_STORAGE_KEY = 'fpv-assembly-project-v1';
export const SCHEMA_VERSION = 3;

interface PersistedAssemblyProject {
  version: number;
  droneTypeId: string;
  stageIndex: number;
  sizeInch?: number;
  batteryVoltage?: number;
  partIds: Record<string, string>;
  /**
   * Per-build radio configuration (schema 2). Optional because a project
   * created before the control-link system existed simply has none, and
   * because a half-filled setup is more useful than a forced one.
   */
  rcSetup?: RcSetup;
  /**
   * Per-build video configuration (schema 3). Optional for exactly the same
   * reason `rcSetup` is: a project created before the video system existed
   * simply has none, and a half-filled record is more useful than a forced one.
   */
  videoSetup?: VideoSetup;
}

export interface RestoredAssemblyProject {
  droneTypeId: string;
  stageIndex: number;
  sizeInch?: number;
  batteryVoltage?: number;
  parts: Record<string, BasePart>;
  rcSetup?: RcSetup;
  videoSetup?: VideoSetup;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The store definition — the model, the version, and how an older payload is
 * brought forward. Every read and write below goes through it, so validation
 * can never be skipped by a caller in a hurry.
 */
const PROJECT_STORE: StoreDefinition<PersistedAssemblyProject> = {
  key: ASSEMBLY_STORAGE_KEY,
  version: SCHEMA_VERSION,
  validate: validatePersistedProject,
  migrate: (data, fromVersion) => {
    // Version 0 means "written before the storage contract existed": the payload
    // was saved bare, with its version field inside it rather than in an
    // envelope. The shape is otherwise identical, so it carries forward as-is
    // and the validator below is what decides whether it is actually usable.
    if (typeof data !== 'object' || data === null) return null;

    // Version 0 means the value predates the storage envelope, so its real
    // schema number is the `version` field INSIDE the payload. Reading it
    // rather than overwriting it matters: a payload claiming an unknown future
    // version must still be refused, not silently relabelled as current.
    const declared = fromVersion === 0
      ? (data as Record<string, unknown>).version
      : fromVersion;
    if (declared !== 1 && declared !== 2 && declared !== SCHEMA_VERSION) return null;

    // Every version bump so far has been PURELY ADDITIVE — schema 2 added an
    // optional `rcSetup`, schema 3 added an optional `videoSetup` — so an older
    // payload is already structurally valid and simply carries no configuration
    // for the systems that did not exist when it was written. The moment a bump
    // is NOT additive, this branch has to grow a real transform rather than a
    // relabel, and `scripts/testAssemblyPersistence.ts` is what will catch it.
    return { ...(data as Record<string, unknown>), version: SCHEMA_VERSION };
  },
};

// Saving is a best-effort convenience, never a hard requirement — a
// disabled/unavailable localStorage (private browsing, quota exceeded,
// browser settings) must never crash the build flow. Silently no-ops.
//
// THIS WRITER MERGES; IT DOES NOT REPLACE.
// ----------------------------------------
// It used to build a fresh payload from its arguments alone, which meant the
// sections it does not own — `rcSetup` and `videoSetup` — were dropped on every
// call. And it IS called on every part change (see useAssemblyBuild.ts). So the
// sequence "record your control link, then swap a motor" silently destroyed the
// entire control-link record, and the same for the video record. Nothing
// surfaced it: the write succeeded, the project still loaded, and the
// configuration was simply gone.
//
// The build flow owns drone type, stage, size, voltage and parts. The workspace
// owns rcSetup and videoSetup (see saveRcSetup/saveVideoSetup below). A writer
// that owns half a document must carry the other half forward rather than
// overwrite it with nothing — so the current payload is read first, and only
// this writer's own fields are replaced.
//
// An explicitly-passed `rcSetup`/`videoSetup` still wins, so a caller that
// genuinely wants to set them can; omitting them now means "leave them alone"
// rather than "delete them".
export function saveAssemblyProject(project: {
  droneTypeId: string;
  stageIndex: number;
  sizeInch?: number;
  batteryVoltage?: number;
  parts: Record<string, BasePart>;
  rcSetup?: RcSetup;
  videoSetup?: VideoSetup;
}): void {
  const current = loadStore(PROJECT_STORE);

  const payload: PersistedAssemblyProject = {
    version: SCHEMA_VERSION,
    droneTypeId: project.droneTypeId,
    stageIndex: project.stageIndex,
    sizeInch: project.sizeInch,
    batteryVoltage: project.batteryVoltage,
    // Ids, never objects: a saved project is a small identity payload that any
    // device can rehydrate from its own live catalogue. This is the decision
    // that makes future sync a transport problem rather than a data-conflict one.
    partIds: Object.fromEntries(
      Object.entries(project.parts).map(([category, part]) => [category, part.id]),
    ),
    ...(project.rcSetup ?? current?.rcSetup
      ? { rcSetup: project.rcSetup ?? current?.rcSetup }
      : {}),
    ...(project.videoSetup ?? current?.videoSetup
      ? { videoSetup: project.videoSetup ?? current?.videoSetup }
      : {}),
  };
  saveStore(PROJECT_STORE, payload);
}

export function clearAssemblyProject(): void {
  clearStore(PROJECT_STORE);
}

/**
 * The saved project as plain data — for a file, a share, or a sync payload.
 * Returns null when there is nothing valid to export rather than an empty shell.
 */
export function exportAssemblyProject(at?: number): ExportedStore | null {
  return exportStore(PROJECT_STORE, at);
}

/**
 * Restores an exported project. Goes through the same validation as any read,
 * so an edited or foreign file cannot write a shape the app would refuse.
 * Returns the rehydrated project, or null if the import was rejected.
 */
export function importAssemblyProject(exported: unknown): RestoredAssemblyProject | null {
  const payload = importStore(PROJECT_STORE, exported);
  return payload ? rehydrateProject(payload) : null;
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
  const payload = loadStore(PROJECT_STORE);
  return payload ? rehydrateProject(payload) : null;
}

/**
 * Structural validation only — is this a well-formed payload whose every id
 * still exists in the CURRENT catalogue? Rehydration into real part objects is
 * a separate step, so the stored shape and the in-memory shape never blur.
 */
function validatePersistedProject(raw: unknown): PersistedAssemblyProject | null {
  if (!isPlainObject(raw)) return null;
  if (raw.version !== SCHEMA_VERSION) return null;

  const { droneTypeId, stageIndex, sizeInch, batteryVoltage, partIds } = raw;

  if (typeof droneTypeId !== 'string' || !droneTypes.some(t => t.id === droneTypeId)) return null;
  if (typeof stageIndex !== 'number' || !Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= buildStages.length) return null;
  if (sizeInch !== undefined && typeof sizeInch !== 'number') return null;
  if (batteryVoltage !== undefined && typeof batteryVoltage !== 'number') return null;
  if (!isPlainObject(partIds)) return null;

  for (const [category, id] of Object.entries(partIds)) {
    if (typeof id !== 'string') return null;
    const list = PART_CATEGORY_MAP[category];
    if (!list) return null; // unknown category — the catalog changed shape since this was saved
    const part = list.find(p => p.id === id);
    if (!part) return null; // stale/unknown part id — the catalog no longer contains it
  }

  const rcSetup = validateRcSetup(raw.rcSetup);
  const videoSetup = validateVideoSetup(raw.videoSetup);

  return {
    version: SCHEMA_VERSION,
    droneTypeId,
    stageIndex,
    sizeInch,
    batteryVoltage,
    partIds: partIds as Record<string, string>,
    ...(rcSetup ? { rcSetup } : {}),
    ...(videoSetup ? { videoSetup } : {}),
  };
}

/**
 * Turns a validated payload into live part objects, applying the two
 * single-field invalidations that mirror the build flow's own live behaviour.
 */
function rehydrateProject(p: PersistedAssemblyProject): RestoredAssemblyProject {
  const { droneTypeId, stageIndex, sizeInch, batteryVoltage, partIds, rcSetup, videoSetup } = p;

  const parts: Record<string, BasePart> = {};
  for (const [category, id] of Object.entries(partIds)) {
    // Both lookups are guaranteed by validatePersistedProject; the guards stay
    // so that a future caller cannot rehydrate an unvalidated payload silently.
    const part = PART_CATEGORY_MAP[category]?.find(x => x.id === id);
    if (part) parts[category] = part;
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

  return { droneTypeId, stageIndex, sizeInch: validSizeInch, batteryVoltage, parts, rcSetup, videoSetup };
}

/**
 * Records the control-link configuration without touching the rest of the
 * project.
 *
 * A separate entry point rather than a field on `saveAssemblyProject`, because
 * the two are edited from different places at different times: the build flow
 * owns part selection, and the workspace owns the setup the user discovers
 * while wiring and flashing. Merging them into one writer would mean the
 * workspace had to know the whole build to save one field.
 */
export function saveRcSetup(rcSetup: RcSetup): RestoredAssemblyProject | null {
  const current = loadStore(PROJECT_STORE);
  if (!current) return null;
  saveStore(PROJECT_STORE, { ...current, rcSetup });
  const reloaded = loadStore(PROJECT_STORE);
  return reloaded ? rehydrateProject(reloaded) : null;
}

/**
 * Writes the video configuration into the ONE project store.
 *
 * Deliberately identical in shape to `saveRcSetup`: there is one project
 * object, and every system that configures itself writes a section of it. A
 * second key would mean a second export, a second migration and a second thing
 * to keep in sync with the verdict engine.
 */
export function saveVideoSetup(videoSetup: VideoSetup): RestoredAssemblyProject | null {
  const current = loadStore(PROJECT_STORE);
  if (!current) return null;
  saveStore(PROJECT_STORE, { ...current, videoSetup });
  const reloaded = loadStore(PROJECT_STORE);
  return reloaded ? rehydrateProject(reloaded) : null;
}
