'use client';

/**
 * The web's binding of the shared project core.
 *
 * WHY THIS IS A CLIENT MODULE AND WHY THAT IS NOT A COMPROMISE
 * ------------------------------------------------------------
 * The project lives in `localStorage`. That is the existing storage contract —
 * `src/platform/storage.ts` — and this batch deliberately does not replace it
 * with a server store, because doing so would mean a second home for the same
 * document and a sync problem nobody has audited. So the project can only be
 * read where localStorage exists: in the browser.
 *
 * The consequence is that `/project` is a client island rather than a
 * server-rendered page. That is the right trade here: a project is private, so
 * it must never be indexed and gains nothing from SSR; and rendering it on the
 * server would require sending it to the server, which is exactly what this
 * batch is not doing.
 *
 * WHAT THIS FILE IS NOT
 * ---------------------
 * It is not a store, a model, or a verdict engine. Every function below is a
 * re-export of the shared core. `scripts/testWebProject.ts` asserts that this
 * file declares no schema, no severity ordering and no compatibility rule of
 * its own — the moment it does, the web has forked the engine.
 */

export {
  readProjectSnapshot,
  selectedPartCount,
} from '@core/data/project/snapshot';

export {
  computeFindings,
  sortFindings,
  countFindings,
  type FindingCounts,
} from '@core/data/project/verdicts';

export { computeNextStep } from '@core/data/project/nextStep';

export {
  saveAssemblyProject,
  clearAssemblyProject,
  saveRcSetup,
  saveVideoSetup,
  exportAssemblyProject,
  importAssemblyProject,
  loadAndValidateAssemblyProject,
  PART_CATEGORY_MAP,
  SCHEMA_VERSION,
  ASSEMBLY_STORAGE_KEY,
  type RestoredAssemblyProject,
} from '@core/data/project/store';

export {
  SEVERITY_ORDER,
  SEVERITY_LABEL_AR,
  CONFIDENCE_LABEL_AR,
  type Finding,
  type FindingSeverity,
  type FindingConfidence,
  type ProjectSnapshot,
  type NextStep,
} from '@core/data/project/types';

export { droneTypes } from '@core/data/assembly/droneTypes';
export { buildStages } from '@core/data/assembly/buildStages';
export type { BasePart } from '@core/data/assembly/types';
