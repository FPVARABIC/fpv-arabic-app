import Link from 'next/link';
import type { KbLink } from '@core/data/kb/types';
import { kbLinkToDestination } from '@core/data/kb/registry';
import { webHref, isSafeExternalUrl } from '@/lib/webRoutes';

/**
 * One «اذهب من هنا» link, resolved for the WEB.
 *
 * THE BUG THIS EXISTS TO KILL
 * ---------------------------
 * The encyclopedia and the diagnosis trees both rendered these links by calling
 * `resolveLinkRoute` from the shared core. That function resolves against the
 * PHONE's route table — it is the phone's answer, and it is correct there. On
 * the web it produced `/lessons/lesson-lipo-batteries`, `/assembly`,
 * `/roadmap/build-esc` and `/checklists`: four route families this surface has
 * never had. They rendered as ordinary, inviting links and 404'd on click.
 *
 * Eight of them shipped. Nothing caught it because a typecheck cannot know
 * which routes exist, and nobody clicks «درس: بطاريات LiPo» from a diagnosis
 * tree while checking a store page. The site-wide dead-link audit in
 * `scripts/testReviewCopy.mjs` found all eight at once.
 *
 * `webHref` already knew the answer. It returns `{ href: null,
 * unavailableReasonAr }` for the kinds that exist only in the app, precisely so
 * this case can be rendered honestly. The two pages simply were not asking it.
 *
 * WHY A COMPONENT AND NOT TWO FIXES
 * ---------------------------------
 * Because the next page to render a content link would have made the same
 * choice. There is now one place that knows how a content link becomes markup,
 * and the wrong function is not in scope inside it.
 *
 * THREE OUTCOMES, ALL DELIBERATE
 * ------------------------------
 *   a live route          → a link
 *   phone-only            → the same card, not a link, saying where it lives
 *   a target that is gone → nothing at all
 *
 * The middle case is the point. Telling somebody «this is in the app» respects
 * the click they were about to make; a dead link spends it.
 */
export const ContentLink: React.FC<{
  link: KbLink;
  /** `article` or `dx` — keeps the existing test ids stable. */
  testIdPrefix: string;
  /** Positional fallback for links with no target id. */
  index: number;
}> = ({ link, testIdPrefix, index }) => {
  const key = `${testIdPrefix}-${link.kind}-${link.targetId ?? index}`;

  if (link.kind === 'external') {
    const url = link.url && isSafeExternalUrl(link.url) ? link.url : null;
    if (!url) return null;
    return (
      <li>
        <Link
          href={url}
          className="card-sm"
          data-testid={key}
          style={CARD}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label}
          <span className="sr-only"> (يفتح في نافذة جديدة)</span>
        </Link>
      </li>
    );
  }

  const destination = kbLinkToDestination(link);
  if (!destination) return null;

  const { href, unavailableReasonAr } = webHref(destination);

  if (href) {
    return (
      <li>
        <Link href={href} className="card-sm" data-testid={key} style={CARD}>
          {link.label}
        </Link>
      </li>
    );
  }

  if (unavailableReasonAr) {
    return (
      <li>
        <div
          className="card-sm"
          data-testid={`${key}-phone-only`}
          style={{ ...CARD, color: 'var(--text-dimmer)' }}
        >
          <span style={{ color: 'var(--text-dim)' }}>{link.label}</span>
          <span style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
            {unavailableReasonAr}
          </span>
        </div>
      </li>
    );
  }

  // A target that no longer exists. Rendering nothing is the honest outcome:
  // there is no page to promise and no app to point at.
  return null;
};

const CARD: React.CSSProperties = {
  display: 'block',
  padding: '11px 14px',
  fontSize: 13.5,
  color: 'var(--text-dim)',
};
