import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bfPageRegistry } from '@core/data/betaflight/pageRegistry';
import { kbTerms } from '@core/data/kb/glossary/terms';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';
import { ProjectContextPanel } from '@/components/software/ProjectContextPanel';

export const dynamicParams = false;

/** The centre this page belongs to, resolved once through the adapter. */
const BF_HUB = webHref({ kind: 'betaflight' }).href ?? SECTION_ROUTES.programming;

export function generateStaticParams() {
  // Only pages that HAVE content get a route. A registry entry with no page is
  // named on the index as undocumented rather than given an empty URL.
  return bfPageRegistry.filter(p => !!p.page).map(p => ({ pageId: p.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ pageId: string }> },
): Promise<Metadata> {
  const { pageId } = await params;
  const entry = bfPageRegistry.find(p => p.id === pageId && !!p.page);
  if (!entry?.page) return { title: 'صفحة غير موجودة', robots: { index: false, follow: false } };

  return {
    title: `${entry.officialTitle} — Betaflight`,
    description: entry.page.summaryAr.slice(0, 160),
    alternates: { canonical: webHref({ kind: 'betaflight', id: entry.id }).href ?? undefined },
    openGraph: {
      type: 'article',
      title: `${entry.officialTitle} — Betaflight — FPV بالعربي`,
      description: entry.page.summaryAr.slice(0, 160),
    },
  };
}

const SAFETY_AR: Record<string, string> = {
  critical: 'حرج', warning: 'تحذير', caution: 'انتبه', informational: 'معلومة',
};
const SAFETY_CLASS: Record<string, string> = {
  critical: 'admin-badge admin-badge-bad',
  warning: 'admin-badge admin-badge-warn',
  caution: 'admin-badge',
  informational: 'admin-badge',
};

/**
 * One Betaflight page.
 *
 * THE ENGLISH LABEL IS THE ANCHOR, NOT THE TRANSLATION
 * ----------------------------------------------------
 * Every field shows its exact official English label first, direction-isolated
 * so bidi cannot reorder it, and the Arabic explains what it MEANS. Translating
 * a setting's name and hiding the original would leave a reader unable to find
 * the control on their own screen — which is the one thing this page exists to
 * prevent.
 *
 * VERSION AND SOURCE ARE PART OF THE CONTENT
 * ------------------------------------------
 * A Betaflight setting's behaviour is version-dependent, so the firmware range,
 * the Configurator range, the review date and the source reference are rendered
 * with the page rather than buried. A reader on a different firmware needs to
 * know that before they act, not after.
 */
export default async function BetaflightPage(
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params;
  const entry = bfPageRegistry.find(p => p.id === pageId && !!p.page);
  if (!entry?.page) notFound();
  const page = entry.page;

  const related = (page.relatedPageIds ?? [])
    .map(id => bfPageRegistry.find(p => p.id === id && !!p.page))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const terms = (page.glossaryTermIds ?? [])
    .map(id => kbTerms.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 900 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span>{' '}
        <Link href={BF_HUB}>Betaflight</Link> <span aria-hidden>/</span>{' '}
        <span className="ltr">{entry.officialTitle}</span>
      </nav>

      <header style={{ margin: '14px 0 6px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>
          <span className="ltr">{entry.officialTitle}</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 16, color: 'var(--text-dim)' }}>{page.titleAr}</p>
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <span className={SAFETY_CLASS[page.safetyLevel]}>{SAFETY_AR[page.safetyLevel]}</span>
        <span className="admin-badge">
          {page.connectionState === 'connected' ? 'يحتاج اتصالاً باللوحة' : 'يعمل دون اتصال'}
        </span>
        {page.expertRequired && <span className="admin-badge admin-badge-warn">يحتاج خبرة</span>}
      </div>

      <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 6px' }}>
        {page.summaryAr}
      </p>

      {/* Version and provenance, before the content rather than after it. */}
      <dl className="admin-kv card-sm" data-testid="bf-provenance" style={{ padding: '13px 15px', marginTop: 14 }}>
        <div><dt>إصدار الفيرموير</dt><dd className="ltr">{page.firmwareVersionRange}</dd></div>
        <div><dt>إصدار البرنامج</dt><dd className="ltr">{page.appVersionRange}</dd></div>
        <div><dt>تاريخ المراجعة</dt><dd className="ltr">{page.reviewedAt}</dd></div>
        <div>
          <dt>المصدر</dt>
          <dd className="ltr">
            <a href={page.source.url} target="_blank" rel="noreferrer noopener">{page.source.title}</a>
            {page.source.repoPath && <> · {page.source.repoPath}</>}
            {page.source.commit && <> @ {page.source.commit.slice(0, 7)}</>}
          </dd>
        </div>
      </dl>

      {page.conditionNote && (
        <p className="card-sm" style={{ padding: '12px 14px', marginTop: 12, fontSize: 13, color: '#fcd34d', lineHeight: 1.95 }}>
          {page.conditionNote}
        </p>
      )}

      {/* The reader's own build — only the fields this page is about. */}
      <ProjectContextPanel kind="betaflight" entryId={entry.id} />

      {/* ── The page's own content ───────────────────────────────────────── */}
      {[...page.groups].sort((a, b) => a.order - b.order).map(group => (
        <section key={group.id} className="admin-section" aria-labelledby={`g-${group.id}`}>
          <h2 id={`g-${group.id}`}>
            {group.officialTitle && <span className="ltr">{group.officialTitle} — </span>}
            {group.titleAr}
          </h2>

          <div style={{ display: 'grid', gap: 12 }}>
            {group.fields.map(field => (
              <article key={field.id} className="card-sm" data-testid={`bf-field-${field.id}`} style={{ padding: '14px 16px' }}>
                <header style={{ display: 'flex', gap: 9, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  {/* Direction-isolated so the Arabic around it cannot reorder
                      the exact string the reader must look for. */}
                  <span className="ltr" style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent)' }}>
                    {field.englishLabel}
                  </span>
                  <span className={SAFETY_CLASS[field.safetyLevel]}>{SAFETY_AR[field.safetyLevel]}</span>
                  {field.requiresReboot && <span className="admin-badge">يحتاج إعادة تشغيل</span>}
                  {field.requiresSave && <span className="admin-badge">يحتاج حفظ</span>}
                </header>

                <p style={{ margin: '8px 0 0', fontSize: 13.5, fontWeight: 800 }}>{field.arabicMeaning}</p>
                <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
                  {field.arabicExplanation}
                </p>

                {field.range && (
                  <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-dimmer)' }}>
                    <span className="ltr">
                      {field.range.options
                        ? field.range.options.join(' / ')
                        : `${field.range.min ?? '—'} … ${field.range.max ?? '—'}${field.range.unit ? ` ${field.range.unit}` : ''}`}
                      {field.range.default !== undefined && ` · default: ${field.range.default}`}
                    </span>
                  </p>
                )}

                {field.beginnerGuidance && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                    <strong>للمبتدئ:</strong> {field.beginnerGuidance}
                  </p>
                )}
                {field.advancedGuidance && (
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                    <strong>للمتقدّم:</strong> {field.advancedGuidance}
                  </p>
                )}
                {field.conditionNote && (
                  <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#fcd34d', lineHeight: 1.9 }}>
                    {field.conditionNote}
                  </p>
                )}
                {field.deprecatedNote && (
                  <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#fca5a5', lineHeight: 1.9 }}>
                    {field.deprecatedNote}
                  </p>
                )}
                <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                  <span className="ltr">
                    <a href={field.source.url} target="_blank" rel="noreferrer noopener">{field.source.title}</a>
                    {field.source.repoPath && <> · {field.source.repoPath}</>}
                    {' · '}{field.source.reviewedAt}
                  </span>
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* ── Where to go next ─────────────────────────────────────────────── */}
      {terms.length > 0 && (
        <section className="admin-section" aria-labelledby="bf-terms">
          <h2 id="bf-terms">مصطلحات هذه الصفحة</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {terms.map(t => {
              const target = webHref({ kind: 'glossary', id: t.id }).href;
              return target ? (
                <Link key={t.id} href={target} className="btn-ghost" data-testid={`bf-term-${t.id}`}>
                  <span className="ltr">{t.en}</span> — {t.ar}
                </Link>
              ) : null;
            })}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="admin-section" aria-labelledby="bf-related">
          <h2 id="bf-related">صفحات مرتبطة</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {related.map(r => (
              <Link key={r.id} href={webHref({ kind: 'betaflight', id: r.id }).href ?? '#'} className="btn-ghost"
                data-testid={`bf-related-${r.id}`}>
                <span className="ltr">{r.officialTitle}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p style={{ marginTop: 26, fontSize: 13 }}>
        <Link href={BF_HUB} className="btn-ghost">← كل صفحات Betaflight</Link>{' '}
        <Link href={webHref({ kind: 'diagnose' }).href ?? '/diagnose'} className="btn-ghost">
          شيء لا يعمل؟ ابدأ من التشخيص ←
        </Link>
      </p>
    </div>
  );
}
