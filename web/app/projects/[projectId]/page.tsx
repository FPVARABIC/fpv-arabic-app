import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { resolvedProject, visibleProjects } from '@/lib/server/projects';
import { publishedProducts } from '@/lib/server/storeCatalogue';
import { ALL_PROJECTS } from '@core/data/projects/registry';
import {
  DIFFICULTY_LABEL_AR, DIFFICULTY_MEANS_AR, projectCategory,
} from '@core/data/projects/types';
import type { Project } from '@core/data/projects/types';
import type { RefContext } from '@/lib/projectLinks';
import { PlatformRefLink } from '@/components/projects/PlatformRefLink';

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
 * One project, whole — and connected to the rest of the platform.
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
 * THE ORDER IS THE ARGUMENT
 * -------------------------
 * It answers a reader's questions in the order they actually ask them:
 *
 *   what is it · what will I learn · what must I already know ·
 *   how hard is it · what does it use · what do I buy · what do I install ·
 *   what do these words mean · how is it built · how does it work ·
 *   what do I do first · what is it for · what will go wrong ·
 *   where does it go next · where did this come from
 *
 * «ما الذي يجب أن تتعلّمه أوّلاً» sits at position four on purpose. Putting it
 * after the parts list — where a bill of materials naturally wants to go —
 * means somebody has already priced a €600 build before finding out it needs
 * ROS. Putting it before difficulty means the difficulty badge arrives with
 * evidence rather than as an assertion.
 *
 * WHY THE CHALLENGES CARRY THEIR MITIGATIONS
 * ------------------------------------------
 * A list of difficulties with no answers is discouragement dressed as honesty.
 * The model requires both, so this page cannot render one without the other.
 *
 * WHY THIS PAGE HAS NO CONTENT OF ITS OWN ABOUT PARTS, PROGRAMS OR TERMS
 * ----------------------------------------------------------------------
 * Because those already exist — in the shop, in the software centre, in the
 * encyclopedia — and a second copy here is a second thing that goes stale. Every
 * one of them is a `PlatformRef` resolved through `lib/projectLinks.ts`, which
 * either produces a link to the real page or says plainly that it does not exist
 * yet. There is deliberately no third outcome and no hand-written path.
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

  /*
   * The live shop, not the seeds.
   *
   * A project written months ago cannot know that a product was unpublished
   * yesterday, and `/store/p/:id` calls `notFound()` for one that was. Reading
   * the merged catalogue here turns that into a part rendered without a link
   * instead of a reader's click landing on a 404.
   */
  const ctx: RefContext = {
    publishedProductIds: new Set((await publishedProducts()).map(x => x.id)),
  };

  const sections: { id: string; titleAr: string }[] = [
    { id: 'idea', titleAr: 'الفكرة والهدف' },
    { id: 'outcomes', titleAr: 'ماذا ستتعلّم من هذا المشروع' },
    { id: 'prerequisites', titleAr: 'ما الذي يجب أن تتعلّمه أوّلاً' },
    { id: 'difficulty', titleAr: 'مستوى الصعوبة' },
    { id: 'skills', titleAr: 'التقنيات المستخدمة' },
    { id: 'parts', titleAr: 'القطع المطلوبة' },
    { id: 'software', titleAr: 'البرامج المطلوبة' },
    { id: 'glossary', titleAr: 'المصطلحات المهمّة' },
    { id: 'architecture', titleAr: 'مخطّط البناء' },
    { id: 'flow', titleAr: 'طريقة العمل' },
    { id: 'stages', titleAr: 'مراحل التنفيذ' },
    { id: 'applications', titleAr: 'التطبيقات العملية' },
    { id: 'challenges', titleAr: 'التحدّيات' },
    { id: 'future', titleAr: 'التطوير المستقبلي' },
    { id: 'references', titleAr: 'المصادر' },
  ];

  const essential = p.prerequisites.filter(q => q.essential);
  const helpful = p.prerequisites.filter(q => !q.essential);

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
          {/* 1 — the title */}
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

            <p style={{ fontSize: 16, color: 'var(--text)', margin: '20px 0 0', lineHeight: 2.05 }}>
              {p.definitionAr}
            </p>
          </header>

          {/* 2 — the idea */}
          <Section id="idea" titleAr="الفكرة والهدف">
            <h3 style={H3}>الفكرة</h3>
            <p>{p.ideaAr}</p>
            <h3 style={H3}>لماذا بُني</h3>
            <p>{p.purposeAr}</p>
          </Section>

          {/* 3 — what the reader leaves with */}
          <Section id="outcomes" titleAr="ماذا ستتعلّم من هذا المشروع">
            <p style={LEAD}>
              هذه القائمة هي المعيار الذي تختار به بين مشروع وآخر: ما ستصير قادراً
              على فعله بعده، لا ما سيثير إعجابك أثناءه.
            </p>
            <Bullets items={p.learningOutcomesAr} testId="project-outcome" />
          </Section>

          {/* 4 — what the reader must arrive with */}
          <Section id="prerequisites" titleAr="ما الذي يجب أن تتعلّمه أوّلاً">
            <p style={LEAD}>
              كل بند هنا مرتبط بمكانه داخل المنصّة. وما لم نغطّه بعد مكتوب كذلك
              صراحةً — لأن رابطاً لا يفتح شيئاً أسوأ من الاعتراف بأن المحتوى لم يُكتب.
            </p>

            {essential.length > 0 && (
              <>
                <h3 style={H3}>لن تبدأ بدونها</h3>
                <PrereqList items={essential} ctx={ctx} tone="essential" />
              </>
            )}
            {helpful.length > 0 && (
              <>
                <h3 style={H3}>ستساعدك كثيراً</h3>
                <PrereqList items={helpful} ctx={ctx} tone="helpful" />
              </>
            )}
          </Section>

          {/* 5 — difficulty, as a promise rather than a badge */}
          <Section id="difficulty" titleAr="مستوى الصعوبة">
            <div className="card" style={{ padding: '15px 17px' }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 17 }}>{DIFFICULTY_LABEL_AR[p.difficulty]}</strong>
                <span className="project-badge">
                  <span dir="ltr">{p.estimatedWeeks.min}–{p.estimatedWeeks.max}</span> أسبوعاً
                </span>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '9px 0 0', lineHeight: 2 }}>
                {DIFFICULTY_MEANS_AR[p.difficulty]}
              </p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '10px 0 0', lineHeight: 1.9 }}>
              المدّة تقدير لساعات فراغ لا لدوام كامل، وتفترض أنك تملك ما في القسم
              السابق. من ينقصه شرط أساسي فليضف زمن تعلّمه.
            </p>
          </Section>

          {/* 6 — the technologies */}
          <Section id="skills" titleAr="التقنيات المستخدمة">
            <p style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: 0 }}>
              {p.skillsAr.map(s => <span key={s} className="project-badge">{s}</span>)}
            </p>
          </Section>

          {/* 7 — the parts, pointed at the shop */}
          <Section id="parts" titleAr="القطع المطلوبة">
            <p style={LEAD}>
              ما نبيعه مرتبط بصفحته في المتجر. وما لا نبيعه مكتوب من أين يُشترى فعلاً،
              لأن «قطعة بلا مصدر» ليست معلومة.
            </p>
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
                  <p style={{ margin: '9px 0 0' }}>
                    <PlatformRefLink refTo={part.ref} ctx={ctx} testId="project-part-ref" />
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          {/* 8 — the software, pointed at the software centre */}
          <Section id="software" titleAr="البرامج المطلوبة">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 11 }}>
              {p.software.map(s => (
                <li key={s.nameEn} className="card-sm" style={{ padding: '12px 15px' }}>
                  <strong className="ltr" style={{ fontSize: 13.5 }}>{s.nameEn}</strong>
                  <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '5px 0 0', lineHeight: 1.9 }}>
                    {s.roleAr}
                  </p>
                  <p style={{ margin: '8px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <PlatformRefLink refTo={s.ref} ctx={ctx} testId="project-software-ref" />
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--accent-ink)', fontSize: 12 }}>
                        التوثيق الرسمي ↗
                      </a>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          {/* 9 — the vocabulary, pointed at the encyclopedia */}
          <Section id="glossary" titleAr="المصطلحات المهمّة">
            <p style={LEAD}>
              لا نشرح هنا ما شرحته الموسوعة — نفتحه. والمصطلح الذي لم تصل إليه
              الموسوعة بعد يحمل سطراً واحداً يكفيك لمواصلة القراءة، وموعداً.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 9 }}>
              {p.glossary.map(t => (
                <li key={t.termEn} className="card-sm" style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 13.5 }}>{t.termAr}</strong>
                    <span className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                      {t.termEn}
                    </span>
                    <PlatformRefLink refTo={t.ref} ctx={ctx} testId="project-term-ref" />
                  </div>
                  {t.hintAr && (
                    <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.85 }}>
                      {t.hintAr}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          {/* 10 — the architecture (kept from the first batch) */}
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

          {/* 11 — how it actually works (kept) */}
          <Section id="flow" titleAr="طريقة العمل">
            <p>{p.dataFlowAr}</p>
          </Section>

          {/* 12 — the stages */}
          <Section id="stages" titleAr="مراحل التنفيذ">
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

          {/* 13 — what it is for (kept) */}
          <Section id="applications" titleAr="التطبيقات العملية">
            <Bullets items={p.applicationsAr} />
          </Section>

          {/* 14 — the challenges */}
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

          {/* 15 — where it goes next */}
          <Section id="future" titleAr="التطوير المستقبلي">
            <Bullets items={p.futureAr} />
          </Section>

          {/* 16 — where this came from */}
          <Section id="references" titleAr="المصادر">
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

const LEAD: React.CSSProperties = {
  fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.95, margin: '0 0 14px',
};

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

/**
 * The prerequisites, split by whether they block the project or merely help.
 *
 * Split rather than flagged, because a reader scanning this section is asking
 * one question — «can I start?» — and a list where the answer is a badge on
 * every third row makes them read all of it to find out.
 */
const PrereqList: React.FC<{
  items: Project['prerequisites'];
  ctx: RefContext;
  tone: 'essential' | 'helpful';
}> = ({ items, ctx, tone }) => (
  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
    {items.map(q => (
      <li
        key={q.titleAr}
        className="card-sm"
        data-testid={`project-prereq-${tone}`}
        style={{ padding: '13px 15px' }}
      >
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <strong style={{ fontSize: 14 }}>{q.titleAr}</strong>
          {q.titleEn && (
            <span className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>
              {q.titleEn}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '7px 0 0', lineHeight: 1.9 }}>
          {q.whyAr}
        </p>
        <p style={{ margin: '9px 0 0' }}>
          <PlatformRefLink refTo={q.ref} ctx={ctx} testId="project-prereq-ref" />
        </p>
      </li>
    ))}
  </ul>
);

const Bullets: React.FC<{ items: string[]; testId?: string }> = ({ items, testId }) => (
  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 9 }}>
    {items.map(t => (
      <li key={t} data-testid={testId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
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
