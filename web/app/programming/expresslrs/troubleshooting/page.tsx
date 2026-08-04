import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import {
  troubleshootingIssues, TROUBLESHOOTING_CATEGORIES,
} from '@core/data/expresslrs/troubleshootingIssues';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';
import { DeepLinkOpener } from '@/components/software/DeepLinkOpener';
import { ProjectContextPanel } from '@/components/software/ProjectContextPanel';
import { Block, Links, SimpleSources } from '@/components/software/SoftwareBlocks';

export const metadata: Metadata = {
  title: 'تشخيص أعطال ExpressLRS',
  description:
    'أعطال ExpressLRS بالعرَض لا بالسبب: انعدام الطاقة، وتعذّر الربط، وضعف الإشارة، '
    + 'وأخطاء المنافذ، وفشل التحديث — بفحوص مرتّبة تبدأ من الأقل خطراً.',
  alternates: { canonical: '/programming/expresslrs/troubleshooting' },
  openGraph: { type: 'article', title: 'تشخيص أعطال ExpressLRS — FPV بالعربي' },
};

const APPLICABILITY_AR: Record<string, string> = {
  uart: 'مستقبل خارجي (UART)',
  spi: 'مستقبل مدمج (SPI)',
  both: 'الاثنان',
};

const WARN_COLOR: Record<string, string> = {
  info: 'var(--text-dim)', warning: 'var(--sev-warning)', danger: 'var(--sev-blocker)',
};

const WARN_LABEL_AR: Record<string, string> = {
  info: 'ملاحظة', warning: 'تحذير', danger: 'خطر',
};

const SUB: React.CSSProperties = {
  margin: 0, fontSize: 12.5, fontWeight: 900, color: 'var(--text-dimmer)',
};

/**
 * The ExpressLRS symptom index.
 *
 * ENTERED FROM THE SYMPTOM, NEVER FROM THE CAUSE
 * ----------------------------------------------
 * Every entry is titled with what the reader can SEE — «لا توجد طاقة في
 * المستقبل», «الربط لا يتم» — because a reader who already knew the cause would
 * not be here, and a list organised by cause makes them guess before they can
 * look anything up. Guessing is how a working receiver gets re-flashed.
 *
 * CHECKS ARE ORDERED, AND THE ORDER IS THE SAFETY PROPERTY
 * --------------------------------------------------------
 * Each issue's checks run least-dangerous first: look before you unplug, unplug
 * before you power, power before you arm. They are rendered as an ordered list
 * with each check's own «إن فشل» beside it, so a reader can stop at the step
 * that failed instead of running the whole list and changing five things at once
 * — which leaves them unable to say which change helped.
 *
 * GROUPED BY CATEGORY, ALL IN ONE PAGE
 * ------------------------------------
 * `?issue=` is the address the shared resolver hands out, so every issue has to
 * be openable here. All of them are in the HTML, collapsed; the category index
 * is what makes forty entries navigable without scrolling through them.
 */
