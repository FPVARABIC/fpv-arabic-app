import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { lessonsData } from '@core/data/lessonsData';
import { LESSON_TRACKS, stageCountLabel } from '@core/data/lessons/lessonTracks';
import { getLessonJourneyDefinition } from '@core/data/lessons/journeyRegistry';
import { enrichJourneyDefinition } from '@core/data/lessons/lessonJourneyEnrich';
import { allKbModules } from '@core/data/kb/registry';
import { href, SECTION_ROUTES } from '@/lib/webRoutes';
import { LessonJourneyClient } from '@/components/lessons/LessonJourneyClient';

/**
 * One lesson.
 *
 * WHAT IS IN THE HTML
 * -------------------
 * The title, the station, the objective, the description, the key points and
 * the common mistake — the lesson's own summary, as authored in
 * `lessonsData` — plus every encyclopedia article that points at this lesson.
 * That is what a search engine indexes and what a reader without JavaScript
 * gets, and it is honest: nothing here is contradicted once the journey
 * mounts.
 *
 * WHAT MOUNTS ON THE CLIENT
 * -------------------------
 * The journey itself (`LessonJourneyClient`), because it opens on the stage
 * the reader left, and that fact lives in their browser.
 */

export function generateStaticParams() {
  return lessonsData.map(l => ({ lessonId: l.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ lessonId: string }> },
): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = lessonsData.find(l => l.id === lessonId);
  if (!lesson) return { title: 'غير موجود' };
  return {
    title: `الدرس ${lesson.number}: ${lesson.title}`,
    description: lesson.description,
    alternates: { canonical: href({ kind: 'lesson', id: lesson.id }) ?? undefined },
    openGraph: { type: 'article', title: `${lesson.title} — FPVARABIC`, description: lesson.description },
  };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = lessonsData.find(l => l.id === lessonId);
  if (!lesson) notFound();

  const base = getLessonJourneyDefinition(lesson.id);
  if (!base) notFound();
  const definition = enrichJourneyDefinition(base, lesson);
  const track = LESSON_TRACKS.find(t => t.id === lesson.track);

  const index = lessonsData.findIndex(l => l.id === lesson.id);
  const prev = index > 0 ? lessonsData[index - 1] : null;
  const next = index < lessonsData.length - 1 ? lessonsData[index + 1] : null;

  // Every encyclopedia article whose «اذهب من هنا» links name this lesson.
  const backlinks = allKbModules
    .flatMap(m => m.articles)
    .filter(a => a.links.some(l => l.kind === 'lesson' && l.targetId === lesson.id))
    .map(a => ({ id: a.id, titleAr: a.titleAr, href: href({ kind: 'article', id: a.id }) }))
    .filter((a): a is { id: string; titleAr: string; href: string } => !!a.href);

  return (
    <div className="shell lj-col" style={{ paddingTop: 30, paddingBottom: 46 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.lessons}>الدروس</Link> <span aria-hidden>/</span>{' '}
        <span aria-current="page">{track?.titleAr ?? 'درس'}</span>
      </nav>

      <header style={{ marginTop: 10 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: 'var(--accent-ink)' }}>
          الدرس {lesson.number} من {lessonsData.length}{track ? ` · ${track.titleAr}` : ''}
        </p>
        <h1 className="page-title" style={{ marginTop: 4 }}>{lesson.title}</h1>
        <p className="page-lede">{lesson.description}</p>
        <div className="lj-meta" style={{ marginTop: 12 }}>
          <span className="lj-chip">{lesson.duration}</span>
          <span className="lj-chip">{stageCountLabel(definition.stages.length)}</span>
          <span className="lj-chip">يُحفظ تقدّمك تلقائياً</span>
        </div>
      </header>

      <div style={{ marginTop: 26 }}>
        <LessonJourneyClient lessonId={lesson.id} />
      </div>

      {/* The lesson's own summary — in the HTML for crawlers and for anyone
          reading without JavaScript. Collapsed so it never competes with the
          journey above it. */}
      <details className="card-sm" style={{ marginTop: 30, padding: '14px 18px' }} data-testid="lesson-summary">
        <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>ملخّص الدرس للقراءة السريعة</summary>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, fontSize: 14, lineHeight: 1.9, color: 'var(--text-dim)' }}>
          <p style={{ margin: 0 }}><strong style={{ color: 'var(--text)' }}>الهدف:</strong> {lesson.objective}</p>
          <p style={{ margin: 0 }}>{lesson.explanation}</p>
          <div>
            <strong style={{ color: 'var(--text)' }}>نقاط مهمة:</strong>
            <ul style={{ margin: '6px 0 0', paddingInlineStart: 20 }}>
              {lesson.importantPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <p style={{ margin: 0 }}><strong style={{ color: 'var(--sev-warning)' }}>الخطأ الشائع:</strong> {lesson.commonMistake}</p>
          {lesson.warning && <p style={{ margin: 0 }}><strong style={{ color: 'var(--sev-blocker)' }}>تحذير:</strong> {lesson.warning}</p>}
        </div>
      </details>

      {backlinks.length > 0 && (
        <section style={{ marginTop: 30 }} aria-labelledby="backlinks-h" data-testid="lesson-backlinks">
          <h2 id="backlinks-h" style={{ fontSize: 15, fontWeight: 900, margin: '0 0 10px' }}>مقالات الموسوعة التي تُحيل إلى هذا الدرس</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {backlinks.map(b => (
              <li key={b.id}>
                <Link href={b.href} className="card-sm" style={{ display: 'block', padding: '11px 14px', fontSize: 13.5, color: 'var(--text-dim)' }}>
                  {b.titleAr}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="الدرس السابق والتالي" style={{ marginTop: 30, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {prev && href({ kind: 'lesson', id: prev.id }) && (
          <Link href={href({ kind: 'lesson', id: prev.id })!} className="card-sm" style={{ flex: 1, minWidth: 200, padding: '12px 14px', display: 'block' }} data-testid="lesson-prev-link">
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dimmer)' }}>السابق</span>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{prev.title}</span>
          </Link>
        )}
        {next && href({ kind: 'lesson', id: next.id }) && (
          <Link href={href({ kind: 'lesson', id: next.id })!} className="card-sm" style={{ flex: 1, minWidth: 200, padding: '12px 14px', display: 'block', borderColor: 'var(--border-accent)' }} data-testid="lesson-next-link">
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--accent-ink)' }}>التالي</span>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
