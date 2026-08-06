import { ALL_PROJECTS } from './registry';
import type { Project } from './types';

/**
 * Where a project's photographs go, and what they are called.
 *
 * WHY THIS MIRRORS THE STORE'S SYSTEM EXACTLY
 * -------------------------------------------
 * Because the owner uploads both, by hand, into GitHub. Two folder conventions
 * would mean two things to remember and one of them being got wrong at 1am.
 * The rules are the same rules: a permanent number per role so the gallery
 * order cannot drift, a stable path a file can simply be dropped into, and no
 * data file to edit when it lands.
 *
 * WHAT IS DIFFERENT, AND WHY
 * --------------------------
 * A product has variants; a project does not. So there is no `_shared` folder
 * and no per-variant branch — one directory per project id, four roles, one of
 * them required.
 *
 * NO PLACEHOLDERS AND NO GENERATED IMAGES
 * ---------------------------------------
 * «لا تستخدم صوراً مولدة بالذكاء الاصطناعي. ولا تستخدم صوراً مؤقتة.» A project
 * with no photograph renders a labelled empty state that says so. That is
 * honest and it is also the only thing that keeps the pressure on to upload a
 * real one — a plausible placeholder is a photograph nobody ever replaces.
 */

export const PROJECT_IMAGE_ROLES = ['cover', 'build', 'result', 'diagram'] as const;
export type ProjectImageRole = typeof PROJECT_IMAGE_ROLES[number];

/**
 * The number in the filename. PERMANENT.
 *
 * A role's number never changes, even if a role is retired, because the number
 * is what orders the gallery and it is baked into files already uploaded.
 */
export const PROJECT_ROLE_INDEX: Record<ProjectImageRole, number> = {
  cover: 1,
  build: 2,
  result: 3,
  diagram: 4,
};

/** What each photograph is FOR, so the owner knows what to shoot. */
export const PROJECT_ROLE_BRIEF_AR: Record<ProjectImageRole, string> = {
  cover:
    'الصورة الرئيسية. تظهر في بطاقة المشروع وأعلى صفحته. أوضح صورة تُظهر '
    + 'الطائرة أو المنظومة كاملة.',
  build:
    'التجميع: القطع مركّبة، أو لقطة أثناء البناء تُظهر كيف تتصل ببعضها.',
  result:
    'الناتج: ما ينتجه المشروع فعلاً — خريطة، أو شاشة كشف، أو مسار طيران.',
  diagram:
    'مخطّط: رسم للتوصيل أو لتدفّق البيانات. مرسوم بيدك أو ببرنامج رسم — '
    + 'لا صورة مولّدة.',
};

/** Only the cover is required. The rest add value and none of them blocks. */
export const REQUIRED_PROJECT_ROLES: ReadonlySet<ProjectImageRole> = new Set(['cover']);

export interface ProjectImageSpec {
  aspect: string;
  preferredPx: number;
  minPx: number;
  maxBytes: number;
  ext: 'webp';
}

/**
 * 16:9, not the store's 1:1.
 *
 * A product is photographed alone on a background and a square crops it well.
 * A project is a scene — an aircraft in a field, a bench with a laptop — and a
 * square crops the context out of it. The card and the page hero are both
 * wide, so the shape follows the layout rather than the other way round.
 */
export const PROJECT_IMAGE_SPEC: ProjectImageSpec = {
  aspect: '16:9',
  preferredPx: 1920,
  minPx: 1280,
  maxBytes: 500 * 1024,
  ext: 'webp',
};

export const PROJECT_IMAGE_REPO_DIR = 'web/public/assets/projects';

/** `01-cover.webp` … `04-diagram.webp`, and nothing else. */
export const PROJECT_IMAGE_FILE_PATTERN = /^(0[1-4])-(cover|build|result|diagram)\.webp$/;

export interface ProjectImageSlot {
  projectId: string;
  projectTitleAr: string;
  role: ProjectImageRole;
  /** 1–4. The gallery renders in this order. */
  index: number;
  /** `01-cover.webp` */
  fileName: string;
  /** `web/public/assets/projects/<id>/01-cover.webp` — where the file goes. */
  repoPath: string;
  /** `/assets/projects/<id>/01-cover.webp` — how the browser asks for it. */
  url: string;
  /** What a screen reader says. Written here so no page invents its own. */
  altAr: string;
  required: boolean;
  briefAr: string;
}

function altFor(project: Project, role: ProjectImageRole): string {
  switch (role) {
    case 'cover': return `مشروع ${project.titleAr}`;
    case 'build': return `تجميع مشروع ${project.titleAr}`;
    case 'result': return `ناتج مشروع ${project.titleAr}`;
    case 'diagram': return `مخطّط مشروع ${project.titleAr}`;
    default: {
      const never: never = role;
      return never;
    }
  }
}

/** Every slot for one project, in gallery order. */
export function slotsForProject(project: Project): ProjectImageSlot[] {
  return PROJECT_IMAGE_ROLES.map(role => {
    const index = PROJECT_ROLE_INDEX[role];
    const fileName = `${String(index).padStart(2, '0')}-${role}.${PROJECT_IMAGE_SPEC.ext}`;
    return {
      projectId: project.id,
      projectTitleAr: project.titleAr,
      role,
      index,
      fileName,
      repoPath: `${PROJECT_IMAGE_REPO_DIR}/${project.id}/${fileName}`,
      url: `/assets/projects/${project.id}/${fileName}`,
      altAr: altFor(project, role),
      required: REQUIRED_PROJECT_ROLES.has(role),
      briefAr: PROJECT_ROLE_BRIEF_AR[role],
    };
  });
}

/** Every slot across every project. */
export function allProjectImageSlots(
  projects: readonly Project[] = ALL_PROJECTS,
): ProjectImageSlot[] {
  return projects.flatMap(slotsForProject);
}

/** One directory per project — what has to exist before a file can be dropped in. */
export function allProjectImageDirs(
  projects: readonly Project[] = ALL_PROJECTS,
): string[] {
  return projects.map(p => `${PROJECT_IMAGE_REPO_DIR}/${p.id}`);
}
