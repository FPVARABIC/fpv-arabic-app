/**
 * KB registry — the single lookup surface for the encyclopedia.
 *
 * Views never import a module file directly and never build a route string by
 * hand. Everything goes through here, so adding a module is one import + one
 * array entry, and moving a route is one line in `resolveLinkRoute`.
 */

import type { KbArticle, KbLink, KbModule } from './types';
import {
  resolveDestination, type Destination, type DestinationChecks,
} from '../../platform/destinations';
import { flightControllerModule } from './modules/flightController/module';
import { motorsModule } from './modules/motors/module';
import { propellersModule } from './modules/propellers/module';
import { escModule } from './modules/esc/module';
import { powerModule } from './modules/power/module';
import { rcLinkModule } from './modules/rcLink/module';

export const allKbModules: KbModule[] = [
  flightControllerModule,
  motorsModule,
  propellersModule,
  escModule,
  powerModule,
  rcLinkModule,
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
/**
 * Existence checks handed to the destination resolver.
 *
 * They live here because the registries live here; the resolver itself stays
 * free of any import that would pull the encyclopedia into a bundle that only
 * needs a URL.
 */
const KB_CHECKS: DestinationChecks = {
  articleExists: id => articleById.has(id),
  moduleExists: id => moduleById.has(id),
  moduleIdOfArticle: id => articleById.get(id)?.moduleId,
};

/**
 * Content links resolve through the platform's ONE destination resolver.
 *
 * `KbLink` stays as the authoring shape — it carries a label and a reason,
 * which a bare destination does not — but it no longer decides route strings.
 * That way a link in an article, a finding in the workspace, a search result
 * and (later) a bot answer all point at the same identity and all break the
 * same way when a target disappears.
 */
export function resolveLinkRoute(link: KbLink): string | null {
  const d = kbLinkToDestination(link);
  return d ? resolveDestination(d, KB_CHECKS) : null;
}

/** The identity behind a content link — surface-independent and shareable. */
export function kbLinkToDestination(link: KbLink): Destination | null {
  switch (link.kind) {
    case 'article': return { kind: 'article', id: link.targetId };
    case 'lesson': return { kind: 'lesson', id: link.targetId };
    case 'betaflight': return { kind: 'betaflight', id: link.targetId };
    case 'roadmap': return { kind: 'roadmap', id: link.targetId };
    case 'dx': return { kind: 'dx', id: link.targetId };
    case 'glossary': return { kind: 'glossary', id: link.targetId };
    case 'assembly': return { kind: 'assembly' };
    case 'checklist': return { kind: 'checklist' };
    // Screens that select their entry from a query parameter: an empty id is a
    // legitimate "open the centre", a present id is "open this exact entry".
    case 'elrs-setup': return link.targetId ? { kind: 'elrs-setup', id: link.targetId } : { kind: 'elrs-setup' };
    case 'elrs-issue': return link.targetId ? { kind: 'elrs-issue', id: link.targetId } : { kind: 'elrs-issue' };
    case 'edgetx': return link.targetId ? { kind: 'edgetx', id: link.targetId } : { kind: 'edgetx' };
    // «افتح مشروعي» / «افتح تقرير التعارض» / «سجّل الـTarget» — three different
    // destinations, one link kind, distinguished by what the id names.
    case 'project':
      if (!link.targetId) return { kind: 'project' };
      if (link.targetId === 'findings') return { kind: 'project', view: 'findings' };
      return { kind: 'project', view: 'rc', field: link.targetId };
    case 'external': return link.url ? { kind: 'external', url: link.url } : null;
    default: return null;
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
