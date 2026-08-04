import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { allDxTrees, getDxTree } from '@core/data/kb/diagnostics/trees';
import {
  DX_RISK_LABEL_AR, DX_CHECK_CLASS_LABEL_AR, type DxRisk,
} from '@core/data/kb/diagnostics/types';
import { href } from '@/lib/webRoutes';
import { ContentLink } from '@/components/ContentLink';

/**
 * One diagnostic tree, rendered whole.
 *
 * WHY THE WHOLE TREE, NOT ONE NODE AT A TIME
 * ------------------------------------------
 * The phone walks you through node by node, because a 390px screen at a
 * workbench can hold one question. A desktop can hold the shape of the entire
 * procedure — and seeing it whole is genuinely better here: a reader can tell
 * before starting whether their symptom is even in this tree, can jump to the
 * check that matches what they already know, and can read the stop conditions
 * without reaching them the hard way.
 *
 * That is the same content in a layout the wider screen earns, which is exactly
 * what the requirement asked for. Not one word of it is written here.
 *
 * SAFETY IS RENDERED FIRST, ALWAYS
 * --------------------------------
 * Risk level, battery state, props state and the quick checks all appear ABOVE
 * the first node. A procedure whose warning arrives at step four has already
 * failed the reader who started at step one.
 */

