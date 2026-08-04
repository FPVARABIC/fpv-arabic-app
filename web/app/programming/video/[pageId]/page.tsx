import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  allVideoToolPages, getVideoToolPage, videoToolSections,
} from '@core/data/video/software/registry';
import {
  VIDEO_TOOL_KIND_LABEL_AR, VIDEO_TOOL_LEVEL_LABEL_AR,
  VIDEO_TOOL_RISK_LABEL_AR, VIDEO_TOOL_SCOPE_LABEL_AR,
} from '@core/data/video/software/types';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';
import { ProjectContextPanel } from '@/components/software/ProjectContextPanel';
import {
  Block, Note, ManualRequired, Links, Sources,
} from '@/components/software/SoftwareBlocks';

export const dynamicParams = false;

export function generateStaticParams() {
  return allVideoToolPages.map(p => ({ pageId: p.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ pageId: string }> },
): Promise<Metadata> {
  const { pageId } = await params;
  const page = getVideoToolPage(pageId);
  if (!page) return { title: 'صفحة غير موجودة', robots: { index: false, follow: false } };
  return {
    title: `${page.titleAr} — أدوات الفيديو`,
    description: page.summaryAr.slice(0, 160),
    alternates: { canonical: webHref({ kind: 'video', id: page.id }).href ?? undefined },
    openGraph: {
      type: 'article',
      title: `${page.titleAr} — أدوات الفيديو — FPVARABIC`,
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
 * One video-software topic.
 *
 * SCOPE IS STATED BEFORE ANYTHING ELSE
 * ------------------------------------
 * Following a DJI updating procedure on a Walksnail unit is a real way to brick
 * hardware, so the ecosystem this page applies to is the first badge, not a
 * footnote. `all` means the procedure genuinely is shared, and saying that
 * explicitly is what allows it to be written once instead of three times.
 *
 * WHY THE PROJECT PANEL HERE TAKES ITS FIELDS FROM THE PAGE
 * ---------------------------------------------------------
 * Unlike the other centres, a video page declares its own `projectFields` beside
 * its content — the fields ARE part of what the page is about. So they are
 * passed through rather than looked up, and the panel still renders nothing when
 * the page has none, which is the rule that keeps it worth reading.
 */
export default async function VideoToolTopic(
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params;
  const page = getVideoToolPage(pageId);
  if (!page) notFound();
  const section = videoToolSections.find(s => s.pageIds.includes(page.id));

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 900 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span>{' '}
        <Link href={webHref({ kind: 'video' }).href ?? '#'}>أدوات الفيديو</Link>
        {section && <> <span aria-hidden>/</span> {section.titleAr}</>}
      </nav>

      <header style={{ margin: '14px 0 6px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>{page.titleAr}</h1>
        <p className="ltr" style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-dim)' }}>
          {page.titleEn}
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        {/* Scope first: applying another ecosystem's procedure is how units die. */}
        <span className="admin-badge" data-testid="video-scope"
          style={{ color: 'var(--accent-ink)', fontWeight: 800 }}>
          {VIDEO_TOOL_SCOPE_LABEL_AR[page.scope]}
        </span>
        <span className={RISK_CLASS[page.risk]}>{VIDEO_TOOL_RISK_LABEL_AR[page.risk]}</span>
        <span className="admin-badge">{VIDEO_TOOL_KIND_LABEL_AR[page.kind]}</span>
        <span className="admin-badge">{VIDEO_TOOL_LEVEL_LABEL_AR[page.level]}</span>
      </div>

      <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 2, margin: 0 }}>{page.summaryAr}</p>

      <dl className="admin-kv card-sm" data-testid="video-provenance" style={{ padding: '13px 15px', marginTop: 14 }}>
        <div><dt>متى تحتاجها</dt><dd style={{ lineHeight: 1.9 }}>{page.whenNeededAr}</dd></div>
        <div><dt>بأي أداة</dt><dd style={{ lineHeight: 1.9 }}>{page.toolAr}</dd></div>
        <div><dt>آخر مراجعة</dt><dd className="ltr">{page.lastReviewed}</dd></div>
      </dl>

      {page.canonicalDiagnosis && (
        <aside className="card-sm" data-testid="video-canonical-diagnosis"
          style={{ padding: '14px 16px', marginTop: 14, borderColor: 'rgba(252,211,77,0.35)' }}>
          <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 900, color: 'var(--sev-warning)' }}>
            الإجراء الكامل ليس هنا
          </h2>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
            هذه الصفحة تغطّي جانب الأداة فقط.
            {page.canonicalDiagnosis.reason && ` ${page.canonicalDiagnosis.reason}`}
          </p>
          <Links titleAr="" links={[page.canonicalDiagnosis]} />
        </aside>
      )}
      {page.ownsDiagnosis && (
        <p className="card-sm" data-testid="video-owns-diagnosis"
          style={{ padding: '12px 14px', marginTop: 14, fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          هذا العطل يخصّ الأداة نفسها ولا يُغطّى في مكان آخر: {page.ownsDiagnosis.reasonAr}
        </p>
      )}

      {/* Fields declared by the page itself — never a general project panel. */}
      <ProjectContextPanel kind="video" entryId={page.id} fields={page.projectFields} />

      <Block titleAr="يفترض أنك أنجزت" items={page.prerequisitesAr} />

      {page.stepsAr.length > 0 && (
        <section className="admin-section" aria-labelledby="video-steps">
          <h2 id="video-steps">الخطوات</h2>
          <ol style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 10 }}>
            {page.stepsAr.map((s, i) => (
              <li key={i} style={{ fontSize: 13.5, lineHeight: 1.95 }}>
                {s.textAr}
                {s.noteAr && (
                  <span style={{
                    display: 'block', marginTop: 4, fontSize: 12.5, lineHeight: 1.9,
                    color: s.risk === 'critical' || s.risk === 'warning' ? 'var(--sev-warning)' : 'var(--text-dimmer)',
                  }}>
                    {s.noteAr}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Block titleAr="علاقتها ببقية النظام" items={page.relationAr} />
      <Block titleAr="كيف تتحقق" items={page.verifyAr} />
      <Note titleAr="كيف تتراجع" textAr={page.revertAr} />
      <Block titleAr="أخطاء شائعة" items={page.commonMistakesAr} />
      <Block titleAr="اختلافات بين الإصدارات" items={page.versionNotesAr} />

      <ManualRequired items={page.manualRequiredAr} />
      <Links links={page.links} />
      <Sources sources={page.sources} reviewedAt={page.lastReviewed} />

      <p style={{ marginTop: 26, fontSize: 13 }}>
        <Link href={webHref({ kind: 'video' }).href ?? '#'} className="btn-ghost">
          ← كل أدوات الفيديو
        </Link>
      </p>
    </div>
  );
}
