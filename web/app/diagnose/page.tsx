import Link from 'next/link';
import type { Metadata } from 'next';
import { allDxTrees } from '@core/data/kb/diagnostics/trees';
import { getModule } from '@core/data/kb/registry';
import { DX_RISK_LABEL_AR, type DxRisk } from '@core/data/kb/diagnostics/types';
import { href } from '@/lib/webRoutes';

export const metadata: Metadata = {
  title: 'التشخيص',
  description:
    'ابدأ من العرَض الذي تراه: لا صورة، لا اتصال، المحرك يسخن، الصورة تتقطّع. '
    + 'كل شجرة تبدأ بالفحص الأقل خطراً وتقول متى تتوقف.',
  alternates: { canonical: '/diagnose' },
};

const RISK_COLOR: Record<DxRisk, string> = {
  low: 'var(--sev-ok)',
  medium: 'var(--sev-warning)',
  high: 'var(--sev-warning)',
  critical: 'var(--sev-blocker)',
};

/**
 * The diagnostics index — organised by the system the fault belongs to.
 *
 * Grouped by module rather than listed flat because a reader arrives knowing
 * roughly WHERE the problem is ("something about the video") far more often
 * than they know its name. The safety posture of each tree — battery out, props
 * off, risk level — is shown here, before the reader opens anything, so the
 * warning is never something they meet halfway through a procedure.
 */
export default function DiagnoseIndexPage() {
  const byModule = new Map<string, typeof allDxTrees>();
  for (const t of allDxTrees) {
    const list = byModule.get(t.moduleId) ?? [];
    list.push(t);
    byModule.set(t.moduleId, list);
  }

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 20 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span> التشخيص
      </nav>

      <h1 style={{ fontSize: 30, fontWeight: 900, margin: '14px 0 10px' }}>التشخيص</h1>
      <p style={{ fontSize: 15, color: 'var(--text-dim)', maxWidth: 760, lineHeight: 1.95, margin: 0 }}>
        ابدأ من العرَض كما تراه أنت، لا من اسم القطعة. كل شجرة ترتّب فحوصها من الأقل خطراً
        إلى الأكثر، وتقول لك في كل نتيجة ما الذي تعنيه، ومتى تتوقف بدل أن تكمل التخمين.
      </p>

      <aside
        className="card"
        style={{
          padding: '15px 17px', marginTop: 22, maxWidth: 760,
          borderColor: 'rgba(248,113,113,0.32)', background: 'rgba(248,113,113,0.06)',
        }}
      >
        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'var(--sev-blocker)' }}>قبل أي فحص</p>
        <p style={{ margin: '7px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
          انزع المراوح قبل توصيل البطارية في أي فحص أرضي. وإن شممت رائحة احتراق أو رأيت
          دخاناً، افصل البطارية فوراً ولا تكمل.
        </p>
      </aside>

      {[...byModule.entries()].map(([moduleId, trees]) => {
        const m = getModule(moduleId);
        return (
          <section key={moduleId} style={{ marginTop: 38 }} data-testid={`dx-group-${moduleId}`}>
            <h2 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 14px' }}>
              {m?.titleAr ?? moduleId}
            </h2>
            <div
              style={{
                display: 'grid', gap: 11,
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
              }}
            >
              {trees.map(t => {
                const to = href({ kind: 'dx', id: t.id });
                if (!to) return null;
                return (
                  <Link
                    key={t.id}
                    href={to}
                    className="card-sm"
                    data-testid={`dx-tree-${t.id}`}
                    style={{ display: 'block', padding: '15px 17px' }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 10.5, fontWeight: 800, color: RISK_COLOR[t.risk],
                          border: `1px solid ${RISK_COLOR[t.risk]}`, borderRadius: 999,
                          padding: '1px 9px',
                        }}
                      >
                        {DX_RISK_LABEL_AR[t.risk]}
                      </span>
                      {t.removeProps && (
                        <span style={{ fontSize: 10.5, color: 'var(--sev-blocker)', fontWeight: 700 }}>
                          المراوح منزوعة
                        </span>
                      )}
                      {t.disconnectBattery && (
                        <span style={{ fontSize: 10.5, color: 'var(--sev-blocker)', fontWeight: 700 }}>
                          البطارية مفصولة
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: '9px 0 0' }}>{t.titleAr}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '7px 0 0', lineHeight: 1.85 }}>
                      {t.symptomAr}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
