import 'server-only';
import { cache } from 'react';
import { adminDb, isAdminConfigured } from './firebaseAdmin';
import { uploadedProjectCover } from './projectImages';
import { ALL_PROJECTS } from '@core/data/projects/registry';
import type { Project } from '@core/data/projects/types';

/**
 * Projects, merged: seeds in code, edits in the database.
 *
 * WHY A MERGE RATHER THAN «READ FROM THE DATABASE»
 * ------------------------------------------------
 * The brief asked that nothing be frozen in code — the admin panel must be able
 * to edit, unpublish, re-categorise and add. That is exactly what this gives.
 * But reading ONLY from the database means a fresh deployment shows an empty
 * section until somebody imports ten long documents by hand, and an empty
 * section is indistinguishable from a broken one.
 *
 * So the seeds are the floor and the database is the authority. A field present
 * in the override wins; a field absent falls back to the seed. Deleting an
 * override restores the reviewed original rather than deleting the project,
 * which is the behaviour somebody actually wants after a bad edit.
 *
 * A document with an id no seed has is a NEW project, and it appears. That is
 * how «أضف مشروعاً» works without a deployment.
 *
 * WHY A FAILED READ FALLS BACK TO THE SEEDS
 * -----------------------------------------
 * Same posture as the store catalogue: a section that 500s because Firestore is
 * unreachable is a section that is down. One that shows its reviewed seeds is
 * degraded and still useful. The one thing it must never do is invent.
 *
 * WHERE THE COVER PHOTOGRAPH COMES FROM
 * -------------------------------------
 * Two places, and the precedence between them is the point. The admin panel
 * uploads to Storage and writes `imageUrl`; the owner also drops files straight
 * into `web/public/assets/projects/<id>/` under the naming convention
 * `imageSlots.ts` publishes. The database wins when it has an answer —
 * INCLUDING the answer «cleared», which is why the test below is `undefined`
 * and not falsy: clearing an image writes an explicit null, and reviving a
 * repository file over somebody's deliberate removal would make the panel's
 * delete button look broken.
 *
 * Absent an override, the uploaded file IS the image, with no data edit — which
 * is what the project image manifest has been promising all along. A project
 * with neither keeps the typed placeholder that says so: «لا تستخدم صوراً
 * مؤقتة» — borrowing another project's photograph would make the library look
 * complete while showing a reader the wrong aircraft.
 */

const COLLECTION = 'projects';

export const projectOverrides = cache(async (): Promise<Record<string, Partial<Project>>> => {
  if (!isAdminConfigured()) return {};
  try {
    const snap = await adminDb().collection(COLLECTION).get();
    const out: Record<string, Partial<Project>> = {};
    for (const d of snap.docs) out[d.id] = d.data() as Partial<Project>;
    return out;
  } catch {
    return {};
  }
});

/** Every project, seeds merged with overrides. Includes unpublished ones. */
export const resolvedProjects = cache(async (): Promise<Project[]> => {
  const overrides = await projectOverrides();

  const merged = ALL_PROJECTS.map(seed => {
    const o = overrides[seed.id];
    const project = o ? ({ ...seed, ...o, id: seed.id } as Project) : seed;
    return withUploadedCover(project, o);
  });

  // Documents with no seed are projects created entirely from the admin panel.
  // They must carry the required fields themselves; one that does not is
  // skipped rather than rendered half-empty.
  const seedIds = new Set(ALL_PROJECTS.map(p => p.id));
  for (const [id, o] of Object.entries(overrides)) {
    if (seedIds.has(id)) continue;
    if (!o.titleAr || !o.summaryAr) continue;
    merged.push(withUploadedCover({ ...(o as Project), id }, o));
  }

  return merged;
});

/**
 * Fill `imageUrl` from an uploaded repository file, unless the database spoke.
 *
 * `override?.imageUrl !== undefined` is the whole rule: a present value wins,
 * and so does an explicit `null`. Only silence — no override at all, or an
 * override that never mentions the image — lets the uploaded file answer.
 */
function withUploadedCover(project: Project, override?: Partial<Project>): Project {
  if (override && 'imageUrl' in override && override.imageUrl !== undefined) return project;
  if (project.imageUrl) return project;
  const cover = uploadedProjectCover(project);
  return cover ? { ...project, imageUrl: cover.url } : project;
}

/** Only what a reader may see. */
export async function visibleProjects(): Promise<Project[]> {
  return (await resolvedProjects()).filter(p => p.published);
}

export async function resolvedProject(id: string): Promise<Project | undefined> {
  return (await resolvedProjects()).find(p => p.id === id);
}
