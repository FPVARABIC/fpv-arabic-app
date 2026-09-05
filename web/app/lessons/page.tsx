import Link from 'next/link';
import type { Metadata } from 'next';
import { lessonsData } from '@core/data/lessonsData';
import { groupLessonsByTrack, lessonCountLabel, stageCountLabel } from '@core/data/lessons/lessonTracks';
import { getLessonJourneyDefinition } from '@core/data/lessons/journeyRegistry';
import { enrichJourneyDefinition } from '@core/data/lessons/lessonJourneyEnrich';
import { href, SECTION_ROUTES } from '@/lib/webRoutes';
import {
  ResumeCard, LessonsProgressBar, LessonNumberBadge, LessonStatusChips,
} from '@/components/lessons/indexIslands';

export const metadata: Metadata = {
  title: 'الدروس — مسار المبتدئ من الصفر حتى أول تحليق',
  description:
    'سبعة عشر درساً تفاعلياً بالعربية في أربع محطّات: الأساسيات، الكهرباء والسلامة، التركيب، '
    + 'والطيران. كل درس رحلة مرحلية بأسئلة تحقّق ومخطّطات تفاعلية، وتقدّمك يُحفظ في متصفّحك.',
  alternates: { canonical: SECTION_ROUTES.lessons },
  openGraph: { type: 'website', title: 'الدروس — FPVARABIC' },
};

/**
 * The lessons index — the beginner path, as a map.
 *
 * WHAT IS SERVER-RENDERED AND WHAT IS NOT
 * ---------------------------------------
 * The seventeen lessons, their stations, titles, descriptions, durations and
 * stage counts are content, and arrive in the HTML. What this reader has done
 * with them — completed, in progress, suggested — is personal and lives in the
 * browser; the islands in `indexIslands.tsx` add it after hydration. The page
 * is therefore complete for a crawler and honest for a person: nothing it
 * shows before JavaScript runs is later contradicted.
 *
 * WHY THE WHOLE CARD IS THE LINK
 * ------------------------------
 * The phone app's list navigated only from a 32px arrow button — the title and
 * description did nothing on tap. Here the card IS the anchor.
 *
 * NO LOCK
 * -------
 * Any lesson opens in any order. The path is a suggestion the chips
 * highlight, never a gate — the owner's decision, recorded in
 * `docs/LESSONS-REBUILD-PLAN.md`.
 */
export default function LessonsIndex() {
  const groups = groupLessonsByTrack(lessonsData);

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <span aria-current="page">الدروس</span>
      </nav>

      <h1 className="page-title" style={{ marginTop: 10 }}>الدروس</h1>
      <p className="page-lede">
        {lessonCountLabel(lessonsData.length)} في أربع محطّات، من «ما هو الكوادكابتر؟» حتى أول تحليق.
        كل درس رحلة مرحلية: شرح قصير، ثم سؤال، ثم مخطّط تضغط عليه بنفسك. تقدّمك — كل إجابة
        وكل مرحلة — يُحفظ في هذا المتصفّح وتعود إليه متى شئت.
      </p>

      <div style={{ marginTop: 22, display: 'grid', gap: 14 }}>
        <ResumeCard />
        <LessonsProgressBar total={lessonsData.length} />
      </div>

      {groups.map(g => (
        <section key={g.id} className="lj-track" aria-labelledby={`track-${g.id}`} data-testid={`lesson-track-${g.id}`}>
          <div className="lj-track-head">
            <div>
              <h2 id={`track-${g.id}`} className="accent-head">{g.titleAr}</h2>
              <p>{g.subtitleAr}</p>
            </div>
            <span className="lj-chip">{lessonCountLabel(g.lessons.length)}</span>
          </div>

          <div className="lj-grid">
            {g.lessons.map(lesson => {
              const to = href({ kind: 'lesson', id: lesson.id });
              const base = getLessonJourneyDefinition(lesson.id);
              const stageCount = base ? enrichJourneyDefinition(base, lesson).stages.length : 0;
              if (!to) return null;
              return (
                <Link
                  key={lesson.id}
                  href={to}
                  className="card card-link lj-lesson-card"
                  data-testid={`lesson-card-${lesson.id}`}
                >
                  <LessonNumberBadge lessonId={lesson.id} number={lesson.number} />
                  <div>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.description}</p>
                    <div className="lj-meta">
                      <span className="lj-chip">{lesson.duration}</span>
                      <span className="lj-chip">{stageCountLabel(stageCount)}</span>
                      <LessonStatusChips lessonId={lesson.id} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
