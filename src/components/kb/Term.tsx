import React from 'react';

/**
 * Wraps a Latin-script technical term inside Arabic RTL prose.
 *
 * Why this exists: the audit found English terms rendered as bare text inside
 * Arabic paragraphs across the app. The Unicode bidi algorithm resolves
 * neighbouring neutrals (digits, punctuation, slashes) against the *surrounding*
 * paragraph direction, so "2207 1750KV" or "TX/RX" inside RTL prose can render
 * with its parts visually reordered. `dir="ltr"` plus `unicode-bidi: isolate`
 * makes the term one atomic LTR island whose internals are laid out correctly
 * and whose position in the Arabic sentence is still RTL.
 */
export const Term: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span dir="ltr" className={className} style={{ unicodeBidi: 'isolate', display: 'inline-block' }}>
    {children}
  </span>
);

/**
 * Splits a mixed Arabic/Latin string and isolates each Latin run.
 *
 * Content authors write natural prose ("متحكم F405 فيه 5 منافذ UART") rather
 * than hand-tagging every term, so this does the isolation at render time for
 * every text block in the KB. A "Latin run" is a maximal sequence of Latin
 * letters, digits and the connector characters that legitimately belong inside
 * a technical token (., /, -, _, +, ×). Arabic-only text passes through
 * untouched with zero extra spans.
 */
const LATIN_RUN = /[A-Za-z][A-Za-z0-9._/+\-×]*|[0-9]+(?:[.\-x×/][0-9A-Za-z]+)+/g;

function isolateLatin(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  // A fresh regex per call — a module-level /g regex carries lastIndex between
  // calls and would silently skip matches on the second string it sees.
  const re = new RegExp(LATIN_RUN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<Term key={`${keyPrefix}-t${i++}`}>{m[0]}</Term>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length > 0 ? out : [text];
}

/** Convenience wrapper for a whole paragraph of mixed-script prose. */
export const RichText: React.FC<{ text: string; idKey?: string }> = ({ text, idKey = 'r' }) => (
  <>{isolateLatin(text, idKey)}</>
);
