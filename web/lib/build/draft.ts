/**
 * The wizard's draft — where «الرجوع دون فقد الاختيارات» actually lives.
 *
 * TWO STORES, ONE OWNER EACH, ONE DIRECTION
 * -----------------------------------------
 * The platform already has ONE project store (`fpv-assembly-project-v1`) and
 * a rule this repository defends hard: the build flow is its only writer,
 * everything else reads. The web wizard IS a build flow, so it writes that
 * store — that is what makes a build started here appear in «مشروعي» and in
 * the phone app with no sync code at all.
 *
 * But the wizard also carries state the shared schema deliberately does not
 * model: which of the twenty web steps the reader is on, the questionnaire
 * answers (experience, budget tier, ecosystem preferences), parts owned from
 * outside the catalogue, and the safety-gate confirmations. Widening the
 * shared schema for surface-specific state would force a migration on every
 * phone user for fields the phone never reads. So the web keeps its own DRAFT
 * beside the shared store:
 *
 *   fpv-web-build-draft-v1   (this file)  → the wizard's own memory
 *   fpv-assembly-project-v1  (shared)     → the platform's one project
 *
 * `mirrorToProject` copies the shared subset (type, size, voltage, parts,
 * mapped progress) into the shared store on every selection — through
 * `saveAssemblyProject`, which merges rather than replaces, so the rcSetup
 * and videoSetup the workspace owns are never clobbered.
 *
 * Both go through `platform/storage.ts`, so the draft gets the same envelope,
 * versioning, validation and no-throw guarantees the shared store has.
 */

import {
  load as loadStore, save as saveStore, clear as clearStore,
  type StoreDefinition,
} from '@core/platform/storage';
import { PART_CATEGORY_MAP, saveAssemblyProject, loadAndValidateAssemblyProject } from '@core/data/project/store';
import { droneTypes } from '@core/data/assembly/droneTypes';
import type { BasePart } from '@core/data/assembly/types';
import { BUILD_PATH, GATE_STEP_IDS, phoneStageIndexFor } from './path';

export type BuildMode = 'guided' | 'parts' | 'advanced';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TierPreference = 'budget' | 'mid' | 'premium';

export const BUILD_DRAFT_KEY = 'fpv-web-build-draft-v1';
const DRAFT_VERSION = 1;

