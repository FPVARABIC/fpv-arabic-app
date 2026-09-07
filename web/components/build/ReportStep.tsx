'use client';

import { useState } from 'react';
import type { Finding } from '@core/data/project/types';
import { FindingCard } from '@/components/project/FindingCard';
import type { BuildDraft } from '@/lib/build/draft';
import { computeBom, type BomLine } from '@/lib/build/bom';
import { partLabel } from '@/lib/build/labels';

/**
 * Step 11 — the full-system verdict, rendered by the same card «مشروعي» uses.
 *
 * The findings arrive computed and sorted from the wizard (one memo, one
 * engine); this file renders them GROUPED BY WHAT THE READER MUST DO:
 * blockers to fix, warnings to weigh, gaps to verify by hand — and the
 * passed checks folded under their count, because eleven green cards ahead
 * of one red one buries the only sentence that matters. A blocker is the
 * engine saying «proceeding damages hardware» — the wizard treats that
 * sentence as an instruction, not a decoration.
 */

const SEVERITY_GROUPS = [
  { sev: 'blocker', titleAr: 'موانع — تُحل قبل المتابعة', color: 'var(--sev-blocker)' },
  { sev: 'warning', titleAr: 'تحذيرات — راجعها قبل الشراء', color: 'var(--sev-warning)' },
  { sev: 'unknown', titleAr: 'بيانات ناقصة — تحقق يدوي مطلوب', color: 'var(--text-dim)' },
] as const;

