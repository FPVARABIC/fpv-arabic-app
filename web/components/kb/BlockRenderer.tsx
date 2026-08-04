import type { KbBlock, KbSafetyLevel } from '@core/data/kb/types';

/**
 * Renders the content-as-data block union — the web half of the same contract
 * the phone app's BlockRenderer implements.
 *
 * WHY THIS IS NOT DUPLICATION
 * ---------------------------
 * The DATA is shared; only the paint differs. This component holds no article
 * text, no ordering, no editorial decision — it receives `KbBlock[]` straight
 * from the shared registry and draws it. Add an article and it appears here
 * with no change to this file; change a paragraph and it changes on both
 * surfaces at once, because there is one paragraph.
 *
 * The phone version paints for a 390px column; this one uses the width a desktop
 * actually has — wide tables that scroll inside themselves, comparison grids
 * that do not collapse to one column. Same content, layout suited to the screen,
 * which is exactly the split the requirement asked for.
 *
 * EVERY BLOCK TYPE IS HANDLED
 * ---------------------------
 * The switch is exhaustive over the union and TypeScript enforces it: adding a
 * twelfth block type to the core makes this file fail to compile rather than
 * silently rendering nothing. A missing block would look like a content gap to
 * a reader, which is the failure mode worth making impossible.
 */

const TONE: Record<string, { bg: string; border: string; fg: string; labelAr: string }> = {
  note:    { bg: 'rgba(56,224,224,0.07)',  border: 'rgba(56,224,224,0.28)',  fg: 'var(--accent-ink)', labelAr: 'ملاحظة' },
  tip:     { bg: 'rgba(52,211,153,0.07)',  border: 'rgba(52,211,153,0.28)',  fg: 'var(--sev-ok)', labelAr: 'نصيحة' },
  warning: { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.30)',  fg: 'var(--sev-warning)', labelAr: 'تحذير' },
  danger:  { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.32)', fg: 'var(--sev-blocker)', labelAr: 'خطر' },
  safety:  { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.38)', fg: 'var(--sev-blocker)', labelAr: 'سلامة' },
};

/** Mirrors KbSafetyLevel exactly — there is no 'none' level, absence means none. */
const SAFETY_LABEL_AR: Record<KbSafetyLevel, string> = {
  info: 'انتبه', caution: 'احذر', warning: 'تحذير', critical: 'خطر حرج',
};

const H: React.CSSProperties = {
  fontSize: 14, fontWeight: 900, margin: '0 0 10px', color: 'var(--text)',
};

export const BlockRenderer: React.FC<{ blocks: KbBlock[] }> = ({ blocks }) => (
  <div style={{ display: 'grid', gap: 20 }}>
    {blocks.map((b, i) => <Block key={i} block={b} />)}
  </div>
);

