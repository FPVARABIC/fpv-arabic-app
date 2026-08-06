import type { Project, ProjectCategoryId, ProjectDifficulty } from './types';
import { VISION_PROJECTS } from './catalogue/vision';
import { AUTONOMY_PROJECTS } from './catalogue/autonomy';
import { APPLIED_PROJECTS } from './catalogue/applied';
import { stagesWithPlan } from './buildPlans';

/**
 * The project library, assembled.
 *
 * WHY THE SEEDS LIVE IN CODE AT ALL
 * ---------------------------------
 * The brief said «لا تجعل أي شيء ثابتاً داخل الشيفرة», and that rule is honoured
 * where it matters: nothing here is FINAL. These are seeds, and
 * `web/lib/server/projects.ts` merges an editable Firestore document over every
 * one of them, so the admin panel can change any field, unpublish any project,
 * and add projects that appear in no file.
 *
 * They live in code rather than only in the database for two reasons. First, a
 * database that is empty on a fresh deployment gives an empty section, and an
 * empty section is indistinguishable from a broken one. Second, this content was
 * written and reviewed as prose — it belongs in version control where a change
 * to it is a diff somebody can read, not an untracked edit in a console.
 *
 * The store already works exactly this way (`mergeCatalogue`), and using one
 * pattern twice is worth more than each half being independently clever.
 */

/**
 * THE BUILD PLAN IS MERGED HERE, NOT WRITTEN INTO THE CATALOGUE FILES
 * ------------------------------------------------------------------
 * The catalogue says what each project IS. `buildPlans.ts` says how it is
 * BUILT, for all ten in one file, so the plans can be read against each other
 * and kept in the same shape — which is the only way «المرحلة الأولى» means the
 * same kind of thing in every project.
 *
 * Merging rather than replacing is deliberate: each original phase keeps its
 * paragraph as context beneath its new steps. The old prose was accurate; what
 * it lacked was a beginning and an exit condition, and that is what the plan
 * adds.
 */
export const ALL_PROJECTS: Project[] = [
  ...VISION_PROJECTS,
  ...AUTONOMY_PROJECTS,
  ...APPLIED_PROJECTS,
].map(p => ({ ...p, stages: stagesWithPlan(p.id, p.stages) }));

export function getProject(id: string): Project | undefined {
  return ALL_PROJECTS.find(p => p.id === id);
}

export function publishedProjects(projects: readonly Project[] = ALL_PROJECTS): Project[] {
  return projects.filter(p => p.published);
}

export function projectsInCategory(
  categoryId: ProjectCategoryId,
  projects: readonly Project[] = ALL_PROJECTS,
): Project[] {
  return projects.filter(p => p.categoryIds.includes(categoryId));
}

/**
 * Difficulty order, for sorting.
 *
 * Exported rather than inlined because the index page, the admin panel and the
 * test all need the same order, and three copies of an ordering is how one of
 * them ends up listing «بحثي» before «مبتدئ».
 */
export const DIFFICULTY_ORDER: Record<ProjectDifficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  research: 3,
};

/** Easiest first — the order somebody browsing for their next build wants. */
export function byDifficulty(projects: readonly Project[]): Project[] {
  return [...projects].sort(
    (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty],
  );
}

/** Only the categories that actually have a published project in them. */
export function activeCategories(
  projects: readonly Project[] = ALL_PROJECTS,
): ProjectCategoryId[] {
  const seen = new Set<ProjectCategoryId>();
  for (const p of projects) {
    if (!p.published) continue;
    for (const c of p.categoryIds) seen.add(c);
  }
  return [...seen];
}
