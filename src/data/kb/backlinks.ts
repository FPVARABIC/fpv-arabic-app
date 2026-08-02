/**
 * Reverse index: "what in the encyclopedia points at this lesson / Betaflight
 * page / assembly stage?"
 *
 * Cross-links are authored in ONE direction only — inside KB content — so an
 * article's links stay next to the prose that justifies them. Rendering the
 * other direction (a lesson showing which articles cover it in depth) would
 * otherwise mean duplicating every link in a second place and letting the two
 * lists drift apart. This derives that direction instead.
 */

import type { KbArticle, KbLinkKind } from './types';
import type { DxTree } from './diagnostics/types';
import { allKbModules } from './registry';
import { allDxTrees } from './diagnostics/trees';

export interface Backlinks {
  articles: KbArticle[];
  trees: DxTree[];
}

function key(kind: KbLinkKind, targetId: string): string {
  return `${kind}:${targetId}`;
}

let cache: Map<string, Backlinks> | null = null;

function build(): Map<string, Backlinks> {
  const map = new Map<string, Backlinks>();

  const push = (k: string, article?: KbArticle, tree?: DxTree) => {
    const entry = map.get(k) ?? { articles: [], trees: [] };
    if (article && !entry.articles.some(a => a.id === article.id)) entry.articles.push(article);
    if (tree && !entry.trees.some(t => t.id === tree.id)) entry.trees.push(tree);
    map.set(k, entry);
  };

  for (const mod of allKbModules) {
    for (const a of mod.articles) {
      for (const l of a.links) {
        if (l.kind === 'article' || l.kind === 'glossary' || l.kind === 'external') continue;
        push(key(l.kind, l.targetId), a, undefined);
      }
    }
  }

  for (const t of allDxTrees) {
    for (const l of t.links) {
      if (l.kind === 'article' || l.kind === 'glossary' || l.kind === 'external') continue;
      push(key(l.kind, l.targetId), undefined, t);
    }
  }

  return map;
}

export function getBacklinks(kind: KbLinkKind, targetId: string): Backlinks {
  if (!cache) cache = build();
  return cache.get(key(kind, targetId)) ?? { articles: [], trees: [] };
}

/** Test-only. */
export function resetBacklinkCache(): void {
  cache = null;
}
