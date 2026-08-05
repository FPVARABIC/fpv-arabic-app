import { allKbModules, allKbArticles } from '@core/data/kb/registry';
import { kbTerms } from '@core/data/kb/glossary/terms';
import { allDxTrees } from '@core/data/kb/diagnostics/trees';
import { STORE_PRODUCTS } from '@core/data/store/catalogue';
import { STORE_CATEGORIES } from '@core/data/store/categories';
import { ALL_PROJECTS } from '@core/data/projects/registry';
import { LESSON_JOURNEY_IDS } from '@core/data/lessons/journeyRegistry';
import { SOFTWARE } from './softwareHub';
import type { PlatformRef, PlatformSectionAr } from '@core/data/projects/types';

/**
 * Every target an editor may point a project at, listed rather than typed.
 *
 * WHY THE PANEL OFFERS A LIST AND NOT A TEXT FIELD
 * ------------------------------------------------
 * Because a text field is how a dead link gets into the library. The seeds are
 * checked by `scripts/testProjects.ts` at build time, but a project written in
 * the admin panel never passes through that suite — it goes straight into
 * Firestore and onto the page. Offering only ids that exist moves the check to
 * where the mistake would be made.
 *
 * The server action re-validates anyway, because a `<select>` is a courtesy and
 * a POST body is a claim. This list is what makes the courtesy accurate; the
 * action is what makes it binding.
 *
 * WHY THIS IS NOT `server-only`
 * -----------------------------
 * It reads registries, not a database or a session. But it does pull the whole
 * encyclopedia index, so the admin PAGE calls it and hands the result to the
 * client component as plain arrays — the component never imports it, and the
 * registries never reach a browser bundle.
 */

export interface RefOption {
  /** The `to` discriminator, matching `PlatformRef`. */
  to: PlatformRef['to'];
  id: string;
  /** What the editor sees in the dropdown. */
  labelAr: string;
}

export interface RefOptionGroup {
  to: PlatformRef['to'];
  labelAr: string;
  /** Empty for `planned` and `elsewhere`, which carry free text instead. */
  options: RefOption[];
}

/** The sections `planned` may name. Mirrors `PlatformSectionAr`. */
export const PLANNED_SECTIONS: readonly PlatformSectionAr[] = [
  'الموسوعة', 'مركز البرامج', 'الدروس', 'المتجر', 'المشاريع', 'التشخيص',
];

export function refOptionGroups(): RefOptionGroup[] {
  const moduleTitle = new Map(allKbModules.map(m => [m.id, m.titleAr]));

  return [
    {
      to: 'kb-article',
      labelAr: 'مقال في الموسوعة',
      options: allKbArticles().map(a => ({
        to: 'kb-article' as const,
        id: a.id,
        labelAr: `${moduleTitle.get(a.moduleId) ?? a.moduleId} — ${a.titleAr}`,
      })),
    },
    {
      to: 'kb-module',
      labelAr: 'وحدة كاملة في الموسوعة',
      options: allKbModules.map(m => ({ to: 'kb-module' as const, id: m.id, labelAr: m.titleAr })),
    },
    {
      to: 'glossary',
      labelAr: 'مصطلح في المعجم',
      options: kbTerms.map(t => ({
        to: 'glossary' as const,
        id: t.id,
        labelAr: `${t.ar} — ${t.en}`,
      })),
    },
    {
      to: 'dx',
      labelAr: 'شجرة تشخيص',
      options: allDxTrees.map(t => ({ to: 'dx' as const, id: t.id, labelAr: t.titleAr })),
    },
    {
      to: 'software',
      labelAr: 'برنامج في مركز البرامج',
      options: SOFTWARE.map(s => ({ to: 'software' as const, id: s.id, labelAr: s.nameEn })),
    },
    {
      to: 'store-product',
      labelAr: 'منتج في المتجر',
      // Every seeded product, published or not. An unpublished one renders as
      // «غير معروض في المتجر حالياً» rather than a link, which is the right
      // answer for a project written before the product goes on sale.
      options: STORE_PRODUCTS.map(p => ({
        to: 'store-product' as const,
        id: p.id,
        labelAr: `${p.nameEn}${p.published ? '' : ' (غير منشور)'}`,
      })),
    },
    {
      to: 'store-category',
      labelAr: 'قسم في المتجر',
      options: STORE_CATEGORIES.map(c => ({
        to: 'store-category' as const, id: c.id, labelAr: c.titleAr,
      })),
    },
    {
      to: 'project',
      labelAr: 'مشروع آخر',
      options: ALL_PROJECTS.map(p => ({ to: 'project' as const, id: p.id, labelAr: p.titleAr })),
    },
    {
      to: 'lesson',
      labelAr: 'درس (يُفتح في تطبيق الهاتف)',
      options: LESSON_JOURNEY_IDS.map(id => ({ to: 'lesson' as const, id, labelAr: id })),
    },
    { to: 'planned', labelAr: 'سيضاف لاحقاً في قسم…', options: [] },
    { to: 'elsewhere', labelAr: 'خارج المنصّة — اكتب من أين يأتي', options: [] },
  ];
}

/**
 * Whether a reference names something that exists.
 *
 * The server action's gate. Deliberately built from the same lists the panel
 * offers, so «the dropdown said it was fine» and «the action accepted it» can
 * never disagree.
 */
export function isKnownRef(ref: PlatformRef): boolean {
  if (ref.to === 'planned') return PLANNED_SECTIONS.includes(ref.sectionAr);
  if (ref.to === 'elsewhere') return ref.whereAr.trim().length >= 8;
  const group = refOptionGroups().find(g => g.to === ref.to);
  return !!group && group.options.some(o => o.id === ref.id);
}