const Block: React.FC<{ block: KbBlock }> = ({ block: b }) => {
  switch (b.type) {
    case 'para':
      return (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 2.05, color: 'var(--text-dim)' }}>
          {b.text}
        </p>
      );

    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul';
      return (
        <div>
          {b.title && <h3 style={H}>{b.title}</h3>}
          <Tag
            style={{
              margin: 0, paddingInlineStart: b.ordered ? 22 : 0,
              listStyle: b.ordered ? 'decimal' : 'none',
              display: 'grid', gap: 8,
            }}
          >
            {b.items.map((it, i) => (
              <li key={i} style={{ fontSize: 14.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>
                {!b.ordered && (
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block', width: 5, height: 5, borderRadius: 999,
                      background: 'var(--accent)', marginInlineEnd: 10, verticalAlign: 'middle',
                    }}
                  />
                )}
                {it}
              </li>
            ))}
          </Tag>
        </div>
      );
    }

    case 'steps':
      return (
        <div>
          {b.title && <h3 style={H}>{b.title}</h3>}
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 14 }}>
            {b.steps.map((s, i) => (
              <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span
                  dir="ltr"
                  aria-hidden
                  style={{
                    width: 24, height: 24, borderRadius: 999, flexShrink: 0, marginTop: 2,
                    background: 'rgba(56,224,224,0.14)', color: 'var(--accent)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>
                    {s.text}
                  </span>
                  {s.note && (
                    <span style={{ display: 'block', fontSize: 13, lineHeight: 1.85, color: 'var(--text-dimmer)', marginTop: 5 }}>
                      {s.note}
                    </span>
                  )}
                  {s.safety && (
                    <span
                      style={{
                        display: 'inline-block', marginTop: 7, padding: '2px 9px',
                        borderRadius: 999, fontSize: 11, fontWeight: 800,
                        background: 'rgba(248,113,113,0.12)', color: 'var(--sev-blocker)',
                      }}
                    >
                      {SAFETY_LABEL_AR[s.safety]}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'table':
      return (
        <figure style={{ margin: 0 }}>
          {b.caption && (
            <figcaption style={{ fontSize: 13, color: 'var(--text-dimmer)', marginBottom: 8 }}>
              {b.caption}
            </figcaption>
          )}
          {/* Wide content scrolls inside its own box; the page never scrolls sideways. */}
          <div className="scroll-x card-sm" style={{ padding: 2 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
              <thead>
                <tr>
                  {b.headers.map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      style={{
                        textAlign: 'start', padding: '10px 13px', fontSize: 12.5,
                        fontWeight: 900, color: 'var(--accent)',
                        borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: '10px 13px', fontSize: 13.5, lineHeight: 1.8,
                          color: 'var(--text-dim)',
                          borderTop: ri === 0 ? 'none' : '1px solid var(--border-soft)',
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );

    case 'callout': {
      const t = TONE[b.tone] ?? TONE.note;
      return (
        <aside
          style={{
            background: t.bg, border: `1px solid ${t.border}`,
            borderRadius: 'var(--radius-sm)', padding: '14px 16px',
          }}
        >
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 900, color: t.fg }}>
            {b.title ?? t.labelAr}
          </p>
          <p style={{ margin: '7px 0 0', fontSize: 14, lineHeight: 1.95, color: 'var(--text-dim)' }}>
            {b.text}
          </p>
        </aside>
      );
    }

    case 'definition':
      return (
        <dl className="card-sm" style={{ margin: 0, padding: '14px 16px' }}>
          <dt style={{ fontSize: 14.5, fontWeight: 900 }}>
            {b.term}
            {b.en && (
              <span className="ltr" style={{ fontSize: 12, color: 'var(--text-dimmer)', marginInlineStart: 9 }}>
                {b.en}
              </span>
            )}
          </dt>
          <dd style={{ margin: '7px 0 0', fontSize: 14, lineHeight: 1.95, color: 'var(--text-dim)' }}>
            {b.text}
          </dd>
        </dl>
      );

    case 'keyvalue':
      return (
        <div>
          {b.caption && <h3 style={H}>{b.caption}</h3>}
          <dl
            className="card-sm"
            style={{
              margin: 0, padding: '6px 4px', display: 'grid',
              gridTemplateColumns: 'minmax(140px, auto) 1fr',
            }}
          >
            {b.pairs.map((p, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <dt
                  style={{
                    padding: '9px 13px', fontSize: 13, color: 'var(--text-dimmer)',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
                  }}
                >
                  {p.k}
                </dt>
                <dd
                  style={{
                    margin: 0, padding: '9px 13px', fontSize: 13.5, fontWeight: 700,
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
                  }}
                >
                  {p.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );

    case 'compare':
      return (
        <figure style={{ margin: 0 }}>
          {b.caption && (
            <figcaption style={{ fontSize: 13, color: 'var(--text-dimmer)', marginBottom: 8 }}>
              {b.caption}
            </figcaption>
          )}
          <div className="scroll-x card-sm" style={{ padding: 2 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 460 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'start', padding: '10px 13px', fontSize: 12.5, fontWeight: 900, color: 'var(--text-dimmer)', borderBottom: '1px solid var(--border)' }}>
                    المحور
                  </th>
                  {b.columns.map((c, i) => (
                    <th
                      key={i}
                      scope="col"
                      style={{
                        textAlign: 'start', padding: '10px 13px', fontSize: 12.5,
                        fontWeight: 900, color: 'var(--accent)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri}>
                    <th
                      scope="row"
                      style={{
                        textAlign: 'start', padding: '10px 13px', fontSize: 13,
                        fontWeight: 800, color: 'var(--text)',
                        borderTop: ri === 0 ? 'none' : '1px solid var(--border-soft)',
                      }}
                    >
                      {r.label}
                    </th>
                    {r.cells.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: '10px 13px', fontSize: 13.5, lineHeight: 1.8,
                          color: 'var(--text-dim)',
                          borderTop: ri === 0 ? 'none' : '1px solid var(--border-soft)',
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );

    case 'faq':
      return (
        <div style={{ display: 'grid', gap: 8 }}>
          {b.items.map((it, i) => (
            // <details> gives keyboard operation, screen-reader semantics and
            // expand/collapse with no JavaScript at all — which also means the
            // answer text is in the HTML a crawler reads.
            <details key={i} className="card-sm" style={{ padding: '12px 15px' }}>
              <summary style={{ fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                {it.q}
              </summary>
              <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.95, color: 'var(--text-dim)' }}>
                {it.a}
              </p>
            </details>
          ))}
        </div>
      );

    case 'checklist':
      return (
        <div>
          {b.title && <h3 style={H}>{b.title}</h3>}
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
            {b.items.map((it, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span
                  aria-hidden
                  style={{
                    width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 4,
                    border: '1.5px solid var(--border)',
                  }}
                />
                <span style={{ fontSize: 14.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'diagram':
      // Diagrams are drawn by phone-specific components. Rather than ship a
      // broken or invented illustration, the web states plainly what the
      // diagram would have shown. An honest gap beats a wrong picture.
      return (
        <figure className="card-sm" style={{ margin: 0, padding: '14px 16px' }}>
          <figcaption style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {b.caption ?? 'رسم توضيحي'}
          </figcaption>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-dimmer)' }}>
            الرسم التوضيحي متاح في تطبيق الهاتف.
          </p>
        </figure>
      );

    default: {
      // Exhaustiveness: a new block type in the core fails the build here
      // rather than silently rendering nothing.
      const _never: never = b;
      void _never;
      return null;
    }
  }
};
