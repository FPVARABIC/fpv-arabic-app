'use client';

import Link from 'next/link';
import { useState } from 'react';
import { webHref } from '@/lib/webRoutes';
import { kbLinkToDestination } from '@core/data/kb/registry';
import {
  SEVERITY_LABEL_AR, CONFIDENCE_LABEL_AR,
  type Finding, type FindingSeverity,
} from '@/lib/project';

/**
 * One compatibility verdict.
 *
 * WHAT IT REFUSES TO DO
 * ---------------------
 * It does not compute anything. Every field shown — the claim, the reasoning,
 * the evidence, the missing data, the manual-check note, the links — comes from
 * `computeFindings` in the shared core. If this component ever contained a
 * comparison, the web would have a second opinion about compatibility, and two
 * opinions is one too many for a judgement that decides whether hardware burns.
 *
 * WHY SEVERITY IS NEVER COLOUR ALONE
 * ----------------------------------
 * Each verdict carries its Arabic word — «مانع», «تحذير», «بيانات ناقصة»,
 * «تم التحقق» — beside the colour, and the badge shape does not change. A
 * blocker must still read as a blocker in monochrome, to a colour-blind reader,
 * and in a screenshot pasted into a message.
 *
 * WHY «بيانات ناقصة» IS ITS OWN SEVERITY AND NOT A QUIET «ok»
 * -----------------------------------------------------------
 * Because silence about a missing spec reads as approval. The core models it as
 * a distinct severity precisely so this card can say "we could not check this,
 * and here is what we would need" instead of nothing.
 */

const SEVERITY_STYLE: Record<FindingSeverity, { cls: string; icon: string }> = {
  blocker: { cls: 'admin-badge admin-badge-bad', icon: '⛔' },
  warning: { cls: 'admin-badge admin-badge-warn', icon: '⚠' },
  unknown: { cls: 'admin-badge', icon: '؟' },
  ok: { cls: 'admin-badge admin-badge-ok', icon: '✓' },
};

export const FindingCard: React.FC<{ finding: Finding; defaultOpen?: boolean }> = ({
  finding, defaultOpen,
}) => {
  // Blockers open by default: the whole point of the severity is that it must
  // not be something a reader has to go looking for.
  const [open, setOpen] = useState(defaultOpen ?? finding.severity === 'blocker');
  const style = SEVERITY_STYLE[finding.severity];

  return (
    <article
      className="card-sm"
      data-testid={`finding-${finding.id}`}
      data-severity={finding.severity}
      style={{ padding: '14px 16px' }}
    >
      <header style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span className={style.cls} data-testid={`finding-severity-${finding.id}`}>
          <span aria-hidden>{style.icon}</span> {SEVERITY_LABEL_AR[finding.severity]}
        </span>
        <h3 style={{ flex: 1, minWidth: 200, margin: 0, fontSize: 14.5, fontWeight: 800, lineHeight: 1.8 }}>
          {finding.claimAr}
        </h3>
      </header>

      {/* Confidence is always visible, not hidden behind the disclosure: a
          reader deciding what to do needs to know whether this is arithmetic on
          two documented numbers or an inference. */}
      <p style={{ margin: '9px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.8 }}>
        {CONFIDENCE_LABEL_AR[finding.confidence]}
      </p>

      <button
        type="button"
        className="btn-ghost"
        data-testid={`finding-toggle-${finding.id}`}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{ marginTop: 10, fontSize: 12.5 }}
      >
        {open ? 'أخفِ التفاصيل' : 'لماذا هذا الحكم؟'}
      </button>

      {open && (
        <div data-testid={`finding-detail-${finding.id}`} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          <Section titleAr="السبب">
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>
              {finding.whyAr}
            </p>
          </Section>

          {finding.evidenceAr.length > 0 && (
            <Section titleAr="البيانات المستخدمة">
              <ul style={LIST}>
                {finding.evidenceAr.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </Section>
          )}

          {finding.missingAr.length > 0 && (
            <Section titleAr="البيانات الناقصة">
              <ul style={LIST} data-testid={`finding-missing-${finding.id}`}>
                {finding.missingAr.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </Section>
          )}

          {finding.manualCheckAr && (
            <Section titleAr="يحتاج دليل الشركة">
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.95, color: 'var(--sev-warning)' }}>
                {finding.manualCheckAr}
              </p>
            </Section>
          )}

          {finding.actionsAr.length > 0 && (
            <Section titleAr="الإجراء التالي">
              <ul style={LIST} data-testid={`finding-actions-${finding.id}`}>
                {finding.actionsAr.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </Section>
          )}

          {finding.links.length > 0 && (
            <Section titleAr="اذهب إلى">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {finding.links.map((l, i) => {
                  // The destination is resolved through the shared resolver and
                  // the web adapter — never a path written here. That is what
                  // lets one link table serve the phone and the web, and it is
                  // what a future assistant will use to OPEN these places
                  // rather than describe them.
                  const dest = kbLinkToDestination(l);
                  const resolved = dest ? webHref(dest) : { href: null };
                  if (resolved.href) {
                    return (
                      <Link key={i} href={resolved.href} className="btn-ghost"
                        data-testid={`finding-link-${finding.id}-${i}`}>
                        {l.label} ←
                      </Link>
                    );
                  }
                  // A destination that is real but lives only in the phone app
                  // says so. A destination that resolves to nothing renders
                  // nothing at all rather than a dead anchor.
                  return resolved.unavailableReasonAr
                    ? (
                      <span key={i} className="admin-badge" data-testid={`finding-link-phoneonly-${finding.id}-${i}`}>
                        {l.label} — {resolved.unavailableReasonAr}
                      </span>
                    )
                    : null;
                })}
              </div>
            </Section>
          )}
        </div>
      )}
    </article>
  );
};

const LIST: React.CSSProperties = {
  margin: 0, paddingInlineStart: 20, fontSize: 13.5,
  lineHeight: 1.95, color: 'var(--text-dim)', display: 'grid', gap: 4,
};

const Section: React.FC<{ titleAr: string; children: React.ReactNode }> = ({ titleAr, children }) => (
  <div>
    <h4 style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 900, color: 'var(--text-dimmer)' }}>
      {titleAr}
    </h4>
    {children}
  </div>
);