export const CompatReport: React.FC<{
  findings: Finding[];
  blockers: number;
}> = ({ findings, blockers }) => {
  const okFindings = findings.filter(f => f.severity === 'ok');
  const attention = findings.filter(f => f.severity !== 'ok');
  const [showOk, setShowOk] = useState(false);
  // With nothing demanding attention, the passed checks ARE the report.
  const okOpen = showOk || attention.length === 0;

  return (
    <div data-testid="build-compat-report">
      {blockers > 0 && (
        <p role="alert" data-testid="build-compat-blocked" className="card-sm" style={{
          padding: '13px 15px', margin: '0 0 14px', fontSize: 13.5,
          color: 'var(--sev-blocker)', lineHeight: 1.95,
        }}>
          يوجد <span dir="ltr">{blockers}</span> مانع. عد إلى الخطوات السابقة وبدّل
          القطعة المعنيّة — المانع يعني أن المتابعة تُتلف قطعاً أو لا تعمل أصلاً،
          ولا يفتح «التالي» قبل معالجته.
        </p>
      )}
      {findings.length === 0 ? (
        <p className="card-sm" style={{ padding: '14px 16px', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          لا أحكام بعد — اختر القطع الأساسية أولاً ليقرأها المحرك.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {attention.length === 0 && (
            <p className="card-sm" data-testid="compat-all-clear" style={{
              padding: '13px 15px', margin: 0, fontSize: 13.5,
              color: 'var(--sev-ok)', lineHeight: 1.95,
            }}>
              لا موانع ولا تحذيرات — كل ما استطاع المحرك الحكم عليه من قطعك متوافق.
            </p>
          )}
          {SEVERITY_GROUPS.map(g => {
            const group = findings.filter(f => f.severity === g.sev);
            if (group.length === 0) return null;
            return (
              <section key={g.sev} data-testid={`compat-group-${g.sev}`}>
                <h3 style={{ fontSize: 13.5, fontWeight: 900, margin: '0 0 9px', color: g.color }}>
                  {g.titleAr} <span dir="ltr">({group.length})</span>
                </h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {group.map(f => <FindingCard key={f.id} finding={f} />)}
                </div>
              </section>
            );
          })}
          {okFindings.length > 0 && (
            <section data-testid="compat-group-ok">
              <button type="button" className="btn-ghost" aria-expanded={okOpen}
                data-testid="compat-show-ok"
                onClick={() => setShowOk(o => !o)}
                style={{ fontSize: 12.5 }}>
                {okOpen
                  ? 'أخفِ الفحوص الناجحة'
                  : <>✓ تم التحقق <span dir="ltr">({okFindings.length})</span> — اعرض التفاصيل</>}
              </button>
              {okOpen && (
                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  {okFindings.map(f => <FindingCard key={f.id} finding={f} />)}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const STATUS_LABEL_AR: Record<BomLine['status'], string> = {
  chosen: '',
  external: 'قطعتك — خارج الكتالوج',
  'missing-required': 'ناقصة — مطلوبة للبناء',
  'missing-recommended': 'لم تُختر — موصى بها',
  'skipped-optional': 'لم تُختر — اختيارية',
};

/** Decisions first, gaps right after them, deferrals last. */
const STATUS_RANK: Record<BomLine['status'], number> = {
  chosen: 0,
  external: 1,
  'missing-required': 2,
  'missing-recommended': 3,
  'skipped-optional': 4,
};

/** Step 12 — the final parts list. */
export const BomView: React.FC<{ draft: BuildDraft }> = ({ draft }) => {
  const bom = computeBom(draft);
  const lines = [...bom.lines].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  const count = (s: BomLine['status']) => lines.filter(l => l.status === s).length;

  return (
    <div data-testid="build-bom">
      {/* The list's state before the list — what is settled, what is not. */}
      <div data-testid="bom-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <span className="admin-badge admin-badge-ok">✓ {count('chosen')} مختارة</span>
        {count('external') > 0 && (
          <span className="admin-badge admin-badge-warn">◈ {count('external')} قطعك (خارج الكتالوج)</span>
        )}
        {count('missing-required') > 0 && (
          <span className="admin-badge admin-badge-bad">⛔ {count('missing-required')} ناقصة — مطلوبة</span>
        )}
        {count('missing-recommended') > 0 && (
          <span className="admin-badge">○ {count('missing-recommended')} موصى بها لم تُختر</span>
        )}
        {count('skipped-optional') > 0 && (
          <span className="admin-badge">○ {count('skipped-optional')} اختيارية</span>
        )}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {lines.map(line => (
          <li key={line.category} className="card-sm" data-testid={`bom-${line.category}`}
            style={{ padding: '12px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dimmer)', minWidth: 130 }}>
              {partLabel(line.category)}
            </span>
            {line.part ? (
              <>
                <span style={{ fontWeight: 800, fontSize: 13.5, flex: 1, minWidth: 140 }}>
                  {line.part.nameAr}
                  <span dir="ltr" style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                    {' '}{line.part.nameEn}
                  </span>
                </span>
                {line.part.priceRangeUSD ? (
                  <span dir="ltr" style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                    ${line.part.priceRangeUSD[0]}–${line.part.priceRangeUSD[1]}
                  </span>
                ) : (
                  <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>بلا سعر موثق</span>
                )}
              </>
            ) : line.status === 'external' ? (
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>
                {line.externalName}
                <span style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--sev-warning)' }}>
                  {' '}— {STATUS_LABEL_AR.external}
                </span>
              </span>
            ) : (
              <span style={{
                fontSize: 13,
                color: line.status === 'missing-required' ? 'var(--sev-blocker)' : 'var(--text-dim)',
              }}>
                {STATUS_LABEL_AR[line.status]}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="card" data-testid="bom-total" style={{ marginTop: 14, padding: '14px 16px' }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>
          مجموع الأسعار الموثقة:{' '}
          <span dir="ltr">${bom.priceMinUSD}–${bom.priceMaxUSD}</span>
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.9 }}>
          {bom.unpricedCount > 0 && (
            <>يوجد <span dir="ltr">{bom.unpricedCount}</span> قطعة مختارة بلا سعر موثق — المجموع أعلاه لا يشملها. </>
          )}
          {bom.missingRequiredCount > 0 && (
            <>ولا يزال ينقصك <span dir="ltr">{bom.missingRequiredCount}</span> من القطع المطلوبة. </>
          )}
          الأسعار مدى موثق من وقت المراجعة، لا عرض بيع — تتغير بين المتاجر والشحن.
        </p>
      </div>
    </div>
  );
};