export function generateStaticParams() {
  return allDxTrees.map(t => ({ treeId: t.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ treeId: string }> },
): Promise<Metadata> {
  const { treeId } = await params;
  const t = getDxTree(treeId);
  if (!t) return { title: 'غير موجود' };
  return {
    title: t.titleAr,
    description: t.symptomAr,
    keywords: t.aliases,
    alternates: { canonical: href({ kind: 'dx', id: t.id }) ?? undefined },
    openGraph: { type: 'article', title: `${t.titleAr} — FPVARABIC`, description: t.symptomAr },
  };
}

const RISK_COLOR: Record<DxRisk, string> = {
  low: 'var(--sev-ok)',
  medium: 'var(--sev-warning)',
  high: 'var(--sev-warning)',
  critical: 'var(--sev-blocker)',
};

export default async function DiagnoseTreePage(
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const t = getDxTree(treeId);
  if (!t) notFound();

  return (
    <div className="shell" style={{ paddingTop: 32, paddingBottom: 20, maxWidth: 900 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href="/diagnose">التشخيص</Link> <span aria-hidden>/</span> {t.titleAr}
      </nav>

      <header style={{ marginTop: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, lineHeight: 1.45 }}>{t.titleAr}</h1>
        <p style={{ fontSize: 15.5, color: 'var(--text-dim)', margin: '12px 0 0', lineHeight: 2 }}>
          {t.symptomAr}
        </p>
      </header>

      {/* ── Safety, before anything else ────────────────────────────────── */}
      <section
        aria-labelledby="safety-h"
        className="card"
        style={{
          marginTop: 22, padding: '17px 19px',
          borderColor: 'rgba(248,113,113,0.32)', background: 'rgba(248,113,113,0.06)',
        }}
      >
        <h2 id="safety-h" style={{ fontSize: 14, fontWeight: 900, margin: 0, color: 'var(--sev-blocker)' }}>
          قبل أن تبدأ
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '11px 0 0' }}>
          <span
            style={{
              fontSize: 11, fontWeight: 800, color: RISK_COLOR[t.risk],
              border: `1px solid ${RISK_COLOR[t.risk]}`, borderRadius: 999, padding: '2px 11px',
            }}
          >
            {DX_RISK_LABEL_AR[t.risk]}
          </span>
          {t.disconnectBattery && (
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sev-blocker)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 999, padding: '2px 11px' }}>
              افصل البطارية
            </span>
          )}
          {t.removeProps && (
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sev-blocker)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 999, padding: '2px 11px' }}>
              انزع المراوح
            </span>
          )}
        </div>
        <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 8 }}>
          {t.quickChecks.map((c, i) => (
            <li key={i} style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9, display: 'flex', gap: 9 }}>
              <span aria-hidden style={{ color: 'var(--sev-blocker)', flexShrink: 0 }}>—</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── The tree ────────────────────────────────────────────────────── */}
      <section aria-labelledby="nodes-h" style={{ marginTop: 34 }}>
        <h2 id="nodes-h" style={{ fontSize: 20, fontWeight: 900, margin: '0 0 16px' }}>
          خطوات الفحص
        </h2>
        <div style={{ display: 'grid', gap: 16 }}>
          {t.nodes.map((n, ni) => (
            <article
              key={n.id}
              id={`node-${n.id}`}
              className="card"
              data-testid={`dx-node-${n.id}`}
              style={{ padding: '18px 20px', scrollMarginTop: 80 }}
            >
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  dir="ltr"
                  style={{
                    fontSize: 11, fontWeight: 900, color: 'var(--accent-ink)',
                    background: 'rgba(56,224,224,0.12)', borderRadius: 999, padding: '2px 10px',
                  }}
                >
                  {ni + 1}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-dimmer)', fontWeight: 700 }}>
                  {DX_CHECK_CLASS_LABEL_AR[n.checkClass]}
                </span>
              </div>

              <h3 style={{ fontSize: 16.5, fontWeight: 900, margin: '11px 0 0' }}>{n.question}</h3>

              <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '11px 0 0', lineHeight: 1.95 }}>
                {n.how}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '9px 0 0', lineHeight: 1.85 }}>
                <strong style={{ color: 'var(--sev-ok)' }}>السليم يبدو هكذا:</strong> {n.expected}
              </p>

              {n.safetyNote && (
                <p
                  style={{
                    margin: '11px 0 0', padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(248,113,113,0.09)', border: '1px solid rgba(248,113,113,0.3)',
                    fontSize: 13, color: 'var(--sev-blocker)', lineHeight: 1.85,
                  }}
                >
                  {n.safetyNote}
                </p>
              )}

              <ul style={{ listStyle: 'none', margin: '15px 0 0', padding: 0, display: 'grid', gap: 11 }}>
                {n.outcomes.map(o => (
                  <li
                    key={o.id}
                    className="card-sm"
                    style={{
                      padding: '13px 15px',
                      borderColor: o.likelyDamaged ? 'rgba(248,113,113,0.32)' : undefined,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
                      {o.label}
                      {o.likelyDamaged && (
                        <span style={{ fontSize: 10.5, color: 'var(--sev-blocker)', marginInlineStart: 9, fontWeight: 800 }}>
                          يُرجَّح تلف القطعة
                        </span>
                      )}
                    </p>
                    <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                      {o.meaning}
                    </p>
                    {o.next && (
                      <p style={{ margin: '8px 0 0', fontSize: 12.5 }}>
                        <a href={`#node-${o.next}`} style={{ color: 'var(--accent-ink)' }}>
                          انتقل إلى الفحص التالي ←
                        </a>
                      </p>
                    )}
                    {o.conclusion && (
                      <>
                        <p style={{ margin: '9px 0 0', fontSize: 13.5, fontWeight: 700, color: 'var(--sev-ok)' }}>
                          {o.conclusion}
                        </p>
                        {o.actions && o.actions.length > 0 && (
                          <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
                            {o.actions.map((act, ai) => (
                              <li key={ai} style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85, display: 'flex', gap: 8 }}>
                                <span aria-hidden style={{ color: 'var(--accent-ink)' }}>←</span>
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="stop-h" style={{ marginTop: 34 }}>
        <h2 id="stop-h" style={{ fontSize: 20, fontWeight: 900, margin: '0 0 14px' }}>متى تتوقف</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 9 }}>
          {t.stopConditions.map((c, i) => (
            <li
              key={i}
              className="card-sm"
              style={{ padding: '12px 15px', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9, borderColor: 'rgba(251,191,36,0.28)' }}
            >
              {c}
            </li>
          ))}
        </ul>
      </section>

      {t.links.length > 0 && (
        <section aria-labelledby="dx-links-h" style={{ marginTop: 34 }}>
          <h2 id="dx-links-h" style={{ fontSize: 20, fontWeight: 900, margin: '0 0 14px' }}>اذهب من هنا</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {/* Resolved through the WEB adapter, not the shared resolver — see
                the note in ContentLink. Calling `resolveLinkRoute` here is what
                produced live links to `/lessons/:id`, a route this surface has
                never had. */}
            {t.links.map((l, i) => (
              <ContentLink key={`${l.kind}-${l.targetId ?? i}`} link={l} testIdPrefix="dx-link" index={i} />
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: 34 }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 12px' }}>المصادر</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {t.sources.map((s, i) => (
            <li key={i} style={{ fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
              {s.title} — {s.version} · روجِع {s.reviewedAt}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', marginTop: 10 }}>
          روجعت هذه الشجرة في {t.lastReviewed}.
        </p>
      </section>

      {href({ kind: 'diagnose' }) && (
        <p style={{ marginTop: 30 }}>
          <Link href="/diagnose" className="btn-ghost">← كل الأعراض</Link>
        </p>
      )}
    </div>
  );
}
