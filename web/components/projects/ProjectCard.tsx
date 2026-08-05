import Link from 'next/link';
import type { Project } from '@core/data/projects/types';
import { DIFFICULTY_LABEL_AR, projectCategory } from '@core/data/projects/types';

/**
 * One project, as a card.
 *
 * WHY THE PLACEHOLDER IS TYPED AND NOT A GREY BOX
 * -----------------------------------------------
 * No project has a photograph yet — the owner supplies those. A grey rectangle
 * reads as a broken image and makes a finished section look unfinished; a panel
 * carrying the project's own initial and category reads as a deliberate state.
 * The same reasoning the store's image placeholder already uses.
 *
 * WHY DIFFICULTY IS A BADGE AND CATEGORY IS TEXT
 * ----------------------------------------------
 * They answer different questions. Difficulty is a filter — «can I do this» —
 * and belongs where the eye lands first. Category is context, and a row of five
 * coloured chips per card turns a grid into confetti.
 */

const DIFFICULTY_TONE: Record<Project['difficulty'], string> = {
  beginner: 'var(--sev-ok)',
  intermediate: 'var(--accent-ink)',
  advanced: 'var(--sev-warning)',
  research: 'var(--sys-expresslrs)',
};

export const ProjectCard: React.FC<{ project: Project }> = ({ project: p }) => {
  const categories = p.categoryIds
    .map(id => projectCategory(id)?.titleAr)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <article className="card project-card" data-testid={`project-card-${p.id}`}>
      {p.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.imageUrl}
          alt={p.titleAr}
          className="project-card-media"
          loading="lazy"
        />
      ) : (
        <div className="project-card-media project-card-placeholder" aria-hidden>
          <span>{p.titleAr.trim().charAt(0)}</span>
        </div>
      )}

      <div className="project-card-body">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            className="project-badge"
            style={{ color: DIFFICULTY_TONE[p.difficulty], borderColor: DIFFICULTY_TONE[p.difficulty] }}
            data-testid={`project-difficulty-${p.id}`}
          >
            {DIFFICULTY_LABEL_AR[p.difficulty]}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-dimmer)' }}>
            <span dir="ltr">{p.estimatedWeeks.min}–{p.estimatedWeeks.max}</span> أسبوعاً
          </span>
        </div>

        <h3 style={{ fontSize: 16.5, fontWeight: 900, margin: '10px 0 0', lineHeight: 1.55 }}>
          {p.titleAr}
        </h3>
        <p className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '4px 0 0' }}>
          {p.titleEn}
        </p>

        <p
          style={{
            fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9,
            margin: '10px 0 0', flex: 1,
          }}
        >
          {p.summaryAr}
        </p>

        <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '12px 0 0' }}>
          {categories.join(' · ')}
        </p>

        <p style={{ margin: '14px 0 0' }}>
          <Link
            href={`/projects/${p.id}`}
            className="btn-primary"
            data-testid={`project-open-${p.id}`}
          >
            استكشف المشروع
          </Link>
        </p>
      </div>
    </article>
  );
};
