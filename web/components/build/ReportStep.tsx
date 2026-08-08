'use client';

import { PART_CATEGORY_LABEL_AR } from '@core/data/project/store';
import type { Finding } from '@core/data/project/types';
import { FindingCard } from '@/components/project/FindingCard';
import type { BuildDraft } from '@/lib/build/draft';
import { computeBom, type BomLine } from '@/lib/build/bom';

/**
 * Step 11 — the full-system verdict, rendered by the same card «مشروعي» uses.
 *
 * The findings arrive computed and sorted from the wizard (one memo, one
 * engine); this file renders them and states the gate rule: blockers stop the
 * path. A blocker is the engine saying «proceeding damages hardware» — the
 * wizard treats that sentence as an instruction, not a decoration.
 */
export const CompatReport: React.FC<{
  findings: Finding[];
  blockers: number;
}> = ({ findings, blockers }) => (
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
      <div style={{ display: 'grid', gap: 10 }}>
        {findings.map(f => <FindingCard key={f.id} finding={f} />)}
      </div>
    )}
  </div>
);

const STATUS_LABEL_AR: Record<BomLine['status'], string> = {
  chosen: '',
  external: 'قطعتك — خارج الكتالوج',
  'missing-required': 'ناقصة — مطلوبة للبناء',
  'missing-recommended': 'لم تُختر — موصى بها',
  'skipped-optional': 'لم تُختر — اختيارية',
};

/** Step 12 — the final parts list. */
export const BomView: React.FC<{ draft: BuildDraft }> = ({ draft }) => {
  const bom = computeBom(draft);
  return (
    <div data-testid="build-bom">
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {bom.lines.map(line => (
          <li key={line.category} className="card-sm" data-testid={`bom-${line.category}`}
            style={{ padding: '12px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--text-dimmer)', minWidth: 130 }}>
              {PART_CATEGORY_LABEL_AR[line.category] ?? line.category}
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
