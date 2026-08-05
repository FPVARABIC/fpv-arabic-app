import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { resolvedProjects } from '@/lib/server/projects';
import { AdminShell } from '@/components/admin/AdminShell';
import { ProjectPublishToggle } from '@/components/admin/ProjectPublishToggle';
import { ALL_PROJECTS } from '@core/data/projects/registry';
import { DIFFICULTY_LABEL_AR, refIsLinkable } from '@core/data/projects/types';
import type { Project } from '@core/data/projects/types';
import { can } from '@core/data/auth/roles';

export const metadata: Metadata = {
  title: 'المشاريع — الإدارة',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Every project, with the two numbers that matter for this section.
 *
 * WHY THE «روابط» COLUMN IS HERE AND NOT ON THE PUBLIC PAGE
 * ---------------------------------------------------------
 * Because it is a backlog, not a feature. Each project points at parts,
 * programs, prerequisites and terms; some of those resolve to real pages and
 * some are honestly marked «سيضاف لاحقاً». Counting them per project turns the
 * question «what is the encyclopedia missing?» from an impression into a sorted
 * list — the third project down needs eleven articles written, and now somebody
 * can see that without opening it.
 *
 * A reader has no use for that number. The person who has to write the articles
 * has nothing else.
 */
export default async function AdminProjectsPage() {
  const session = await getSession();
  if (!session || !sessionCan(session, 'admin.access')) redirect('/');
  if (!can(session.role, 'content.edit')) redirect('/admin');

  if (!isAdminConfigured()) {
    return (
      <div className="shell">
        <p className="card" data-testid="admin-unconfigured" style={{ padding: '18px 20px', marginTop: 30 }}>
          الإدارة غير مهيّأة في هذه البيئة.
        </p>
      </div>
    );
  }

  const projects = await resolvedProjects();
  const seedIds = new Set(ALL_PROJECTS.map(p => p.id));
  const mayPublish = can(session.role, 'content.publish');

  const published = projects.filter(p => p.published).length;
  const totals = projects.reduce(
    (acc, p) => {
      const c = linkCounts(p);
      acc.live += c.live;
      acc.pending += c.pending;
      return acc;
    },
    { live: 0, pending: 0 },
  );

  return (
    <div className="shell">
      <AdminShell
        role={session.role}
        actorName={session.displayName}
        current="/admin/projects"
        titleAr="المشاريع"
      >
        <p style={{ color: 'var(--text-dim)', fontSize: 13.5, margin: '0 0 14px', lineHeight: 1.9 }}>
          <span dir="ltr">{projects.length}</span> مشروعاً، منها{' '}
          <span dir="ltr">{published}</span> منشور. الروابط داخل المشاريع:{' '}
          <span dir="ltr">{totals.live}</span> تفتح صفحة موجودة، و
          <span dir="ltr">{totals.pending}</span> معلَّمة «سيضاف لاحقاً» أو «خارج المنصّة».
          لا يوجد رابط ثالث — وهذا ما تتحقّق منه الاختبارات قبل كل بناء.
        </p>

        <p style={{ margin: '0 0 18px' }}>
          <Link href="/admin/projects/new" className="btn-primary" data-testid="admin-project-new">
            مشروع جديد
          </Link>
        </p>

        <div className="admin-table-wrap">
          <table className="admin-table" data-testid="admin-projects-table">
            <thead>
              <tr>
                <th>المشروع</th>
                <th>المستوى</th>
                <th>الأقسام</th>
                <th>الروابط</th>
                <th>الحالة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const c = linkCounts(p);
                return (
                  <tr key={p.id} data-testid={`admin-project-row-${p.id}`}>
                    <td>
                      <Link href={`/admin/projects/${p.id}`} style={{ fontWeight: 800 }}>
                        {p.titleAr}
                      </Link>
                      <div className="ltr" style={{ fontSize: 11, color: 'var(--text-dimmer)' }}>
                        {p.id}
                        {!seedIds.has(p.id) && ' · أُنشئ من اللوحة'}
                      </div>
                    </td>
                    <td>{DIFFICULTY_LABEL_AR[p.difficulty]}</td>
                    <td dir="ltr" style={{ fontSize: 12 }}>
                      {p.parts?.length ?? 0}ق · {p.software?.length ?? 0}ب ·{' '}
                      {p.prerequisites?.length ?? 0}م · {p.glossary?.length ?? 0}ص
                    </td>
                    <td dir="ltr" style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--sev-ok)' }}>{c.live}</span>
                      {' / '}
                      <span style={{ color: 'var(--text-dimmer)' }}>{c.pending}</span>
                    </td>
                    <td>
                      <span
                        className={p.published ? 'admin-badge admin-badge-ok' : 'admin-badge'}
                        data-testid={`admin-project-state-${p.id}`}
                      >
                        {p.published ? 'منشور' : 'مخفي'}
                      </span>
                    </td>
                    <td>
                      {mayPublish && (
                        <ProjectPublishToggle projectId={p.id} published={p.published} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-dimmer)', marginTop: 14, lineHeight: 1.9 }}>
          «الأقسام» يعدّ القطع والبرامج والمتطلّبات والمصطلحات. «الروابط» يفصل ما يفتح
          صفحة موجودة عمّا لم يُكتب بعد — والعمود الثاني هو قائمة عملك في الموسوعة
          ومركز البرامج.
        </p>
      </AdminShell>
    </div>
  );
}

/**
 * How many of a project's references resolve, and how many are honest absences.
 *
 * Counted from the data rather than stored, for the same reason the software
 * hub counts its coverage: a stored number is a number that drifts from what it
 * describes the first time somebody writes an article.
 */
function linkCounts(p: Project): { live: number; pending: number } {
  const refs = [
    ...(p.prerequisites ?? []).map(q => q.ref),
    ...(p.glossary ?? []).map(g => g.ref),
    ...(p.parts ?? []).map(x => x.ref),
    ...(p.software ?? []).map(x => x.ref),
  ];
  let live = 0;
  let pending = 0;
  for (const r of refs) {
    if (refIsLinkable(r)) live += 1;
    else pending += 1;
  }
  return { live, pending };
}
