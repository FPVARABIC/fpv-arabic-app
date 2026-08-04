import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  allEdgeTxPages, edgeTxPage, edgeTxSectionOfPage,
} from '@core/data/edgetx/registry';
import {
  EDGETX_KIND_LABEL_AR, EDGETX_LEVEL_LABEL_AR, EDGETX_RISK_LABEL_AR,
} from '@core/data/edgetx/types';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';
import { ProjectContextPanel } from '@/components/software/ProjectContextPanel';
import { SettingFocus } from '@/components/software/SettingFocus';
import {
  Block, Note, ManualRequired, Links, Sources,
} from '@/components/software/SoftwareBlocks';

export const dynamicParams = false;

export function generateStaticParams() {
  return allEdgeTxPages.map(p => ({ pageId: p.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ pageId: string }> },
): Promise<Metadata> {
  const { pageId } = await params;
  const page = edgeTxPage(pageId);
  if (!page) return { title: 'صفحة غير موجودة', robots: { index: false, follow: false } };
  return {
    title: `${page.titleAr} — EdgeTX`,
    description: page.summaryAr.slice(0, 160),
    alternates: { canonical: webHref({ kind: 'edgetx', id: page.id }).href ?? undefined },
    openGraph: {
      type: 'article',
      title: `${page.titleAr} — EdgeTX — FPV بالعربي`,
      description: page.summaryAr.slice(0, 160),
    },
  };
}

const RISK_CLASS: Record<string, string> = {
  critical: 'admin-badge admin-badge-bad',
  warning: 'admin-badge admin-badge-warn',
  caution: 'admin-badge',
  info: 'admin-badge',
};

/**
 * One EdgeTX topic.
 *
 * WHAT MAKES THIS MORE THAN A TRANSLATED MENU
 * -------------------------------------------
 * Every setting states four things a menu screenshot cannot: what it changes in
 * the AIRCRAFT, when a reader would genuinely need to touch it, how to confirm
 * the change worked as an OBSERVATION rather than a feeling, and how to undo it.
 * A reference that only renamed the fields in Arabic would leave the reader
 * exactly where they started.
 *
 * MENU PATHS ARE NEVER STATED AS PERMANENT
 * ----------------------------------------
 * EdgeTX moves menus between releases and between radios. `whereAr` carries the
 * route together with the version it was checked against, and `versionNotesAr`
 * carries what is known to differ. Where we do not know, `manualRequiredAr` says
 * so out loud instead of guessing — a guessed menu path on a radio that does not
 * have it is worse than no path.
 *
 * A PROBLEM PAGE NEVER OWNS A DIAGNOSIS TWICE
 * -------------------------------------------
 * Problem topics cover the radio-side checks and then name the one entry that
 * owns the full procedure. The data enforces it — every problem page declares
 * either `canonicalDiagnosis` or an explicit reason it owns the symptom — and
 * this page renders that hand-off prominently rather than burying it in links.
 */
export default async function EdgeTxTopic(
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params;
  const page = edgeTxPage(pageId);
  if (!page) notFound();
  const section = edgeTxSectionOfPage(page.id);

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 900 }}>
      {/* Search emits one URL per setting; this is what makes it land on one. */}
      <Suspense fallback={null}><SettingFocus /></Suspense>

      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span>{' '}
        <Link href={webHref({ kind: 'edgetx' }).href ?? '#'}><span className="ltr">EdgeTX</span></Link>
        {section && <> <span aria-hidden>/</span> {section.titleAr}</>}
      </nav>

      <header style={{ margin: '14px 0 6px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>{page.titleAr}</h1>
        <p className="ltr" style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-dim)' }}>
          {page.titleEn}
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <span className={RISK_CLASS[page.risk]}>{EDGETX_RISK_LABEL_AR[page.risk]}</span>
        <span className="admin-badge">{EDGETX_KIND_LABEL_AR[page.kind]}</span>
        <span className="admin-badge">{EDGETX_LEVEL_LABEL_AR[page.level]}</span>
      </div>

      <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 2, margin: 0 }}>{page.summaryAr}</p>

      <dl className="admin-kv card-sm" data-testid="edgetx-provenance" style={{ padding: '13px 15px', marginTop: 14 }}>
        <div><dt>متى تحتاجها</dt><dd style={{ lineHeight: 1.9 }}>{page.whenNeededAr}</dd></div>
        <div><dt>أين تجدها</dt><dd style={{ lineHeight: 1.9 }}>{page.whereAr}</dd></div>
        <div><dt>آخر مراجعة</dt><dd className="ltr">{page.lastReviewed}</dd></div>
      </dl>

      {/* A problem page hands over rather than growing a second procedure. */}
      {page.canonicalDiagnosis && (
        <aside className="card-sm" data-testid="edgetx-canonical-diagnosis"
          style={{ padding: '14px 16px', marginTop: 14, borderColor: 'rgba(252,211,77,0.35)' }}>
          <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 900, color: '#fcd34d' }}>
            الإجراء الكامل ليس هنا
          </h2>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
            هذه الصفحة تغطّي فحوص جهة الراديو فقط.
            {page.canonicalDiagnosis.reason && ` ${page.canonicalDiagnosis.reason}`}
          </p>
          <Links titleAr="" links={[page.canonicalDiagnosis]} />
        </aside>
      )}
      {page.ownsDiagnosis && (
        <p className="card-sm" data-testid="edgetx-owns-diagnosis"
          style={{ padding: '12px 14px', marginTop: 14, fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          هذا العطل يخصّ الجهاز نفسه، ولا يُغطّى في مكان آخر من المنصة: {page.ownsDiagnosis.reasonAr}
        </p>
      )}

      {/* Only where the reader's own recorded setup changes what the page means. */}
      <ProjectContextPanel kind="edgetx" entryId={page.id} />

      <Block titleAr="يفترض أنك أنجزت" items={page.prerequisitesAr} />

      {page.stepsAr.length > 0 && (
        <section className="admin-section" aria-labelledby="edgetx-steps">
          <h2 id="edgetx-steps">الخطوات</h2>
          <ol style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 10 }}>
            {page.stepsAr.map((s, i) => (
              <li key={i} style={{ fontSize: 13.5, lineHeight: 1.95 }}>
                {s.textAr}
                {s.noteAr && (
                  <span style={{
                    display: 'block', marginTop: 4, fontSize: 12.5, lineHeight: 1.9,
                    color: s.risk === 'critical' || s.risk === 'warning' ? '#fcd34d' : 'var(--text-dimmer)',
                  }}>
                    {s.noteAr}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {page.groups.map(group => (
        <section key={group.id} className="admin-section" aria-labelledby={`g-${group.id}`}>
          <h2 id={`g-${group.id}`}>{group.titleAr}</h2>
          {group.introAr && (
            <p style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '0 0 14px', lineHeight: 1.95 }}>
              {group.introAr}
            </p>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {group.settings.map(setting => (
              <article key={setting.id} id={`setting-${setting.id}`} className="card-sm"
                data-testid={`edgetx-setting-${setting.id}`}
                style={{ padding: '14px 16px', scrollMarginTop: 18 }}>
                <header style={{ display: 'flex', gap: 9, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  {/* The English label is the anchor: it is what is printed on
                      the reader's own screen, and translating it away would make
                      the setting unfindable. */}
                  <span className="ltr" style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent)' }}>
                    {setting.labelEn}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 800 }}>{setting.labelAr}</span>
                  <span className={RISK_CLASS[setting.risk]}>{EDGETX_RISK_LABEL_AR[setting.risk]}</span>
                </header>

                <p style={{ margin: '9px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
                  {setting.whatAr}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.95 }}>
                  <strong>ما يتغيّر في الطائرة:</strong>{' '}
                  <span style={{ color: 'var(--text-dim)' }}>{setting.effectAr}</span>
                </p>
                <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                  <strong>متى تلمسه:</strong> {setting.whenAr}
                </p>
                {setting.riskAr && (
                  <p style={{ margin: '7px 0 0', fontSize: 12.5, color: '#fcd34d', lineHeight: 1.9 }}>
                    <strong>إن ضبطته خطأ:</strong> {setting.riskAr}
                  </p>
                )}
                {setting.verifyAr && (
                  <p style={{ margin: '7px 0 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                    <strong>تتحقق بـ:</strong> {setting.verifyAr}
                  </p>
                )}
                {setting.revertAr && (
                  <p style={{ margin: '7px 0 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                    <strong>تتراجع بـ:</strong> {setting.revertAr}
                  </p>
                )}
                {setting.versionNoteAr && (
                  <p style={{ margin: '7px 0 0', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
                    {setting.versionNoteAr}
                  </p>
                )}
                {setting.manualCheckAr && (
                  <p style={{ margin: '7px 0 0', fontSize: 12, color: '#fcd34d', lineHeight: 1.9 }}>
                    من دليل جهازك: {setting.manualCheckAr}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      <Block titleAr="علاقتها بالمستقبل وExpressLRS وBetaflight" items={page.relationAr} />
      <Block titleAr="كيف تتحقق" items={page.verifyAr} />
      <Note titleAr="كيف تتراجع" textAr={page.revertAr} />
      <Block titleAr="أخطاء شائعة" items={page.commonMistakesAr} />
      <Block titleAr="اختلافات بين الإصدارات" items={page.versionNotesAr} />

      {page.troubleshootingAr && page.troubleshootingAr.length > 0 && (
        <section className="admin-section" aria-labelledby="edgetx-tshoot">
          <h2 id="edgetx-tshoot">أعراض تخصّ هذه الشاشة</h2>
          <dl className="admin-kv">
            {page.troubleshootingAr.map((t, i) => (
              <div key={i}>
                <dt style={{ lineHeight: 1.9 }}>{t.symptomAr}</dt>
                <dd style={{ lineHeight: 1.9 }}>{t.checkAr}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <ManualRequired items={page.manualRequiredAr} />
      <Links links={page.links} />
      <Sources sources={page.sources} reviewedAt={page.lastReviewed} />

      <p style={{ marginTop: 26, fontSize: 13 }}>
        <Link href={webHref({ kind: 'edgetx' }).href ?? '#'} className="btn-ghost">
          ← كل مواضيع EdgeTX
        </Link>
      </p>
    </div>
  );
}
