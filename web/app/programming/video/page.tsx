import Link from 'next/link';
import type { Metadata } from 'next';
import {
  allVideoToolPages, videoToolSections, getVideoToolPage,
} from '@core/data/video/software/registry';
import {
  VIDEO_TOOL_KIND_LABEL_AR, VIDEO_TOOL_LEVEL_LABEL_AR,
  VIDEO_TOOL_RISK_LABEL_AR, VIDEO_TOOL_SCOPE_LABEL_AR,
} from '@core/data/video/software/types';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';

export const metadata: Metadata = {
  title: 'أدوات الفيديو — مركز البرامج',
  description:
    'ضبط نظام الفيديو وتحديثه: المنافذ وجدول القنوات وطبقة المعلومات في Betaflight، '
    + 'وأدوات DJI وWalksnail وHDZero، والتحديث والاقتران والاسترجاع حين يتوقف في منتصفه.',
  alternates: { canonical: '/programming/video' },
  openGraph: { type: 'website', title: 'أدوات الفيديو — FPV بالعربي' },
};

const RISK_CLASS: Record<string, string> = {
  critical: 'admin-badge admin-badge-bad',
  warning: 'admin-badge admin-badge-warn',
  caution: 'admin-badge',
  info: 'admin-badge',
};

/**
 * The video software centre.
 *
 * ORDERED BY THE READER'S SITUATION, NOT BY VENDOR
 * ------------------------------------------------
 * The sections come from the registry and run setting-up → your ecosystem →
 * updating → something went wrong. Grouping by manufacturer instead would
 * scatter each of those journeys across four boxes, and a reader mid-failed-
 * update would have to know whose fault it was before they could find the page
 * that helps.
 *
 * SCOPE IS ON EVERY CARD
 * ----------------------
 * A page about DJI's updater is useless and misleading to someone on analogue,
 * so each card states which ecosystem it applies to before it is opened. `all`
 * means the procedure genuinely is shared — which is exactly why it is written
 * once instead of three times.
 */
export default function VideoToolsHub() {
  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 1000 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span> أدوات الفيديو
      </nav>

      <h1 style={{ fontSize: 27, fontWeight: 900, margin: '14px 0 8px' }}>أدوات الفيديو</h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 6px', maxWidth: 780 }}>
        ما تضبط به البثّ والطبقة المعلوماتية، وما تحدّث به وحدات DJI وWalksnail
        وHDZero. الإجراءات المشتركة مكتوبة مرة واحدة لأن منطقها واحد؛ وما يخصّ
        منظومتك وحدها في قسمها.
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 8px' }}>
        <span dir="ltr">{allVideoToolPages.length}</span> صفحة في{' '}
        <span dir="ltr">{videoToolSections.length}</span> أقسام.
      </p>

      <p className="card-sm" style={{ padding: '13px 15px', marginTop: 14, fontSize: 13.5, color: 'var(--sev-blocker)', lineHeight: 2 }}>
        لا تُشغّل وحدة بثّ بلا هوائي مركّب. البثّ بلا هوائي يُتلف الوحدة، وأحياناً
        من أول ثانية.
      </p>

      {videoToolSections.map(section => {
        const pages = section.pageIds
          .map(id => getVideoToolPage(id))
          .filter((p): p is NonNullable<typeof p> => !!p);
        if (pages.length === 0) return null;
        return (
          <section key={section.id} className="admin-section" aria-labelledby={`sec-${section.id}`}>
            <h2 id={`sec-${section.id}`}>{section.titleAr}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '0 0 14px', lineHeight: 1.95 }}>
              {section.descriptionAr}
            </p>

            <div style={{ display: 'grid', gap: 11, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {pages.map(p => (
                <Link key={p.id} href={webHref({ kind: 'video', id: p.id }).href ?? '#'}
                  className="card-sm" data-testid={`video-page-${p.id}`}
                  style={{ padding: '14px 16px', display: 'block', minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 7, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 900 }}>{p.titleAr}</span>
                    <span className={RISK_CLASS[p.risk]}>{VIDEO_TOOL_RISK_LABEL_AR[p.risk]}</span>
                    <span className="admin-badge">{VIDEO_TOOL_KIND_LABEL_AR[p.kind]}</span>
                    <span className="admin-badge">{VIDEO_TOOL_LEVEL_LABEL_AR[p.level]}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--accent-ink)', marginTop: 5 }}>
                    {VIDEO_TOOL_SCOPE_LABEL_AR[p.scope]}
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

      <p style={{ marginTop: 26, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        وصف حقول الفيديو داخل Betaflight نفسه في{' '}
        <Link href={webHref({ kind: 'betaflight', id: 'vtx' }).href ?? '#'} style={{ color: 'var(--accent-ink)' }}>
          صفحة VTX
        </Link>
        {' '}و
        <Link href={webHref({ kind: 'betaflight', id: 'osd' }).href ?? '#'} style={{ color: 'var(--accent-ink)' }}>
          صفحة OSD
        </Link>.
      </p>
    </div>
  );
}
