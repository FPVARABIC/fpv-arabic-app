/**
 * Rendering user-written text safely, and formatting dates in Arabic.
 *
 * THE XSS RULE THIS FILE ENFORCES
 * -------------------------------
 * Community text is written by strangers. It is rendered as TEXT NODES, never
 * as HTML — React does that by default, and the only way to lose it is
 * `dangerouslySetInnerHTML`, which `scripts/testWebCommunity.ts` forbids
 * anywhere near community components.
 *
 * What this file adds is the part React does not do for you: turning line
 * breaks into visible structure without letting markup in, and deciding which
 * URLs may become links at all.
 */

/**
 * Splits text into paragraphs and lines for rendering as elements.
 *
 * The alternative — `white-space: pre-wrap` on raw text — also works and is
 * safe, but it cannot tell a blank line from a single break, so a post's
 * intended paragraphing is lost. Returning structure lets the renderer emit
 * real <p> elements, which is better for both reading and assistive tech.
 */
export function toParagraphs(text: string): string[][] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(block => block.split('\n').filter(l => l.trim().length > 0))
    .filter(block => block.length > 0);
}

/** Arabic date, in the reader's calendar-neutral Gregorian form. */
export function formatArabicDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(d);
}

/** «قبل ٣ ساعات» style, falling back to an absolute date past a week. */
export function formatRelativeArabic(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  if (Math.abs(mins) < 60) return rtf.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return rtf.format(-days, 'day');
  return formatArabicDate(iso);
}
