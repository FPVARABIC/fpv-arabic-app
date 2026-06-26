/**
 * BOT V2 — Knowledge resolver.
 *
 * Provides read-only access to botKnowledgeBase via concept ID.
 * All lookups use a pre-built Map for O(1) access.
 */

import { botKnowledgeBase } from './knowledgeBase';
import type { BotConceptId } from '../botConceptRegistry';
import type { BotV2KnowledgeNode, BotV2KnowledgeChip, BotV2KnowledgeLink } from './knowledgeTypes';

const _index = new Map<BotConceptId, BotV2KnowledgeNode>(
  botKnowledgeBase.map(node => [node.conceptId, node]),
);

export function getKnowledgeForConcept(conceptId: BotConceptId): BotV2KnowledgeNode | undefined {
  return _index.get(conceptId);
}

export function getRelatedKnowledge(conceptId: BotConceptId): BotV2KnowledgeNode[] {
  const node = _index.get(conceptId);
  if (!node?.relatedConceptIds) return [];
  return node.relatedConceptIds
    .map(id => _index.get(id))
    .filter((n): n is BotV2KnowledgeNode => n !== undefined);
}

export function getKnowledgeChips(conceptId: BotConceptId): BotV2KnowledgeChip[] {
  return _index.get(conceptId)?.chips ?? [];
}

export function getKnowledgeLinks(conceptId: BotConceptId): BotV2KnowledgeLink[] {
  return _index.get(conceptId)?.internalLinks ?? [];
}
