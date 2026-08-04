import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { setupSteps } from '@core/data/expresslrs/setupSteps';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';
import { DeepLinkOpener } from '@/components/software/DeepLinkOpener';
import { ProjectContextPanel } from '@/components/software/ProjectContextPanel';
import { Block, SimpleSources } from '@/components/software/SoftwareBlocks';

export const metadata: Metadata = {
  title: 'إعداد ExpressLRS خطوة بخطوة',
  description:
    'المسار الكامل لإعداد ExpressLRS: تحديد الأجهزة، وتجهيز الراديو، وبناء الفيرموير، '
    + 'وتحديث الطرفين، والربط، والتوصيل بمتحكم الطيران، والتحقق النهائي قبل الطيران.',
  alternates: { canonical: '/programming/expresslrs/setup' },
  openGraph: { type: 'article', title: 'إعداد ExpressLRS خطوة بخطوة — FPVARABIC' },
};

const WARN_COLOR: Record<string, string> = {
  info: 'var(--text-dim)',
  warning: 'var(--sev-warning)',
  danger: 'var(--sev-blocker)',
};

const WARN_LABEL_AR: Record<string, string> = {
  info: 'ملاحظة', warning: 'تحذير', danger: 'خطر',
};

const SUB_HEADING: React.CSSProperties = {
  margin: 0, fontSize: 12.5, fontWeight: 900, color: 'var(--text-dimmer)',
};

/**
 * The ordered ExpressLRS setup curriculum.
 *
 * WHY EVERY STEP IS RENDERED, COLLAPSED
 * -------------------------------------
 * `?step=` is the address the shared resolver hands out, so this one page has to
 * be able to open any of the twelve. Rendering only the requested one would make
 * the other eleven invisible to search and unreachable without JavaScript; so
 * all twelve are in the HTML inside `<details>`, and the client island opens the
 * one the URL named. Collapsed is the right default for a twelve-step
 * procedure — the list of steps IS the overview.
 *
 * WHY THE ORDER IS PRESENTED AS BINDING
 * -------------------------------------
 * Each step's `prerequisites` name what must already be true. Someone who jumps
 * to «الربط» before flashing both ends will fail in a way that looks like broken
 * hardware, and the commonest wasted afternoon in this hobby is re-flashing a
 * receiver that was never the problem.
 */
