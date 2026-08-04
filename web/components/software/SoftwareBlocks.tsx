import Link from 'next/link';
import type { KbLink } from '@core/data/kb/types';
import { webHref, isSafeExternalUrl } from '@/lib/webRoutes';

/**
 * The pieces every software page is built from.
 *
 * WHY THEY ARE SHARED RATHER THAN COPIED PER CENTRE
 * -------------------------------------------------
 * Four centres — Betaflight, ExpressLRS, EdgeTX, video — present the same five
 * shapes: an ordered list of moves, a list of observations, a set of links, a
 * provenance footer, a risk badge. Writing each one four times would guarantee
 * that in six months the EdgeTX footer shows a review date and the video one
 * does not, and a reader would have no way to know which page was stale.
 *
 * They hold no content and no domain logic. Every string they render arrives as
 * a prop from `src/data/`, which is what lets `scripts/testWebSoftware.ts`
 * assert that no software prose lives under `web/`.
 */

const SUB: React.CSSProperties = {
  margin: 0, fontSize: 12.5, fontWeight: 900, color: 'var(--text-dimmer)',
};

/** A titled list. Renders nothing when empty — an empty heading is a bug report. */
export const Block: React.FC<{
  titleAr: string;
  items: readonly string[];
  ordered?: boolean;
  testId?: string;
}> = ({ titleAr, items, ordered, testId }) => {
  if (items.length === 0) return null;
  const List = ordered ? 'ol' : 'ul';
  return (
    <section style={{ marginTop: 16 }} data-testid={testId}>
      <h3 style={SUB}>{titleAr}</h3>
      <List style={{ margin: '8px 0 0', paddingInlineStart: 20, display: 'grid', gap: 6 }}>
        {items.map((t, i) => (
          <li key={i} style={{ fontSize: 13.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>{t}</li>
        ))}
      </List>
    </section>
  );
};

/** One line of prose under a small heading. */
export const Note: React.FC<{ titleAr: string; textAr?: string }> = ({ titleAr, textAr }) => {
  if (!textAr) return null;
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={SUB}>{titleAr}</h3>
      <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>{textAr}</p>
    </section>
  );
};

/**
 * What the platform refuses to state, because it belongs to the reader's device.
 *
 * Rendered distinctly rather than as one more grey list: «راجع دليل جهازك» is
 * not a caveat, it is an instruction, and burying it beside the ordinary prose
 * is how a reader ends up applying a voltage from an unrelated board.
 */
export const ManualRequired: React.FC<{ items: readonly string[] }> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <section className="card-sm" data-testid="manual-required"
      style={{ padding: '13px 15px', marginTop: 16, borderColor: 'rgba(252,211,77,0.3)' }}>
      <h3 style={{ ...SUB, color: '#fcd34d' }}>لا نذكره هنا — خذه من دليل جهازك</h3>
      <ul style={{ margin: '8px 0 0', paddingInlineStart: 20, display: 'grid', gap: 5 }}>
        {items.map((t, i) => (
          <li key={i} style={{ fontSize: 13, lineHeight: 1.95, color: 'var(--text-dim)' }}>{t}</li>
        ))}
      </ul>
    </section>
  );
};

/**
 * Where the content's own author said the reader should go next.
 *
 * Resolved through the adapter, so a link naming something the web has not built
 * renders as visibly unavailable with the reason, never as a dead anchor. The
 * content never learns which surface it is on.
 */
export const Links: React.FC<{ titleAr?: string; links: readonly KbLink[] }> = ({
  titleAr = 'من هنا إلى أين', links,
}) => {
  if (links.length === 0) return null;
  const resolved = links.map(l => ({
    link: l,
    web: webHref(
      l.kind === 'external'
        ? { kind: 'external', url: l.url ?? '' }
        : ({ kind: l.kind, id: l.targetId } as Parameters<typeof webHref>[0]),
    ),
  }));

  return (
    <section style={{ marginTop: 16 }} data-testid="software-links">
      <h3 style={SUB}>{titleAr}</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 9 }}>
        {resolved.map(({ link, web }, i) => {
          if (web.href) {
            return web.external ? (
              <a key={i} className="btn-ghost" href={web.href} target="_blank" rel="noreferrer noopener">
                {link.label} ↗
              </a>
            ) : (
              <Link key={i} className="btn-ghost" href={web.href} data-testid={`link-${link.kind}-${link.targetId}`}>
                {link.label}
              </Link>
            );
          }
          // Real destination, no web page. Say where it lives instead of
          // rendering a click that goes nowhere.
          if (web.unavailableReasonAr) {
            return (
              <span key={i} className="admin-badge" data-testid="link-unavailable"
                style={{ fontWeight: 500 }}>
                {link.label} — {web.unavailableReasonAr}
              </span>
            );
          }
          // Dangling target: render nothing at all rather than a broken promise.
          return null;
        })}
      </div>
    </section>
  );
};

/**
 * Provenance, at the foot of every page.
 *
 * A settings reference without a version and a date is a rumour: these programs
 * move menus between releases, and the reader needs to know how old this text is
 * BEFORE acting on it.
 */
export interface SourceView {
  title: string;
  url?: string;
  /** e.g. 'ExpressLRS 3.x'. Absent on sources that predate the shared shape. */
  version?: string;
}

export const Sources: React.FC<{
  sources: readonly SourceView[];
  reviewedAt: string;
}> = ({ sources, reviewedAt }) => (
  <footer data-testid="software-sources"
    style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
      المصادر · روجعت في <span dir="ltr">{reviewedAt}</span>
    </p>
    <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
      {sources.map((s, i) => (
        <li key={i} style={{ fontSize: 11.5, lineHeight: 1.8 }}>
          {s.url && isSafeExternalUrl(s.url) ? (
            <a className="ltr" href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>
          ) : (
            <span className="ltr">{s.title}</span>
          )}
          {s.version && <span style={{ color: 'var(--text-dimmer)' }}> · <span dir="ltr">{s.version}</span></span>}
        </li>
      ))}
    </ul>
  </footer>
);

/**
 * The same footer for content whose sources are `{label, url}` rather than
 * `KbSource`. ExpressLRS predates the shared source shape and carries its own;
 * converting its data would be a content migration for no reader benefit, so
 * the renderer accepts both rather than the data being rewritten to suit it.
 */
export const SimpleSources: React.FC<{
  sources: readonly { label: string; url: string }[];
  reviewedAt: string;
}> = ({ sources, reviewedAt }) => (
  <Sources sources={sources.map(s => ({ title: s.label, url: s.url }))} reviewedAt={reviewedAt} />
);
