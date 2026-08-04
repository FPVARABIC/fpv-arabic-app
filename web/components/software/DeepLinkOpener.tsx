'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Makes `?step=` and `?issue=` open the exact entry they name.
 *
 * WHY THE PAGE IS NOT SPLIT INTO ONE ROUTE PER ENTRY
 * --------------------------------------------------
 * Because the shared resolver already decided the URL shape:
 * `/programming/expresslrs/troubleshooting?issue=no-bind` is what
 * `resolveDestination` returns, on the phone and here, and what every finding,
 * every bot action and every shared link already carries. Inventing
 * `/troubleshooting/no-bind` for the web would mean two addresses for one thing
 * and a link written today breaking tomorrow.
 *
 * WHY EVERY ENTRY IS IN THE HTML ANYWAY
 * -------------------------------------
 * A query parameter is not a page to a crawler, so if the content only appeared
 * after JavaScript selected it, thirty-nine of the forty issues would be
 * invisible to search and the fortieth would be whichever one the crawler
 * happened to request. So the server renders all of them, collapsed inside
 * native `<details>`. That gives three things at once: the text is indexable,
 * the browser's own find-in-page reaches it, and the page still works with
 * JavaScript off — the reader just opens the section themselves.
 *
 * This component is the last five per cent: open the named one, move to it, and
 * say so. It renders nothing at all when no parameter is present, which is the
 * common case.
 *
 * WHY A WRONG ID GETS A MESSAGE RATHER THAN SILENCE
 * -------------------------------------------------
 * A link to a renamed entry would otherwise dump the reader at the top of a long
 * page with no hint that what they clicked no longer exists. Naming the failure
 * is the difference between a broken link and a confusing one.
 */
export const DeepLinkOpener: React.FC<{
  /** The query parameter this page answers to — `step` or `issue`. */
  param: string;
  /** DOM id prefix the entries were rendered with. */
  prefix: string;
  /** Valid ids and their titles, so a stale link can be named as stale. */
  entries: { id: string; titleAr: string }[];
  /** What one entry is called, for the messages. */
  nounAr: string;
}> = ({ param, prefix, entries, nounAr }) => {
  const searchParams = useSearchParams();
  const requested = searchParams.get(param);
  const match = requested ? entries.find(e => e.id === requested) : undefined;

  useEffect(() => {
    if (!requested || !match) return;
    const el = document.getElementById(`${prefix}${requested}`);
    if (!el) return;
    if (el instanceof HTMLDetailsElement) el.open = true;
    // Respect the reader's motion preference — a long jump animating past forty
    // sections is exactly what that setting exists to prevent.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    // Move focus so a keyboard or screen-reader user lands where the sighted
    // user's viewport just went, instead of at the top of the document.
    const summary = el.querySelector('summary');
    if (summary instanceof HTMLElement) summary.focus({ preventScroll: true });
  }, [requested, match, prefix]);

  if (!requested) return null;

  if (!match) {
    return (
      <aside
        className="card-sm"
        role="status"
        data-testid="deeplink-missing"
        style={{ padding: '13px 15px', marginTop: 16, borderColor: 'rgba(252,211,77,0.35)' }}
      >
        <p style={{ margin: 0, fontSize: 13, color: '#fcd34d', lineHeight: 1.95 }}>
          الرابط طلب {nounAr} باسم <span className="ltr">{requested}</span> ولا وجود له هنا.
          قد يكون الاسم تغيّر. القائمة كاملة أدناه.
        </p>
      </aside>
    );
  }

  return (
    <aside
      className="card-sm"
      role="status"
      data-testid="deeplink-opened"
      data-deeplink-id={match.id}
      style={{ padding: '13px 15px', marginTop: 16 }}
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        فُتِح {nounAr}: <strong>{match.titleAr}</strong>
      </p>
    </aside>
  );
};
