/**
 * Long paragraphs, made readable.
 *
 * WHY
 * ---
 * A tester's screenshot showed a lesson stage as one 410-character block. The
 * definitions hold prose as single strings, and six of them exceed 500
 * characters. Rewriting the content is not the answer — it is good content —
 * so the renderer breaks it into short groups of whole sentences and gives each
 * group its own paragraph.
 *
 * HOW
 * ---
 * Sentences end at «.», «؟», «!» or «؛» followed by whitespace. A period that
 * is NOT followed by whitespace («3.7V», «4-in-1.») never splits. Sentences are
 * then packed greedily into chunks up to `maxChars`; a single sentence longer
 * than the limit stands alone rather than being cut mid-thought.
 *
 * Pure; used by both surfaces' renderers.
 */

const SENTENCE_END = /(?<=[.؟!؛])\s+/u;

export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_END)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Whole sentences packed into paragraphs of at most `maxChars` (unless a single
 * sentence is longer). Text at or under the limit is returned as one chunk.
 */
export function toReadableChunks(text: string, maxChars = 240): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed ? [trimmed] : [];
  const sentences = splitSentences(trimmed);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (!current) { current = sentence; continue; }
    if (current.length + 1 + sentence.length <= maxChars) {
      current = `${current} ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