export default function ExpressLrsSetup() {
  const ordered = [...setupSteps].sort((a, b) => a.order - b.order);
  const entries = ordered.map(s => ({ id: s.id, titleAr: s.title }));

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 900 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.expresslrs}>
          <span className="ltr">ExpressLRS</span>
        </Link> <span aria-hidden>/</span> الإعداد
      </nav>

      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '14px 0 8px' }}>
        إعداد <span className="ltr">ExpressLRS</span> خطوة بخطوة
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 4px', maxWidth: 760 }}>
        <span dir="ltr">{ordered.length}</span> خطوة بترتيب مُلزم: كل خطوة تفترض أن
        ما قبلها تحقّق فعلاً. تخطّي خطوة لا يوفّر وقتاً — يحوّل عطلاً واضحاً إلى
        عطل يبدو عشوائياً.
      </p>

      <p className="card-sm" style={{ padding: '13px 15px', marginTop: 14, fontSize: 13.5, color: 'var(--sev-blocker)', lineHeight: 2 }}>
        انزع المراوح قبل أي خطوة تتضمّن تسليحاً أو تحريك عصي. لا تختبر رابطاً
        والمراوح مركّبة.
      </p>

      {/* Renders nothing unless the URL named a step. */}
      <Suspense fallback={null}>
        <DeepLinkOpener param="step" prefix="step-" entries={entries} nounAr="الخطوة" />
      </Suspense>

      {/* The overview: the twelve titles, as jump links to the sections below. */}
      <nav className="card-sm" aria-labelledby="elrs-toc" data-testid="elrs-setup-toc"
        style={{ padding: '15px 17px', marginTop: 18 }}>
        <h2 id="elrs-toc" style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>الخطوات</h2>
        <ol style={{ margin: '10px 0 0', paddingInlineStart: 22, display: 'grid', gap: 6 }}>
          {ordered.map(s => (
            <li key={s.id} style={{ fontSize: 13.5, lineHeight: 1.9 }}>
              <a href={`#step-${s.id}`}>{s.title}</a>
              <span style={{ color: 'var(--text-dimmer)', fontSize: 12 }}>
                {' '}· <span dir="ltr">{s.estimatedMinutes}</span> د
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {ordered.map(step => (
        <details key={step.id} id={`step-${step.id}`} className="card"
          data-testid={`elrs-step-${step.id}`}
          style={{ padding: '4px 18px 4px', marginTop: 14, scrollMarginTop: 18 }}>
          <summary style={{ cursor: 'pointer', padding: '14px 0', fontSize: 15, fontWeight: 900 }}>
            <span style={{ color: 'var(--accent-ink)' }}>
              <span dir="ltr">{step.order}</span>.
            </span>{' '}
            {step.title}
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--text-dimmer)', marginTop: 5 }}>
              {step.summary}
            </span>
          </summary>

          <div style={{ paddingBottom: 18 }}>
            <p style={{ fontSize: 13.5, lineHeight: 2, color: 'var(--text-dim)', margin: '4px 0 0' }}>
              <strong style={{ color: 'var(--text)' }}>الهدف:</strong> {step.goal}
            </p>

            {step.warnings.map((w, i) => (
              <p key={i} className="card-sm" data-testid={`elrs-warning-${step.id}-${i}`}
                style={{ padding: '11px 13px', marginTop: 12, fontSize: 13, lineHeight: 1.95, color: WARN_COLOR[w.level] }}>
                <strong>{WARN_LABEL_AR[w.level]}:</strong> {w.message}
              </p>
            ))}

            <Block titleAr="يفترض أنك أنجزت" items={step.prerequisites} />

            {step.terminology.length > 0 && (
              <section style={{ marginTop: 16 }}>
                <h3 style={SUB_HEADING}>مصطلحات هذه الخطوة</h3>
                <dl className="admin-kv" style={{ marginTop: 8 }}>
                  {step.terminology.map((t, i) => (
                    <div key={i}>
                      <dt className="ltr">{t.term}</dt>
                      <dd style={{ lineHeight: 1.9 }}>{t.definition}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <Block titleAr="ما تفعله" items={step.actions} ordered />
            <Block titleAr="ما يجب أن تراه" items={step.expectedResult} />
            <Block titleAr="إن لم تره" items={step.ifNotSeen} />
            <Block titleAr="أخطاء شائعة" items={step.commonMistakes} />
            <Block titleAr="ملاحظات إصدار" items={step.versionNotes} />

            {step.checklist.length > 0 && (
              <section style={{ marginTop: 16 }}>
                <h3 style={SUB_HEADING}>قائمة إنهاء الخطوة</h3>
                <ul style={{ margin: '8px 0 0', paddingInlineStart: 20, display: 'grid', gap: 5 }}>
                  {step.checklist.map(c => (
                    <li key={c.id} style={{ fontSize: 13.5, lineHeight: 1.9, color: 'var(--text-dim)' }}>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {step.advancedDisclosures.map((d, i) => (
              <details key={i} className="card-sm" style={{ padding: '11px 13px', marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>{d.title}</summary>
                {d.body.map((b, j) => (
                  <p key={j} style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>{b}</p>
                ))}
              </details>
            ))}

            {/* Only for steps whose meaning changes with what the reader recorded. */}
            <ProjectContextPanel kind="elrs" entryId={step.id} />

            <SimpleSources sources={step.sources} reviewedAt={step.reviewedAt} />
          </div>
        </details>
      ))}

      <p style={{ marginTop: 26, fontSize: 13, lineHeight: 1.95 }}>
        <Link href={webHref({ kind: 'elrs-issue' }).href ?? '#'} className="btn-ghost">
          شيء لا يعمل رغم اتّباع الخطوات؟ افتح التشخيص ←
        </Link>
      </p>
    </div>
  );
}
