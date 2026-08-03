/**
 * Opaque pagination cursors.
 *
 * SEPARATE FROM `lib/server/community.ts` ON PURPOSE
 * -------------------------------------------------
 * That module is `server-only`: importing it outside a server context throws,
 * which is exactly what it is for — it holds the Admin SDK. But cursor
 * encoding is pure string and number logic with no Firebase in it, and burying
 * it behind that guard would make it untestable outside a running Next server.
 *
 * That is not a hypothetical: `scripts/testWebCommunity.ts` exercises these
 * functions directly against hostile inputs, and it could not do so while they
 * lived beside the Admin SDK. Splitting them is what lets the cursor's
 * correctness be PROVEN rather than merely reviewed.
 *
 * WHAT A CURSOR IS
 * ----------------
 * The sort key of the last row on the page: `(createdAtMs, documentId)`. Both
 * halves are required. `createdAt` alone is not a total order — two documents
 * written in the same millisecond tie — and an ambiguous order is precisely
 * what makes a paginated query skip a row or serve it twice.
 *
 * It is base64url-encoded so it survives a URL without escaping, and it is
 * treated as fully untrusted on the way back in: a cursor arrives from a query
 * string a stranger can edit.
 */

export interface PageCursor {
  createdAtMs: number;
  id: string;
}

export function encodeCursor(c: PageCursor): string {
  return Buffer.from(`${c.createdAtMs}:${c.id}`, 'utf8').toString('base64url');
}

/**
 * Decode, or null.
 *
 * Every malformed input becomes null, which callers treat as "no cursor" and
 * therefore "page one". Failing to page one is a safe, visible degradation;
 * throwing would turn a shared or stale link into an error page.
 *
 * The separator is found with `indexOf`, not `split`, so a document id
 * containing a colon survives intact. Splitting would truncate it and shift the
 * page silently by one row — the exact class of bug this cursor exists to
 * prevent.
 */
export function decodeCursor(raw: string | undefined | null): PageCursor | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep <= 0) return null;

    const createdAtMs = Number(decoded.slice(0, sep));
    const id = decoded.slice(sep + 1);

    if (!Number.isFinite(createdAtMs) || createdAtMs < 0) return null;
    // A Firestore document id is at most 1500 bytes, but nothing this app
    // creates approaches 128. A longer value is not ours.
    if (!id || id.length > 128) return null;

    return { createdAtMs, id };
  } catch {
    return null;
  }
}
