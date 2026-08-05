import type { SearchDoc } from '@core/data/kb/search/buildIndex';
import { normalizeText } from '@core/data/kb/search/buildIndex';
import { ALL_PROJECTS } from '@core/data/projects/registry';
import { DIFFICULTY_LABEL_AR, projectCategory } from '@core/data/projects/types';
import type { Project } from '@core/data/projects/types';

/**
 * The project library, made findable.
 *
 * WHY A PROJECT BECOMES SEVEN DOCUMENTS AND NOT ONE
 * -------------------------------------------------
 * A project page is four thousand words. Indexing it as a single document
 * means «SLAM» and «هبوط دقيق» and «تحدّيات الاهتزاز» all return the same row
 * pointing at the top of the same page, and the reader scrolls. Worse, the one
 * document's score is diluted by everything it contains: a project that
 * mentions ROS once ranks the same as the one built on it.
 *
 * So each substantial section is its own document with its own anchor. A search
 * for «ما أحتاج تعلّمه قبل SLAM» lands on `#prerequisites`, not on the title.
 * The sections match the ones the page actually renders, and the suite asserts
 * that correspondence — an anchor that no longer exists is a result that scrolls
 * nowhere.
 *
 * WHY THE PARENT DOCUMENT STILL EXISTS
 * ------------------------------------
 * Somebody typing a project's name wants the project, not its challenges
 * section. The parent carries the title, the summary and the technologies, and
 * outranks its own sections on a name match because a title match scores higher
 * than a body match — which is the ranking working, not a special case.
 *
 * WHAT IS DELIBERATELY NOT INDEXED
 * --------------------------------
 * Unpublished projects. `ALL_PROJECTS` carries the reviewed seeds and every one
 * is published today, but the admin panel can hide one at any moment and a
 * hidden project must not be reachable by search. The filter is applied here
 * rather than trusted upstream.
 */

const norm = (...parts: (string | undefined)[]): string[] =>
  Array.from(new Set(
    parts.filter((p): p is string => !!p)
      .flatMap(p => normalizeText(p).split(' '))
      .filter(t => t.length > 1),
  ));

/** One indexable slice of a project. `anchor` must match a rendered section id. */
interface Slice {
  anchor: string;
  titleAr: string;
  /** What the reader sees under the result title. */
  subtitle: (p: Project) => string | undefined;
  /** The words this slice should be found by. */
  text: (p: Project) => (string | undefined)[];
  /** True when the slice has nothing to index for this project. */
  empty: (p: Project) => boolean;
}

const SLICES: Slice[] = [
  {
    anchor: 'outcomes',
    titleAr: 'ماذا ستتعلّم',
    subtitle: p => p.learningOutcomesAr[0],
    text: p => p.learningOutcomesAr,
    empty: p => p.learningOutcomesAr.length === 0,
  },
  {
    anchor: 'prerequisites',
    titleAr: 'ما الذي يجب أن تتعلّمه أوّلاً',
    subtitle: p => p.prerequisites.filter(q => q.essential).map(q => q.titleAr).join(' · '),
    text: p => p.prerequisites.flatMap(q => [q.titleAr, q.titleEn, q.whyAr]),
    empty: p => p.prerequisites.length === 0,
  },
  {
    anchor: 'parts',
    titleAr: 'القطع المطلوبة',
    subtitle: p => p.parts.map(x => x.nameAr).join(' · '),
    text: p => p.parts.flatMap(x => [x.nameAr, x.nameEn, x.whyAr]),
    empty: p => p.parts.length === 0,
  },
  {
    anchor: 'software',
    titleAr: 'البرامج المطلوبة',
    subtitle: p => p.software.map(x => x.nameEn).join(' · '),
    text: p => p.software.flatMap(x => [x.nameEn, x.roleAr]),
    empty: p => p.software.length === 0,
  },
  {
    anchor: 'glossary',
    titleAr: 'المصطلحات المهمّة',
    subtitle: p => p.glossary.map(t => t.termEn).join(' · '),
    text: p => p.glossary.flatMap(t => [t.termAr, t.termEn, t.hintAr]),
    empty: p => p.glossary.length === 0,
  },
  {
    anchor: 'stages',
    titleAr: 'مراحل التنفيذ',
    subtitle: p => p.stages[0]?.titleAr,
    text: p => p.stages.flatMap(s => [s.titleAr, s.bodyAr]),
    empty: p => p.stages.length === 0,
  },
  {
    anchor: 'challenges',
    titleAr: 'التحدّيات',
    subtitle: p => p.challenges.map(c => c.titleAr).join(' · '),
    text: p => p.challenges.flatMap(c => [c.titleAr, c.bodyAr, c.mitigationAr]),
    empty: p => p.challenges.length === 0,
  },
  {
    anchor: 'applications',
    titleAr: 'التطبيقات العملية',
    subtitle: p => p.applicationsAr[0],
    text: p => p.applicationsAr,
    empty: p => p.applicationsAr.length === 0,
  },
];