export default function ExpressLrsTroubleshooting() {
  const ordered = [...troubleshootingIssues].sort((a, b) => a.order - b.order);
  const entries = ordered.map(i => ({ id: i.id, titleAr: i.title }));
  const byCategory = TROUBLESHOOTING_CATEGORIES.map(c => ({
    category: c,
    issues: ordered.filter(i => i.category === c),
  })).filter(g => g.issues.length > 0);

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 900 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.expresslrs}><span className="ltr">ExpressLRS</span></Link>{' '}
        <span aria-hidden>/</span> التشخيص
      </nav>

      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '14px 0 8px' }}>
        تشخيص أعطال <span className="ltr">ExpressLRS</span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 4px', maxWidth: 760 }}>
        ابدأ من العرَض الذي تراه بعينك، لا من السبب الذي تظنّه.{' '}
        <span dir="ltr">{ordered.length}</span> عطلاً في{' '}
        <span dir="ltr">{byCategory.length}</span> فئة، وفحوص كل عطل مرتّبة من
        الأقل خطراً إلى الأكثر. غيّر شيئاً واحداً في كل مرة، وأعد الاختبار قبل
        التالي — وإلا لن تعرف أيّها أصلح العطل.
      </p>

      <p className="card-sm" style={{ padding: '13px 15px', marginTop: 14, fontSize: 13.5, color: 'var(--sev-blocker)', lineHeight: 2 }}>
        انزع المراوح قبل أي فحص يتضمّن تسليحاً. وافصل البطارية قبل لمس أي توصيل
        كهربائي.
      </p>

      <Suspense fallback={null}>
        <DeepLinkOpener param="issue" prefix="issue-" entries={entries} nounAr="العطل" />
      </Suspense>

      {/* The index: forty titles are only navigable if they are grouped. */}
      <nav className="card-sm" aria-labelledby="elrs-issue-index" data-testid="elrs-issue-index"
        style={{ padding: '15px 17px', marginTop: 18 }}>
        <h2 id="elrs-issue-index" style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>الفئات</h2>
        <div style={{ display: 'grid', gap: 12, marginTop: 11, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {byCategory.map(g => (
            <div key={g.category} style={{ minWidth: 0 }}>
              <h3 style={{ ...SUB, marginBottom: 6 }}>{g.category}</h3>
              <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 4 }}>
                {g.issues.map(i => (
                  <li key={i.id} style={{ fontSize: 12.5, lineHeight: 1.85 }}>
                    <a href={`#issue-${i.id}`}>{i.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {byCategory.map(group => (
        <section key={group.category} className="admin-section" aria-labelledby={`cat-${group.category}`}>
          <h2 id={`cat-${group.category}`}>{group.category}</h2>

          {group.issues.map(issue => (
            <details key={issue.id} id={`issue-${issue.id}`} className="card"
              data-testid={`elrs-issue-${issue.id}`}
              style={{ padding: '4px 18px', marginTop: 12, scrollMarginTop: 18 }}>
              <summary style={{ cursor: 'pointer', padding: '13px 0', fontSize: 14.5, fontWeight: 900 }}>
                {issue.title}
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--text-dimmer)', marginTop: 5, lineHeight: 1.85 }}>
                  {issue.symptom}
                </span>
              </summary>

              <div style={{ paddingBottom: 18 }}>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-dimmer)' }}>
                  ينطبق على: {APPLICABILITY_AR[issue.applicability]}
                </p>

                {issue.safetyWarning && (
                  <p className="card-sm" data-testid={`elrs-issue-warning-${issue.id}`}
                    style={{
                      padding: '11px 13px', marginTop: 12, fontSize: 13, lineHeight: 1.95,
                      color: WARN_COLOR[issue.safetyWarning.level],
                    }}>
                    <strong>{WARN_LABEL_AR[issue.safetyWarning.level]}:</strong>{' '}
                    {issue.safetyWarning.message}
                  </p>
                )}

                <Block titleAr="أسباب محتملة" items={issue.likelyCauses} />

                <section style={{ marginTop: 16 }}>
                  <h3 style={SUB}>الفحوص، بالترتيب</h3>
                  <ol style={{ margin: '8px 0 0', paddingInlineStart: 20, display: 'grid', gap: 12 }}>
                    {issue.checks.map(check => (
                      <li key={check.id} style={{ fontSize: 13.5, lineHeight: 1.95 }}>
                        {check.instruction}
                        <span style={{ display: 'block', marginTop: 5, fontSize: 12.5, color: 'var(--text-dim)' }}>
                          <strong>المتوقّع:</strong> {check.expectedResult}
                        </span>
                        <span style={{ display: 'block', marginTop: 4, fontSize: 12.5, color: 'var(--sev-warning)' }}>
                          <strong>إن لم يتحقق:</strong> {check.ifFailed}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section style={{ marginTop: 16 }}>
                  <h3 style={SUB}>تُعدّ محلولة حين</h3>
                  <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>
                    {issue.resolvedWhen}
                  </p>
                </section>

                <section style={{ marginTop: 16 }}>
                  <h3 style={SUB}>إن بقيت</h3>
                  <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>
                    {issue.nextIfUnresolved}
                  </p>
                </section>

                {issue.links && <Links links={issue.links} />}

                <ProjectContextPanel kind="elrs" entryId={issue.id} />

                <SimpleSources sources={issue.sources} reviewedAt={issue.reviewedAt} />
              </div>
            </details>
          ))}
        </section>
      ))}

      <p style={{ marginTop: 26, fontSize: 13, lineHeight: 1.95 }}>
        <Link href={webHref({ kind: 'elrs-setup' }).href ?? '#'} className="btn-ghost">
          ← عد إلى خطوات الإعداد
        </Link>{' '}
        <Link href={webHref({ kind: 'diagnose' }).href ?? '#'} className="btn-ghost">
          العطل ليس في الرابط؟ ابدأ من التشخيص العام ←
        </Link>
      </p>
    </div>
  );
}
