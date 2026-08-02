/**
 * KB registry — the single lookup surface for the encyclopedia.
 *
 * Views never import a module file directly and never build a route string by
 * hand. Everything goes through here, so adding a module is one import + one
 * array entry, and moving a route is one line in `resolveLinkRoute`.
 */

import type { KbArticle, KbLink, KbModule } from './types';
import { flightControllerModule } from './modules/flightController/module';
import { motorsModule } from './modules/motors/module';
import { propellersModule } from './modules/propellers/module';
import { escModule } from './modules/esc/module';
import { powerModule } from './modules/power/module';

export const allKbModules: KbModule[] = [
  flightControllerModule,
  motorsModule,
  propellersModule,
  escModule,
  powerModule,
];

const moduleById = new Map<string, KbModule>(allKbModules.map(m => [m.id, m]));

const articleById = new Map<string, KbArticle>();
for (const m of allKbModules) {
  for (const a of m.articles) articleById.set(a.id, a);
}

export function getModule(id: string): KbModule | undefined {
  return moduleById.get(id);
}

export function getArticle(id: string): KbArticle | undefined {
  return articleById.get(id);
}

export function allKbArticles(): KbArticle[] {
  return Array.from(articleById.values());
}

/** Articles of a module in authoring order. */
export function moduleArticles(moduleId: string): KbArticle[] {
  const m = moduleById.get(moduleId);
  if (!m) return [];
  return [...m.articles].sort((a, b) => a.order - b.order);
}

/**
 * Route resolution for every cross-subsystem link kind. Content data carries
 * (kind, targetId) only — never a literal path.
 *
 * Returns null for links whose destination is external (handled separately) or
 * whose target no longer exists, so the UI can render a disabled chip rather
 * than a dead link.
 */
export function resolveLinkRoute(link: KbLink): string | null {
  switch (link.kind) {
    case 'article': {
      const a = articleById.get(link.targetId);
      return a ? `/kb/${a.moduleId}/${a.id}` : null;
    }
    case 'lesson':
      return `/lessons/${link.targetId}`;
    case 'betaflight':
      return `/betaflight/${link.targetId}`;
    case 'assembly':
      return '/assembly';
    case 'roadmap':
      return `/roadmap/${link.targetId}`;
    case 'dx':
      return `/diagnose/${link.targetId}`;
    case 'glossary':
      return `/glossary?term=${encodeURIComponent(link.targetId)}`;
    case 'checklist':
      return '/checklists';
    case 'external':
      return link.url ?? null;
    default:
      return null;
  }
}

/** Previous/next within a module, for continuous reading. */
export function articleNeighbours(articleId: string): { prev?: KbArticle; next?: KbArticle } {
  const a = articleById.get(articleId);
  if (!a) return {};
  const list = moduleArticles(a.moduleId);
  const i = list.findIndex(x => x.id === articleId);
  if (i === -1) return {};
  return { prev: list[i - 1], next: list[i + 1] };
}

/** Position of an article inside a given learning path. */
export function pathPosition(moduleId: string, pathId: string, articleId: string): { index: number; total: number } | null {
  const m = moduleById.get(moduleId);
  const p = m?.paths.find(x => x.id === pathId);
  if (!p) return null;
  const index = p.articleIds.indexOf(articleId);
  if (index === -1) return null;
  return { index, total: p.articleIds.length };
}