/** The anchors this module promises exist on the page. Read by the suite. */
export const PROJECT_SLICE_ANCHORS: readonly string[] = SLICES.map(s => s.anchor);

export function projectSearchDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const p of ALL_PROJECTS) {
    if (!p.published) continue;

    const route = `/projects/${p.id}`;
    const categoriesAr = p.categoryIds.map(c => projectCategory(c)?.titleAr ?? c);

    // ── The project itself ────────────────────────────────────────────────
    docs.push({
      key: `project:${p.id}`,
      type: 'project',
      sourceId: p.id,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      subtitle: p.summaryAr,
      route,
      contentClass: 'learning',
      // The names it answers to. A reader types "YOLO" or "SLAM" far more often
      // than a project's full Arabic title.
      exactNames: norm(p.titleEn, p.titleAr),
      titleTokens: norm(p.titleAr, p.titleEn, ...p.skillsAr),
      keywordTokens: norm(
        // The word for what this IS.
        //
        // Without it, «مشروع بحث وإنقاذ» ranked the project's own SECTIONS
        // above the project: «مشروع» appears in a stage's prose, so the section
        // matched it at keyword weight while the project matched it only in its
        // definition, at body weight. Labelling a document with its own type
        // name is not gaming the ranking — it is the document saying what it is,
        // the same way the standing pages carry their section names.
        'مشروع',
        ...p.skillsAr, ...categoriesAr, DIFFICULTY_LABEL_AR[p.difficulty],
        ...p.software.map(s => s.nameEn),
        ...p.glossary.map(t => t.termEn),
        ...p.parts.map(x => x.nameEn),
      ),
      bodyTokens: norm(p.summaryAr, p.definitionAr, p.ideaAr, p.purposeAr,
        ...p.learningOutcomesAr),
      // A project is not a fault report. Leaving this empty is what keeps a
      // build guide from outranking a diagnosis tree when somebody describes a
      // symptom — the exact ordering bug the symptom field was created to fix.
      symptomTokens: [],
      reviewedAt: p.lastReviewed,
    });

    // ── Its sections ──────────────────────────────────────────────────────
    for (const s of SLICES) {
      if (s.empty(p)) continue;
      const text = s.text(p).filter((t): t is string => !!t);
      docs.push({
        key: `project-section:${p.id}.${s.anchor}`,
        type: 'project-section',
        sourceId: `${p.id}.${s.anchor}`,
        titleAr: `${s.titleAr} — ${p.titleAr}`,
        subtitle: s.subtitle(p)?.slice(0, 160),
        route: `${route}#${s.anchor}`,
        contentClass: 'learning',
        /*
         * A section's TITLE is its heading plus the project it belongs to —
         * nothing else.
         *
         * It used to be the heading plus the first twelve strings of its own
         * content, and the measurable consequence was that «مشروع بحث وإنقاذ»
         * returned three of one project's sections above the project itself: a
         * long prerequisite list matches many query words at title weight,
         * while the project's own title matches two.
         *
         * With the content moved down a tier the tie is broken by type bias,
         * which puts a project above its own sections — and a query that names
         * a section's subject («تحدّيات الاهتزاز») still reaches the section,
         * because the heading matches at title weight and the subject at
         * keyword weight, which together beat the project's body match.
         */
        titleTokens: norm(s.titleAr, p.titleAr, p.titleEn),
        keywordTokens: norm(...text),
        bodyTokens: norm(...text, p.summaryAr),
        symptomTokens: [],
        reviewedAt: p.lastReviewed,
      });
    }
  }

  return docs;
}
