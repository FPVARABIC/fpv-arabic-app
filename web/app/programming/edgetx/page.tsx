import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import {
  allEdgeTxPages, edgeTxSections, edgeTxPage, edgeTxTopicIndex,
  EDGETX_REQUIRED_TOPICS,
} from '@core/data/edgetx/registry';
import {
  EDGETX_KIND_LABEL_AR, EDGETX_LEVEL_LABEL_AR, EDGETX_RISK_LABEL_AR,
} from '@core/data/edgetx/types';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';
import { TopicRedirect } from '@/components/software/TopicRedirect';
import { EdgeTxHubContext } from '@/components/software/EdgeTxHubContext';

export const metadata: Metadata = {
  title: 'EdgeTX — مركز البرامج',
  description:
    'نظام تشغيل جهاز التحكم: النموذج والوحدة الراديوية، والمدخلات والمزج والمخارج، '
    + 'والتليمتري وModel Match والحماية عند فقدان الإشارة، والصيانة وأعطال جهة الراديو.',
  alternates: { canonical: '/programming/edgetx' },
  openGraph: { type: 'website', title: 'EdgeTX — FPV بالعربي' },
};

const RISK_CLASS: Record<string, string> = {
  critical: 'admin-badge admin-badge-bad',
  warning: 'admin-badge admin-badge-warn',
  caution: 'admin-badge',
  info: 'admin-badge',
};

/**
 * The EdgeTX centre.
 *
 * ORDERED BY WHEN A READER NEEDS IT
 * ---------------------------------
 * The sections come from the registry, and their order is the order a radio is
 * actually set up: get a link at all, then shape what the sticks do, then decide
 * what comes back and what happens when it stops, then keep the thing alive.
 * Sorting by menu position instead would put the mixer — which a beginner must
 * not touch — above the module setup they came here for.
 *
 * WHY `?topic=` IS ACCEPTED HERE AT ALL
 * -------------------------------------
 * The canonical address of a topic is its own path, which is what
 * `resolveDestination` returns and what this page links to. But `?topic=` is a
 * shape people write by hand and paste into chat, and answering it with a redirect
 * costs one component and turns a 404 into the right page. The redirect is
 * one-way: nothing here ever GENERATES a `?topic=` URL, so there is still exactly
 * one address per topic for a crawler to index.
 */
export default function EdgeTxHub() {
  // `?topic=` answers to BOTH a screen and a single setting inside one, which
  // is what makes «افتح Subtrim» land on the row rather than on a page of
  // fourteen. The index already flattens both — reusing it means a new setting
  // becomes addressable with no edit here.
  const entries = edgeTxTopicIndex().map(t => ({
    id: t.settingId ?? t.pageId,
    titleAr: t.titleAr,
    pageId: t.pageId,
    anchor: t.settingId ? `setting-${t.settingId}` : undefined,
  }));

  // The declared scope, so a gap is visible rather than merely absent.
  const covered = EDGETX_REQUIRED_TOPICS.filter(t => !!edgeTxPage(t.pageId));
  const uncovered = EDGETX_REQUIRED_TOPICS.filter(t => !edgeTxPage(t.pageId));

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 1000 }}>
      <Suspense fallback={null}>
        <TopicRedirect param="topic" entries={entries} />
      </Suspense>

      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span>{' '}
        <span className="ltr">EdgeTX</span>
      </nav>

      <h1 style={{ fontSize: 27, fontWeight: 900, margin: '14px 0 8px' }}>
        <span className="ltr">EdgeTX</span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 6px', maxWidth: 780 }}>
        نظام تشغيل جهاز التحكم نفسه. ليست ترجمة لقوائمه: كل صفحة تقول ما الذي
        يتغيّر في <em>الطائرة</em> حين تغيّر إعداداً، وكيف تتحقق، وكيف تتراجع —
        لأن قائمة مترجمة تترك القارئ حيث بدأ، بالعربية بدل الإنجليزية.
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 8px' }}>
        <span dir="ltr">{allEdgeTxPages.length}</span> صفحة في{' '}
        <span dir="ltr">{edgeTxSections.length}</span> أقسام.
      </p>

      {/* What the reader's own radio is, if they recorded it. */}
      <EdgeTxHubContext />

      {edgeTxSections.map(section => {
        const pages = section.pageIds.map(id => edgeTxPage(id)).filter((p): p is NonNullable<typeof p> => !!p);
        if (pages.length === 0) return null;
        return (
          <section key={section.id} className="admin-section" aria-labelledby={`sec-${section.id}`}>
            <h2 id={`sec-${section.id}`}>{section.titleAr}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '0 0 14px', lineHeight: 1.95 }}>
              {section.descriptionAr}
            </p>

            <div style={{ display: 'grid', gap: 11, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {pages.map(p => (
                <Link key={p.id} href={webHref({ kind: 'edgetx', id: p.id }).href ?? '#'}
                  className="card-sm" data-testid={`edgetx-page-${p.id}`}
                  style={{ padding: '14px 16px', display: 'block', minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 7, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 900 }}>{p.titleAr}</span>
                    <span className={RISK_CLASS[p.risk]}>{EDGETX_RISK_LABEL_AR[p.risk]}</span>
                    <span className="admin-badge">{EDGETX_KIND_LABEL_AR[p.kind]}</span>
                    <span className="admin-badge">{EDGETX_LEVEL_LABEL_AR[p.level]}</span>
                  </span>
                  <span className="ltr" style={{ display: 'block', fontSize: 12, color: 'var(--text-dimmer)', marginTop: 4 }}>
                    {p.titleEn}
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 7, lineHeight: 1.9 }}>
                    {p.summaryAr}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="admin-section" aria-labelledby="edgetx-scope">
        <h2 id="edgetx-scope">ما تغطّيه هذه الصفحات، وما لا تغطّيه</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95, margin: '0 0 12px' }}>
          النطاق مُعلَن في البيانات نفسها لا مكتوباً هنا:{' '}
          <span dir="ltr">{covered.length}</span> من{' '}
          <span dir="ltr">{EDGETX_REQUIRED_TOPICS.length}</span> موضوعاً مطلوباً له صفحة.
        </p>
        {uncovered.length > 0 && (
          <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 5 }}
            data-testid="edgetx-uncovered">
            {uncovered.map(t => (
              <li key={t.id} style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--sev-warning)' }}>
                {t.labelAr} — لا صفحة له بعد.
              </li>
            ))}
          </ul>
        )}
      </section>

      <p style={{ marginTop: 26, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        الجهة المقابلة — المستقبل على الطائرة — في{' '}
        <Link href={SECTION_ROUTES.expresslrs} style={{ color: 'var(--accent-ink)' }}>
          مركز ExpressLRS
        </Link>.
      </p>
    </div>
  );
}
