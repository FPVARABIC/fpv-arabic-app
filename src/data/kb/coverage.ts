/**
 * Coverage matrix.
 *
 * The product rule this implements: "أي نقص يجب أن يظهر بوضوح على أنه نقص، ولا
 * يجوز إخفاؤه خلف تصميم أو نسبة تقدم غير حقيقية."
 *
 * A module declares the axes that genuinely apply to it (`requiredCoverage`).
 * Each article declares the axes it actually covers. This file computes the
 * difference and it is rendered as-is — a module at 21/26 shows the five
 * missing axes by name, not a rounded percentage.
 *
 * Nothing here infers coverage from prose. An axis counts only when an author
 * put it in an article's `coverage` array, which `scripts/testKbModel.ts`
 * cross-checks against the article actually having content.
 */

import type { KbArticle, KbCoverageAxis, KbModule } from './types';

export interface AxisCoverage {
  axis: KbCoverageAxis;
  covered: boolean;
  /** Articles that claim this axis. */
  articleIds: string[];
}

export interface ModuleCoverage {
  moduleId: string;
  axes: AxisCoverage[];
  coveredCount: number;
  requiredCount: number;
  missing: KbCoverageAxis[];
  /** 0–100, rounded. Shown next to the explicit missing list, never alone. */
  percent: number;
  /** True only when every required axis is covered. */
  complete: boolean;
}

export function computeModuleCoverage(mod: KbModule): ModuleCoverage {
  const byAxis = new Map<KbCoverageAxis, string[]>();
  for (const a of mod.articles) {
    for (const axis of a.coverage) {
      const list = byAxis.get(axis) ?? [];
      list.push(a.id);
      byAxis.set(axis, list);
    }
  }

  const axes: AxisCoverage[] = mod.requiredCoverage.map(axis => {
    const articleIds = byAxis.get(axis) ?? [];
    return { axis, covered: articleIds.length > 0, articleIds };
  });

  const coveredCount = axes.filter(a => a.covered).length;
  const requiredCount = axes.length;
  const missing = axes.filter(a => !a.covered).map(a => a.axis);

  return {
    moduleId: mod.id,
    axes,
    coveredCount,
    requiredCount,
    missing,
    percent: requiredCount === 0 ? 0 : Math.round((coveredCount / requiredCount) * 100),
    complete: missing.length === 0,
  };
}

/**
 * Minimum substance an article must carry before it is allowed to claim any
 * coverage axis. Deliberately low as a floor, not a target — it exists to make
 * "عنوان بلا محتوى" mechanically impossible, and is enforced by the model test.
 */
export const MIN_BLOCKS_PER_ARTICLE = 4;

export function articleBlockCount(a: KbArticle): number {
  return Object.values(a.layers).reduce((sum, blocks) => sum + (blocks?.length ?? 0), 0);
}

/** Every author-written string in an article's layers, one entry per field. */
export function articleTextStrings(a: KbArticle): string[] {
  const out: string[] = [a.summaryAr, ...a.objectives, ...(a.tasks ?? [])];
  for (const blocks of Object.values(a.layers)) {
    for (const b of blocks ?? []) {
      switch (b.type) {
        case 'para': out.push(b.text); break;
        case 'list': out.push(...(b.title ? [b.title] : []), ...b.items); break;
        case 'steps':
          out.push(...(b.title ? [b.title] : []));
          for (const s of b.steps) { out.push(s.text); if (s.note) out.push(s.note); }
          break;
        case 'table': out.push(...(b.caption ? [b.caption] : []), ...b.headers, ...b.rows.flat()); break;
        case 'callout': out.push(...(b.title ? [b.title] : []), b.text); break;
        case 'definition': out.push(b.term, b.text); break;
        case 'keyvalue': out.push(...(b.caption ? [b.caption] : []), ...b.pairs.flatMap(p => [p.k, p.v])); break;
        case 'compare':
          out.push(...(b.caption ? [b.caption] : []), ...b.columns, ...b.rows.flatMap(r => [r.label, ...r.cells]));
          break;
        case 'diagram': if (b.caption) out.push(b.caption); break;
        case 'faq': out.push(...b.items.flatMap(i => [i.q, i.a])); break;
        case 'checklist': out.push(...(b.title ? [b.title] : []), ...b.items); break;
      }
    }
  }
  return out;
}

/**
 * A placeholder is a field whose ENTIRE value is a stand-in, which is what the
 * spec forbids ("«قريباً» داخل قسم يدّعى اكتماله"). Matching the substring
 * would be wrong in Arabic: «قريباً» also means "close to" in ordinary prose
 * ("قراءة قريبة جداً من 5 فولت"), so a substring test flags correct technical
 * writing. Only a whole-field match, or literal lorem ipsum anywhere, counts.
 */
const PLACEHOLDER_WHOLE = /^\s*(قريبا|قريبًا|قريباً|coming soon|tbd|todo|placeholder|n\/a|xxx+|\.\.\.|—)\s*[.،]?\s*$/i;
const LOREM = /lorem\s+ipsum/i;

export function findPlaceholderFields(a: KbArticle): string[] {
  return articleTextStrings(a).filter(s => PLACEHOLDER_WHOLE.test(s) || LOREM.test(s));
}

export interface ArticleIntegrityProblem {
  articleId: string;
  problem: string;
}

/**
 * Structural checks that do not need the whole registry — used by both the
 * test script and (for the substance floor) the module page's honesty banner.
 */
export function checkArticleIntegrity(a: KbArticle): ArticleIntegrityProblem[] {
  const problems: ArticleIntegrityProblem[] = [];
  const push = (problem: string) => problems.push({ articleId: a.id, problem });

  if (!a.summaryAr.trim()) push('summaryAr فارغ');
  if (articleBlockCount(a) < MIN_BLOCKS_PER_ARTICLE) {
    push(`عدد الكتل ${articleBlockCount(a)} أقل من الحد الأدنى ${MIN_BLOCKS_PER_ARTICLE}`);
  }
  if (a.coverage.length === 0) push('لا يعلن أي محور تغطية');
  if (a.sources.length === 0) push('بلا مصادر');
  if (!a.lastReviewed) push('بلا تاريخ مراجعة');
  if (a.objectives.length === 0) push('بلا أهداف تعلم');
  if (a.keywordsAr.length === 0 && a.keywordsEn.length === 0) push('بلا كلمات مفتاحية — لن يصله البحث');

  for (const bad of findPlaceholderFields(a)) {
    push(`حقل نائب لا محتوى فيه: "${bad.slice(0, 40)}"`);
  }

  return problems;
}
