'use client';

import Link from 'next/link';
import type { Finding } from '@core/data/project/types';
import { countFindings } from '@core/data/project/verdicts';
import type { BuildDraft } from '@/lib/build/draft';
import { draftParts } from '@/lib/build/draft';
import { TOTAL_BUILD_STEPS, GATE_STEP_IDS, BUILD_PATH } from '@/lib/build/path';
import { SAFETY_GATES } from '@/lib/build/gates';
import { REQUIRED_CATEGORIES, RECOMMENDED_CATEGORIES } from '@/lib/build/bom';
import { partLabelAr } from '@/lib/build/labels';

/**
 * «بناءي» — the anchor that follows the reader through the wizard.
 *
 * It computes nothing. Parts come from the draft, verdict counts from the
 * engine's own `countFindings`, gate progress from the draft's confirmations.
 * The panel is a mirror, and the full workspace it links to («مشروعي») is
 * the same data through the same one store — not a second copy.
 *
 * ONE BODY, TWO HOMES
 * -------------------
 * On a desktop the body lives in the sticky side column. On a phone that
 * column would either shove the step's content down or cover it — so the
 * wizard docks a compact chip at the bottom instead and opens THIS SAME BODY
 * as a sheet above it (see the dock in BuildWizard). One component means the
 * two homes cannot drift apart about what «بناءي» says.
 */

/** The at-a-glance numbers the dock chip shows — derived, never stored. */
export function buildPulse(draft: BuildDraft, findings: Finding[]) {
  const parts = draftParts(draft);
  const requiredDone = REQUIRED_CATEGORIES
    .filter(c => parts[c] || draft.externalParts[c]).length;
  const counts = countFindings(findings);
  return {
    requiredDone,
    requiredTotal: REQUIRED_CATEGORIES.length,
    blockers: counts.blocker,
    warnings: counts.warning,
  };
}

export const MyBuildPanel: React.FC<{
  draft: BuildDraft;
  findings: Finding[];
}> = ({ draft, findings }) => (
  <aside className="card mybuild-aside" data-testid="my-build-panel" style={{ padding: '16px 18px' }}>
    <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>بناءي</h2>
    <MyBuildBody draft={draft} findings={findings} />
  </aside>
);

export const MyBuildBody: React.FC<{
  draft: BuildDraft;
  findings: Finding[];
}> = ({ draft, findings }) => {
  const parts = draftParts(draft);
  const chosen = Object.keys(parts);
  const external = Object.keys(draft.externalParts);
  const missing = REQUIRED_CATEGORIES.filter(c => !parts[c] && !draft.externalParts[c]);
  const counts = countFindings(findings);
  const nextStep = BUILD_PATH[draft.stepIndex + 1];

  const gateTotal = SAFETY_GATES.reduce((n, g) => n + g.items.length, 0);
  const gateDone = GATE_STEP_IDS.reduce(
    (n, id) => n + (draft.gateChecks[id]?.length ?? 0), 0);

  return (
    <div>
      <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)' }}>
        الخطوة <span dir="ltr">{draft.stepIndex + 1}</span> من{' '}
        <span dir="ltr">{TOTAL_BUILD_STEPS}</span>
        {draft.experience && (
          <> · {draft.experience === 'beginner' ? 'مبتدئ' : draft.experience === 'intermediate' ? 'متوسط' : 'متقدم'}</>
        )}
        {draft.tierPref && (
          <> · {draft.tierPref === 'budget' ? 'ميزانية اقتصادية' : draft.tierPref === 'mid' ? 'ميزانية متوازنة' : 'Premium'}</>
        )}
      </p>

      {/* Verdict counts — the compatibility state at a glance. */}
      <div data-testid="my-build-verdicts" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 11 }}>
        {counts.blocker > 0 && (
          <span className="admin-badge admin-badge-bad">⛔ {counts.blocker} مانع</span>
        )}
        {counts.warning > 0 && (
          <span className="admin-badge admin-badge-warn">⚠ {counts.warning} تحذير</span>
        )}
        {counts.unknown > 0 && (
          <span className="admin-badge">؟ {counts.unknown} بيانات ناقصة</span>
        )}
        {counts.ok > 0 && (
          <span className="admin-badge admin-badge-ok">✓ {counts.ok} تم التحقق</span>
        )}
        {findings.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-dimmer)' }}>
            الأحكام تظهر مع أول قطعتين مترابطتين
          </span>
        )}
      </div>

      {/* The chosen and the missing. */}
      <ul data-testid="my-build-parts" style={{
        listStyle: 'none', margin: '12px 0 0', padding: 0,
        display: 'grid', gap: 5, fontSize: 12.5, lineHeight: 1.8,
      }}>
        {chosen.map(c => (
          <li key={c} style={{ display: 'flex', gap: 6 }}>
            <span aria-hidden style={{ color: 'var(--sev-ok)' }}>✓</span>
            <span style={{ color: 'var(--text-dimmer)' }}>{partLabelAr(c)}:</span>
            <span style={{ fontWeight: 700, minWidth: 0 }}>{parts[c].nameAr}</span>
          </li>
        ))}
        {external.map(c => (
          <li key={c} style={{ display: 'flex', gap: 6 }}>
            <span aria-hidden style={{ color: 'var(--sev-warning)' }}>◈</span>
            <span style={{ color: 'var(--text-dimmer)' }}>{partLabelAr(c)}:</span>
            <span style={{ fontWeight: 700 }}>{draft.externalParts[c]} <small>(خارج الكتالوج)</small></span>
          </li>
        ))}
        {missing.map(c => (
          <li key={c} style={{ display: 'flex', gap: 6, color: 'var(--text-dim)' }}>
            <span aria-hidden>○</span>
            <span>{partLabelAr(c)} — لم تُختر بعد</span>
          </li>
        ))}
        {RECOMMENDED_CATEGORIES.filter(c => !parts[c] && !draft.externalParts[c]).map(c => (
          <li key={c} style={{ display: 'flex', gap: 6, color: 'var(--text-dimmer)' }}>
            <span aria-hidden>○</span>
            <span>{partLabelAr(c)} — موصى بها</span>
          </li>
        ))}
      </ul>

      {/* Safety progress — confirmations, not vibes. */}
      <p data-testid="my-build-gates" style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
        فحوص السلامة المؤكدة: <span dir="ltr">{gateDone}/{gateTotal}</span>
      </p>

      {/* Where the journey goes next — the anchor answers «ثم ماذا؟» itself. */}
      <p data-testid="my-build-next" style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
        {nextStep
          ? <>وجهتك التالية: <b>{nextStep.titleAr}</b></>
          : <>هذه آخر خطوة — بعدها يفتح «مشروعي» على بنائك.</>}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 13 }}>
        <Link href="/project" className="btn-ghost" data-testid="my-build-open-project"
          style={{ fontSize: 12.5 }}>
          مساحة العمل الكاملة (مشروعي) ←
        </Link>
      </div>
    </div>
  );
};
