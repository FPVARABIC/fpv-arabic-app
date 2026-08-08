import 'server-only';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cache } from 'react';
import { slotsForProject, type ProjectImageSlot } from '@core/data/projects/imageSlots';
import type { Project } from '@core/data/projects/types';

/**
 * The project photographs that are actually on disk.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * `imageSlots.ts` named the folders and the filenames, the manifest told the
 * owner to «ادفع — لا يوجد ملف بيانات تعدّله», and the folders were created
 * empty and waiting. What was never written is the half that makes that promise
 * true: nothing in the web app read the folder, so a file dropped into it was
 * reachable at its URL and invisible on every page. This is that half.
 *
 * WHY THE FILESYSTEM AND NOT A GENERATED INDEX
 * --------------------------------------------
 * Same answer as `storeImages.ts`, and deliberately the same code shape: an
 * index is a second thing to remember, and the one time regenerating it is
 * forgotten the section shows a placeholder over a photograph sitting right
 * there in the repository. Existence is asked of the filesystem at the only
 * moment it is free — these pages are prerendered and revalidated on a timer,
 * so the check runs at build time, never on a visitor's request.
 *
 * `cache()` collapses the repeats within one render: the grid asks about ten
 * projects and the page that follows asks about one of them again.
 *
 * WHY A MISSING FILE IS NOT PAPERED OVER
 * --------------------------------------
 * «لا تستخدم صوراً مؤقتة» — a project with no cover keeps the typed placeholder
 * that says so. Borrowing another project's photograph, or a stock frame, would
 * make the library look complete while showing a reader the wrong aircraft.
 */

// `repoPath` is written from the repository root (`web/public/…`) because that
// is where the owner drops the file, but Next runs with the cwd at `web/`.
const ROOT = process.cwd().endsWith(`${'/'}web`)
  ? join(process.cwd(), '..')
  : process.cwd();

function slotExists(slot: ProjectImageSlot): boolean {
  return existsSync(join(ROOT, slot.repoPath));
}

export interface ResolvedProjectImage {
  url: string;
  altAr: string;
  role: string;
  /** 1–4. The gallery order, fixed by `PROJECT_ROLE_INDEX`. */
  index: number;
}

/** Every uploaded photograph for one project, in role order. Empty is normal. */
export const uploadedProjectImages = cache((project: Project): ResolvedProjectImage[] =>
  slotsForProject(project)
    .filter(slotExists)
    .sort((a, b) => a.index - b.index)
    .map(s => ({ url: s.url, altAr: s.altAr, role: s.role, index: s.index })));

/** The card's image: `01-cover.webp` if it is there, otherwise null. */
export const uploadedProjectCover = cache((project: Project): ResolvedProjectImage | null =>
  uploadedProjectImages(project).find(i => i.role === 'cover') ?? null);
