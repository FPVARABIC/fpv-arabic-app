import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { resolvedProject, visibleProjects } from '@/lib/server/projects';
import { ALL_PROJECTS } from '@core/data/projects/registry';
import {
  DIFFICULTY_LABEL_AR, DIFFICULTY_MEANS_AR, projectCategory,
} from '@core/data/projects/types';
import type { Project } from '@core/data/projects/types';

export const revalidate = 300;

export function generateStaticParams() {
  return ALL_PROJECTS.filter(p => p.published).map(p => ({ projectId: p.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Metadata> {
  const { projectId } = await params;
  const p = await resolvedProject(projectId);
  if (!p || !p.published) return { title: 'غير موجود' };
  return {
    title: p.titleAr,
    description: p.summaryAr,
    alternates: { canonical: `/projects/${p.id}` },
    openGraph: { type: 'article', title: `${p.titleAr} — FPVARABIC`, description: p.summaryAr },
  };
}

/**
 * One project, whole.
 *
 * WHY IT IS ONE LONG PAGE AND NOT TABS
 * ------------------------------------
 * Somebody deciding whether to spend two months on a build reads it end to end
 * once, then returns to two sections repeatedly — the parts list and the
 * challenges. Tabs optimise for the second visit and punish the first, and they
 * hide exactly the section a reader most needs to see before committing: the
 * one listing what will go wrong. A side index gives the return visit its
 * shortcut without hiding anything.
 *
 * WHY THE CHALLENGES CARRY THEIR MITIGATIONS
 * ------------------------------------------
 * A list of difficulties with no answers is discouragement dressed as honesty.
 * The model requires both, so this page cannot render one without the other.
 */
export default async function ProjectPage(
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const p = await resolvedProject(projectId);
  if (!p || !p.published) notFound();

  const others = (await visibleProjects())
    .filter(o => o.id !== p.id && o.categoryIds.some(c => p.categoryIds.includes(c)))
    .slice(0, 3);

  const sections: { id: string; titleAr: string }[] = [
    { id: 'idea', titleAr: 'الفكرة والهدف' },
    { id: 'outcomes', titleAr: 'ماذا ستتعلّم' },
    { id: 'requirements', titleAr: 'المهارات والقطع والبرامج' },
    { id: 'architecture', titleAr: 'مخطّط البناء' },
    { id: 'flow', titleAr: 'طريقة العمل' },
    { id: 'stages', titleAr: 'مراحل البناء' },
    { id: 'applications', titleAr: 'التطبيقات العملية' },
    { id: 'challenges', titleAr: 'التحدّيات' },
    { id: 'future', titleAr: 'التطوير المستقبلي' },
    { id: 'references', titleAr: 'المراجع' },
  ];

  return (
    <div className="shell" style={{ paddingTop: 32, paddingBottom: 28 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href="/projects">المشاريع</Link> <span aria-hidden>/</span> {p.titleAr}
      </nav>

      <div className="with-index" style={{ marginTop: 18 }}>
        {/* ── The index ─────────────────────────────────────────────────── */}
        <nav aria-label="محتويات المشروع" className="index-nav">
          <p style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-dimmer)', margin: '0 0 8px' }}>
            محتويات المشروع
          </p>
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`}>{s.titleAr}</a>
          ))}
        </nav>

        {/* ── The project ───────────────────────────────────────────────── */}
        <article style={{ minWidth: 0 }} className="prose">
          <header>
            <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0, lineHeight: 1.45 }}>
              {p.titleAr}
            </h1>
            <p className="ltr" style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '6px 0 0' }}>
              {p.titleEn}
            </p>

            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', margin: '14px 0 0' }}>
              <span className="project-badge" data-testid="project-difficulty">
                {DIFFICULTY_LABEL_AR[p.difficulty]}
              </span>
              <span className="project-badge">
                <span dir="ltr">{p.estimatedWeeks.min}–{p.estimatedWeeks.max}</span> أسبوعاً
              </span>
              {p.categoryIds.map(c => (
                <span key={c} className="project-badge">{projectCategory(c)?.titleAr ?? c}</span>
              ))}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '10px 0 0' }}>
              {DIFFICULTY_MEANS_AR[p.difficulty]}
            </p>

            <p style={{ fontSize: 16, color: 'var(--text)', margin: '20px 0 0', lineHeight: 2.05 }}>
              {p.definitionAr}
            </p>
          </header>

          <Section id="idea" titleAr="الفكرة والهدف">
            <h3 style={H3}>الفكرة</h3>
            <p>{p.ideaAr}</p>
            <h3 style={H3}>لماذا بُني</h3>
            <p>{p.purposeAr}</p>
          </Section>

          <Section id="outcomes" titleAr="ماذا ستتعلّم">
            <Bullets items={p.learningOutcomesAr} />
          </Section>

          <Section id="requirements" titleAr="المهارات والقطع والبرامج">
            <h3 style={H3}>المهارات المطلوبة</h3>
            <p style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {p.skillsAr.map(s => <span key={s} className="project-badge">{s}</span>)}
            </p>

            <h3 style={H3}>القطع</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              {p.parts.map(part => (
                <li key={part.nameEn} className="card-sm" style={{ padding: '13px 15px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{part.nameAr}</strong>
                    {part.critical && (
                      <span className="project-badge" style={{ color: 'var(--sev-blocker)', borderColor: 'var(--sev-blocker)' }}>
                        لا بديل عنها
                      </span>
                    )}
                  </div>
                  <p className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '3px 0 0' }}>
                    {part.nameEn}
                  </p>
                  <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '7px 0 0', lineHeight: 1.9 }}>
                    {part.whyAr}
                  </p>
                </li>
              ))}
            </ul>

            <h3 style={H3}>البرامج</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              {p.software.map(s => (
                <li key={s.nameEn} style={{ fontSize: 13.5, lineHeight: 1.9 }}>
                  <strong className="ltr">{s.nameEn}</strong>
                  <span style={{ color: 'var(--text-dim)' }}> — {s.roleAr}</span>
                  {s.url && (
                    <>
                      {' '}
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--accent-ink)', fontSize: 12 }}>
                        التوثيق ↗
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="architecture" titleAr="مخطّط البناء">
            <p>{p.architectureIntroAr}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 10 }}>
              {p.components.map((c, i) => (
                <li key={c.nameAr} className="card-sm" style={{ padding: '13px 15px' }}>
                  <div style={{ display: 'flex', gap: 9, alignItems: 'baseline' }}>
                    <span dir="ltr" style={{ fontSize: 11, fontWeight: 900, color: 'var(--accent-ink)' }}>
                      {i + 1}
                    </span>
                    <strong style={{ fontSize: 14 }}>{c.nameAr}</strong>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.9 }}>
                    {c.roleAr}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="flow" titleAr="طريقة العمل">
            <p>{p.dataFlowAr}</p>
          </Section>

          <Section id="stages" titleAr="مراحل البناء">
            <ol style={{ padding: 0, margin: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
              {p.stages.map((s, i) => (
                <li key={s.titleAr} className="card" style={{ padding: '15px 17px' }}>
                  <h3 style={{ fontSize: 14.5, fontWeight: 900, margin: 0 }}>
                    <span dir="ltr" style={{ color: 'var(--accent-ink)' }}>{i + 1}.</span>{' '}
                    {s.titleAr}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '7px 0 0', lineHeight: 1.95 }}>
                    {s.bodyAr}
                  </p>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="applications" titleAr="التطبيقات العملية">
            <Bullets items={p.applicationsAr} />
          </Section>

          <Section id="challenges" titleAr="التحدّيات">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
              {p.challenges.map(c => (
                <li key={c.titleAr} className="card" style={{ padding: '15px 17px' }}>
                  <h3 style={{ fontSize: 14.5, fontWeight: 900, margin: 0, color: 'var(--sev-warning)' }}>
                    {c.titleAr}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '7px 0 0', lineHeight: 1.95 }}>
                    {c.bodyAr}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: '9px 0 0', lineHeight: 1.95 }}>
                    <strong style={{ color: 'var(--sev-ok)' }}>كيف تتعامل معها: </strong>
                    {c.mitigationAr}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="future" titleAr="التطوير المستقبلي">
            <Bullets items={p.futureAr} />
          </Section>

          <Section id="references" titleAr="المراجع">
            <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
              المشاريع المفتوحة أدناه ملك أصحابها وتخضع لرخصها. الشرح في هذه الصفحة
              من كتابتنا، ولا نُعيد نشر شيفرة أو محتوى لا تسمح رخصته بذلك.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 10 }}>
              {p.references.map(r => (
                <li key={r.url} className="card-sm" style={{ padding: '12px 15px' }}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--accent-ink)' }}
                  >
                    {r.titleAr} ↗
                  </a>
                  <p className="ltr" style={{ fontSize: 11, color: 'var(--text-dimmer)', margin: '4px 0 0', overflowWrap: 'anywhere' }}>
                    {r.url}
                  </p>
                  {r.licence && (
                    <p style={{ fontSize: 11.5, color: 'var(--sev-warning)', margin: '5px 0 0' }}>
                      الرخصة: <span className="ltr">{r.licence}</span>
                    </p>
                  )}
                  {r.noteAr && (
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '5px 0 0', lineHeight: 1.85 }}>
                      {r.noteAr}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          {others.length > 0 && (
            <section style={{ marginTop: 44 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 12px' }}>مشاريع قريبة</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 9 }}>
                {others.map(o => (
                  <li key={o.id}>
                    <Link href={`/projects/${o.id}`} className="card-sm" style={{ display: 'block', padding: '13px 15px' }}>
                      <strong style={{ fontSize: 14 }}>{o.titleAr}</strong>
                      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '5px 0 0', lineHeight: 1.85 }}>
                        {o.summaryAr}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '30px 0 0' }}>
            روجعت الصفحة {p.lastReviewed}
          </p>
        </article>
      </div>
    </div>
  );
}

const H3: React.CSSProperties = { fontSize: 16, fontWeight: 800, margin: '22px 0 8px' };

const Section: React.FC<{ id: string; titleAr: string; children: React.ReactNode }> = (
  { id, titleAr, children },
) => (
  <section id={id} data-testid={`project-section-${id}`} style={{ marginTop: 40, scrollMarginTop: 80 }}>
    <h2
      style={{
        fontSize: 21, fontWeight: 900, margin: '0 0 14px',
        paddingBottom: 9, borderBottom: '1px solid var(--border-soft)',
      }}
    >
      {titleAr}
    </h2>
    {children}
  </section>
);

const Bullets: React.FC<{ items: string[] }> = ({ items }) => (
  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 9 }}>
    {items.map(t => (
      <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span
          aria-hidden
          style={{
            width: 5, height: 5, borderRadius: 999, background: 'var(--accent-ink)',
            marginTop: 11, flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 2 }}>{t}</span>
      </li>
    ))}
  </ul>
);
