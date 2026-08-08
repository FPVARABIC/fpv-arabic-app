'use client';

import Link from 'next/link';
import { PART_CATEGORY_LABEL_AR } from '@core/data/project/store';
import type { Finding } from '@core/data/project/types';
import { countFindings } from '@core/data/project/verdicts';
import type { BuildDraft } from '@/lib/build/draft';
import { draftParts } from '@/lib/build/draft';
import { TOTAL_BUILD_STEPS, GATE_STEP_IDS } from '@/lib/build/path';
import { SAFETY_GATES } from '@/lib/build/gates';
import { REQUIRED_CATEGORIES, RECOMMENDED_CATEGORIES } from '@/lib/build/bom';

/**
 * «بناءي» — the live summary that follows the reader through the wizard.
 *
 * It computes nothing. Parts come from the draft, verdict counts from the
 * engine's own `countFindings`, gate progress from the draft's confirmations.
 * The panel is a mirror, and the full workspace it links to («مشروعي») is
 * the same data through the same one store — not a second copy.
 */
export const MyBuildPanel: React.FC<{
  draft: BuildDraft;
  findings: Finding[];
}> = ({ draft, findings }) => {
  const parts = draftParts(draft);
  const chosen = Object.keys(parts);
  const external = Object.keys(draft.externalParts);
  const missing = REQUIRED_CATEGORIES.filter(c => !parts[c] && !draft.externalParts[c]);
  const counts = countFindings(findings);

  const gateTotal = SAFETY_GATES.reduce((n, g) => n + g.items.length, 0);
  const gateDone = GATE_STEP_IDS.reduce(
    (n, id) => n + (draft.gateChecks[id]?.length ?? 0), 0);

  return (
    <aside className="card" data-testid="my-build-panel" style={{ padding: '16px 18px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>بناءي</h2>
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
            <span style={{ color: 'var(--text-dimmer)' }}>{PART_CATEGORY_LABEL_AR[c] ?? c}:</span>
            <span style={{ fontWeight: 700, minWidth: 0 }}>{parts[c].nameAr}</span>
          </li>
        ))}
        {external.map(c => (
          <li key={c} style={{ display: 'flex', gap: 6 }}>
            <span aria-hidden style={{ color: 'var(--sev-warning)' }}>◈</span>
            <span style={{ color: 'var(--text-dimmer)' }}>{PART_CATEGORY_LABEL_AR[c] ?? c}:</span>
            <span style={{ fontWeight: 700 }}>{draft.externalParts[c]} <small>(خارج الكتالوج)</small></span>
          </li>
        ))}
        {missing.map(c => (
          <li key={c} style={{ display: 'flex', gap: 6, color: 'var(--text-dim)' }}>
            <span aria-hidden>○</span>
            <span>{PART_CATEGORY_LABEL_AR[c] ?? c} — لم تُختر بعد</span>
          </li>
        ))}
        {RECOMMENDED_CATEGORIES.filter(c => !parts[c] && !draft.externalParts[c]).map(c => (
          <li key={c} style={{ display: 'flex', gap: 6, color: 'var(--text-dimmer)' }}>
            <span aria-hidden>○</span>
            <span>{PART_CATEGORY_LABEL_AR[c] ?? c} — موصى بها</span>
          </li>
        ))}
      </ul>

      {/* Safety progress — confirmations, not vibes. */}
      <p data-testid="my-build-gates" style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
        فحوص السلامة المؤكدة: <span dir="ltr">{gateDone}/{gateTotal}</span>
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 13 }}>
        <Link href="/project" className="btn-ghost" data-testid="my-build-open-project"
          style={{ fontSize: 12.5 }}>
          مساحة العمل الكاملة (مشروعي) ←
        </Link>
      </div>
    </aside>
  );
};