export interface BuildDraft {
  version: number;
  mode?: BuildMode;
  experience?: ExperienceLevel;
  tierPref?: TierPreference;
  videoSystemPref?: string;
  rcProtocolPref?: string;
  /** 0-based index into BUILD_PATH. */
  stepIndex: number;
  droneTypeId?: string;
  sizeInch?: number;
  batteryVoltage?: number;
  /** category -> part id, ids only — rehydrated against the live catalogue. */
  partIds: Record<string, string>;
  /**
   * Parts the reader already owns but that are not in the catalogue:
   * category -> the name they typed. The engine cannot check these, and the
   * UI says so with the manufacturer sentence instead of pretending.
   */
  externalParts: Record<string, string>;
  /** gate step id -> the indexes of confirmed items. */
  gateChecks: Record<string, number[]>;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function validateDraft(raw: unknown): BuildDraft | null {
  if (!isPlainObject(raw)) return null;
  if (raw.version !== DRAFT_VERSION) return null;
  const {
    mode, experience, tierPref, videoSystemPref, rcProtocolPref,
    stepIndex, droneTypeId, sizeInch, batteryVoltage,
    partIds, externalParts, gateChecks,
  } = raw;

  if (typeof stepIndex !== 'number' || !Number.isInteger(stepIndex)
    || stepIndex < 0 || stepIndex >= BUILD_PATH.length) return null;
  if (mode !== undefined && mode !== 'guided' && mode !== 'parts' && mode !== 'advanced') return null;
  if (experience !== undefined && experience !== 'beginner' && experience !== 'intermediate' && experience !== 'advanced') return null;
  if (tierPref !== undefined && tierPref !== 'budget' && tierPref !== 'mid' && tierPref !== 'premium') return null;
  if (videoSystemPref !== undefined && typeof videoSystemPref !== 'string') return null;
  if (rcProtocolPref !== undefined && typeof rcProtocolPref !== 'string') return null;
  if (droneTypeId !== undefined
    && (typeof droneTypeId !== 'string' || !droneTypes.some(t => t.id === droneTypeId))) return null;
  if (sizeInch !== undefined && typeof sizeInch !== 'number') return null;
  if (batteryVoltage !== undefined && typeof batteryVoltage !== 'number') return null;
  if (!isPlainObject(partIds) || !isPlainObject(externalParts) || !isPlainObject(gateChecks)) return null;

  // A stale part id invalidates only ITS entry — mirroring the shared
  // store's single-field philosophy for catalogue drift, not all-or-nothing.
  const cleanPartIds: Record<string, string> = {};
  for (const [category, id] of Object.entries(partIds)) {
    if (typeof id !== 'string') continue;
    if (PART_CATEGORY_MAP[category]?.some(p => p.id === id)) cleanPartIds[category] = id;
  }
  const cleanExternal: Record<string, string> = {};
  for (const [category, name] of Object.entries(externalParts)) {
    if (typeof name === 'string' && name.trim() && PART_CATEGORY_MAP[category]) {
      cleanExternal[category] = name.trim();
    }
  }
  const cleanGates: Record<string, number[]> = {};
  for (const [gateId, items] of Object.entries(gateChecks)) {
    if (!GATE_STEP_IDS.includes(gateId) || !Array.isArray(items)) continue;
    cleanGates[gateId] = items.filter((n): n is number => typeof n === 'number');
  }

  return {
    version: DRAFT_VERSION,
    mode, experience, tierPref, videoSystemPref, rcProtocolPref,
    stepIndex, droneTypeId, sizeInch, batteryVoltage,
    partIds: cleanPartIds,
    externalParts: cleanExternal,
    gateChecks: cleanGates,
  };
}

const DRAFT_STORE: StoreDefinition<BuildDraft> = {
  key: BUILD_DRAFT_KEY,
  version: DRAFT_VERSION,
  validate: validateDraft,
  // First schema: nothing older exists to migrate. An unknown version is
  // refused by the validator rather than relabelled.
  migrate: data => (isPlainObject(data) ? { ...data, version: DRAFT_VERSION } : null),
};

export function emptyDraft(): BuildDraft {
  return {
    version: DRAFT_VERSION,
    stepIndex: 0,
    partIds: {},
    externalParts: {},
    gateChecks: {},
  };
}

export function loadDraft(): BuildDraft | null {
  return loadStore(DRAFT_STORE);
}

export function saveDraft(draft: BuildDraft): void {
  saveStore(DRAFT_STORE, draft);
}

export function clearDraft(): void {
  clearStore(DRAFT_STORE);
}

/** The draft's parts, rehydrated to live objects. */
export function draftParts(draft: BuildDraft): Record<string, BasePart> {
  const parts: Record<string, BasePart> = {};
  for (const [category, id] of Object.entries(draft.partIds)) {
    const part = PART_CATEGORY_MAP[category]?.find(p => p.id === id);
    if (part) parts[category] = part;
  }
  return parts;
}

/**
 * Mirror the shared subset into the platform's one project store.
 *
 * Only once a drone type exists — the shared schema requires one, and a
 * questionnaire abandoned on screen one should not manufacture a project.
 */
export function mirrorToProject(draft: BuildDraft): void {
  if (!draft.droneTypeId) return;
  const parts = draftParts(draft);
  saveAssemblyProject({
    droneTypeId: draft.droneTypeId,
    // The mirrored stage is a claim about somebody's real build, so it is
    // computed from the parts actually chosen and not from the step number
    // alone — see the note on `phoneStageIndexFor`. A category the reader
    // supplied from outside the catalogue counts as done: the wizard accepts
    // it as satisfying the step, so the mirror must agree.
    stageIndex: phoneStageIndexFor(
      draft.stepIndex,
      [...Object.keys(parts), ...Object.keys(draft.externalParts)],
    ),
    sizeInch: draft.sizeInch,
    batteryVoltage: draft.batteryVoltage,
    parts,
  });
}

/**
 * Seed a draft from an existing shared project — a build started on the
 * phone, or a previous web session whose draft was cleared. The reader
 * continues instead of starting over; the wizard-only fields simply begin
 * unanswered.
 */
export function seedFromProject(): BuildDraft | null {
  const restored = loadAndValidateAssemblyProject();
  if (!restored) return null;
  const draft = emptyDraft();
  draft.droneTypeId = restored.droneTypeId;
  draft.sizeInch = restored.sizeInch;
  draft.batteryVoltage = restored.batteryVoltage;
  for (const [category, part] of Object.entries(restored.parts)) {
    draft.partIds[category] = part.id;
  }
  // Land on the first step with nothing chosen yet, rather than step one.
  draft.stepIndex = firstUnresolvedStep(draft);
  return draft;
}

/** The first step whose selection is still missing — where «متابعة» lands. */
export function firstUnresolvedStep(draft: BuildDraft): number {
  for (let i = 0; i < BUILD_PATH.length; i++) {
    const step = BUILD_PATH[i];
    if (step.kind === 'choice') {
      if (step.id === 'goal' && !draft.droneTypeId) return i;
      if (step.id === 'size' && draft.sizeInch === undefined) return i;
      if (step.id === 'power' && draft.batteryVoltage === undefined) return i;
    }
    if (step.kind === 'parts') {
      const required = (step.categories ?? [])
        .filter(c => !(step.optionalCategories ?? []).includes(c));
      if (required.some(c => !draft.partIds[c] && !draft.externalParts[c])) return i;
    }
  }
  // Everything selectable is selected: resume at the compatibility report.
  return BUILD_PATH.findIndex(s => s.kind === 'report');
}
