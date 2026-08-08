import 'server-only';
import { slotsForProject, type ProjectImageSlot } from '@core/data/projects/imageSlots';
import type { Project } from '@core/data/projects/types';

/**
 * The project photographs that are actually uploaded.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * `imageSlots.ts` named the folders and the filenames, the manifest told the
 * owner to «ادفع — لا يوجد ملف بيانات تعدّله», and the folders were created
 * empty and waiting. What was never written is the half that makes that
 * promise true: nothing in the web app read the folder, so a file dropped
 * into it was reachable at its URL and invisible on every page. This is that
 * half.
 *
 * WHY THE ANSWER IS A BUILD-TIME CONSTANT, NOT A RUNTIME existsSync
 * -----------------------------------------------------------------
 * The first version of this file asked the filesystem at request time. That
 * is correct exactly as long as the serving runtime carries the repository
 * files — true of a local `next start`, conditionally true of a lambda (it
 * needed `outputFileTracingIncludes` to smuggle the images in), and FALSE on
 * Cloudflare Workers, where there is no repository filesystem at request
 * time at all. Same failure each time the assumption broke: files on the
 * CDN, placeholders on the cards, nothing red anywhere.
 *
 * So the question moved to the one moment the filesystem is guaranteed real
 * on every host — the build. `next.config.ts` reads the directory once and
 * inlines the listing as `UPLOADED_PROJECT_IMAGES`; this module only matches
 * that constant against the slots the shared convention defines. The owner's
 * workflow is unchanged: drop a `.webp`, push, and the next build sees it —
 * no data file to edit, which is the promise the manifest makes.
 *
 * WHY A MISSING FILE IS STILL NOT PAPERED OVER
 * --------------------------------------------
 * «لا تستخدم صوراً مؤقتة» — a project with no cover keeps the typed
 * placeholder that says so. Borrowing another project's photograph would make
 * the library look complete while showing a reader the wrong aircraft.
 */

const UPLOADED: Readonly<Record<string, readonly string[]>> = (() => {
  try {
    return JSON.parse(process.env.UPLOADED_PROJECT_IMAGES ?? '{}');
  } catch {
    // A malformed constant means a broken build script, not missing
    // photographs — but the page's honest degraded state is the same either
    // way: render the typed placeholders rather than crash the route.
    return {};
  }
})();

function slotExists(slot: ProjectImageSlot): boolean {
  return UPLOADED[slot.projectId]?.includes(slot.fileName) ?? false;
}

export interface ResolvedProjectImage {
  url: string;
  altAr: string;
  role: string;
  /** 1–4. The gallery order, fixed by `PROJECT_ROLE_INDEX`. */
  index: number;
}

/** Every uploaded photograph for one project, in role order. Empty is normal. */
export function uploadedProjectImages(project: Project): ResolvedProjectImage[] {
  return slotsForProject(project)
    .filter(slotExists)
    .sort((a, b) => a.index - b.index)
    .map(s => ({ url: s.url, altAr: s.altAr, role: s.role, index: s.index }));
}

/** The card's image: `01-cover.webp` if it is uploaded, otherwise null. */
export function uploadedProjectCover(project: Project): ResolvedProjectImage | null {
  return uploadedProjectImages(project).find(i => i.role === 'cover') ?? null;
}
