import Link from 'next/link';
import type { Metadata } from 'next';
import { visibleProjects } from '@/lib/server/projects';
import { byDifficulty, activeCategories } from '@core/data/projects/registry';
import {
  PROJECT_CATEGORIES, DIFFICULTY_LABEL_AR, DIFFICULTY_MEANS_AR,
  type ProjectCategoryId,
} from '@core/data/projects/types';
import { ProjectCard } from '@/components/projects/ProjectCard';

export const metadata: Metadata = {
  title: 'المشاريع',
  description:
    'مكتبة مشاريع الطيران بالمنظور الأول والذكاء الاصطناعي بالعربية: تتبّع بصري، '
    + 'وطيران بلا GPS، وتجنّب عوائق، وأسراب، ومسح زراعي — بشرح كامل ومصادر.',
  alternates: { canonical: '/projects' },
};

export const revalidate = 300;

/**
 * The project library's front page.
 *
 * WHY DIFFICULTY IS EXPLAINED AND NOT JUST LABELLED
 * -------------------------------------------------
 * «متقدّم» tells a reader nothing about whether it is for them. The question
 * behind the label is always «can I do this?», and the only useful answer names
 * what you must already be able to do. So the four levels are spelled out at the
 * top, once, rather than left as badges people interpret differently.
 *
 * WHY THE FILTER IS LINKS AND NOT A CLIENT COMPONENT
 * --------------------------------------------------
 * A category filter that lives in component state cannot be shared, bookmarked
 * or found by a search engine — and the whole point of this section is that
 * somebody searching «مشروع تتبّع درون بالعربية» lands on it. Query-string
 * filtering keeps every view a real URL and needs no JavaScript at all.
 */
export default async function ProjectsPage(
  { searchParams }: { searchParams: Promise<{ category?: string }> },
) {
  const { category } = await searchParams;
  const all = await visibleProjects();

  const active = activeCategories(all);
  const known = PROJECT_CATEGORIES.filter(c => active.includes(c.id));
  const selected = category && active.includes(category as ProjectCategoryId)
    ? (category as ProjectCategoryId)
    : null;

  const shown = byDifficulty(
    selected ? all.filter(p => p.categoryIds.includes(selected)) : all,
  );

  const qs = (c: ProjectCategoryId | null) => (c ? `/projects?category=${c}` : '/projects');

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 32 }}>
      {/* Content first: title, one line, then straight to the filters and
          the projects themselves. The difficulty-levels explainer and the
          honest count moved BELOW the grid — useful context, but nobody
          opens «المشاريع» to read about the section before seeing one. */}
      <header style={{ maxWidth: 780 }}>
        <h1 className="page-title">المشاريع</h1>
        <p className="page-lede">
          مشاريع حقيقية تجمع الطيران بالذكاء الاصطناعي والرؤية الحاسوبية —
          مشروحة بالكامل حتى مصادرها.
        </p>
      </header>

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <nav aria-label="تصفية حسب التصنيف" style={{ marginTop: 18 }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          <li>
            <Link
              href={qs(null)}
              className="card-sm"
              data-testid="projects-filter-all"
              aria-current={!selected ? 'page' : undefined}
              style={{
                display: 'inline-block', padding: '6px 14px', fontSize: 12.5,
                color: !selected ? 'var(--accent-ink)' : 'var(--text-dim)',
                fontWeight: !selected ? 800 : 600,
              }}
            >
              الكل
            </Link>
          </li>
          {known.map(c => (
            <li key={c.id}>
              <Link
                href={qs(c.id)}
                className="card-sm"
                data-testid={`projects-filter-${c.id}`}
                aria-current={selected === c.id ? 'page' : undefined}
                style={{
                  display: 'inline-block', padding: '6px 14px', fontSize: 12.5,
                  color: selected === c.id ? 'var(--accent-ink)' : 'var(--text-dim)',
                  fontWeight: selected === c.id ? 800 : 600,
                }}
              >
                {c.titleAr}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {selected && (
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '14px 0 0', lineHeight: 1.9 }}>
          {PROJECT_CATEGORIES.find(c => c.id === selected)?.blurbAr}
        </p>
      )}

      {/* ── The cards ───────────────────────────────────────────────────── */}
      <section aria-label="قائمة المشاريع" style={{ marginTop: 22 }}>
        {shown.length === 0 ? (
          <p className="card-sm" data-testid="projects-empty" style={{ padding: '22px 24px', fontSize: 13.5 }}>
            لا مشروع في هذا التصنيف بعد.
          </p>
        ) : (
          <div className="project-grid" data-testid="projects-grid">
            {shown.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </section>

      {/* ── What the levels mean — after the content it describes ───────── */}
      <section aria-labelledby="levels-h" style={{ marginTop: 34 }}>
        <h2 id="levels-h" style={{ fontSize: 15, fontWeight: 900, margin: '0 0 12px' }}>
          مستويات الصعوبة
        </h2>
        <div
          style={{
            display: 'grid', gap: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          }}
        >
          {(Object.keys(DIFFICULTY_LABEL_AR) as (keyof typeof DIFFICULTY_LABEL_AR)[]).map(d => (
            <div key={d} className="card-sm" style={{ padding: '13px 15px' }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 900, margin: 0 }}>
                {DIFFICULTY_LABEL_AR[d]}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.85 }}>
                {DIFFICULTY_MEANS_AR[d]}
              </p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '14px 0 0', lineHeight: 1.9 }}>
          <span dir="ltr">{all.length}</span> مشاريع منشورة. هذه المرحلة الأولى —
          العدد صغير عن قصد، والمعيار أن يستحقّ كل مشروع صفحته. كل مشروع مشروح
          بالكامل: الفكرة، والبنية، والقطع، والبرامج، ومراحل البناء، والتحدّيات
          التي ستقابلك فعلاً، ومصادره الأصلية.
        </p>
      </section>
    </div>
  );
}
