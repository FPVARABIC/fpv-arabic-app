import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { isServiceConfigured as isAdminConfigured } from '@/lib/backend/supabase/adminData';
import { resolvedProject } from '@/lib/server/projects';
import { AdminShell } from '@/components/admin/AdminShell';
import { ProjectEditor } from '@/components/admin/ProjectEditor';
import { ProjectPublishToggle } from '@/components/admin/ProjectPublishToggle';
import { refOptionGroups, PLANNED_SECTIONS } from '@/lib/projectRefOptions';
import { can } from '@core/data/auth/roles';
import type { Project } from '@core/data/projects/types';

export const metadata: Metadata = {
  title: 'تحرير مشروع',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Editing one project, or writing a new one.
 *
 * `new` IS THE SAME SCREEN, NOT A SECOND ONE
 * ------------------------------------------
 * A separate «create» form is a second set of fields that drifts from the edit
 * form — the classic version being a required field added to one and not the
 * other, so a project created in the panel is missing something every edited
 * one has. Here the only difference is that the id is typed rather than fixed,
 * and that the image field waits for the first save because the file is stored
 * under the id.
 *
 * WHY THE REFERENCE LISTS ARE BUILT HERE
 * --------------------------------------
 * `refOptionGroups()` reads the whole encyclopedia index, the glossary, the
 * catalogue and the software hub. Building it on the server and handing plain
 * arrays to the client component keeps every one of those registries out of the
 * browser bundle, while still giving the editor a dropdown of real ids.
 */
export default async function AdminProjectEditPage(
  { params }: { params: Promise<{ projectId: string }> },
) {
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

  const { projectId } = await params;
  const isNew = projectId === 'new';

  const project = isNew ? undefined : await resolvedProject(projectId);
  if (!isNew && !project) notFound();

  const groups = refOptionGroups();
  const shell: Partial<Project> & { id: string } = project ?? { id: 'new' };

  return (
    <div className="shell">
      <AdminShell
        role={session.role}
        actorName={session.displayName}
        current="/admin/projects"
        titleAr={isNew ? 'مشروع جديد' : (project?.titleAr ?? projectId)}
        ownTitle
      >
        <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 6px' }}>
          <Link href="/admin/projects">المشاريع</Link> <span aria-hidden>/</span>{' '}
          {isNew ? 'جديد' : projectId}
        </p>
        <h1 className="admin-title" style={{ marginTop: 0 }}>
          {isNew ? 'مشروع جديد' : (project?.titleAr ?? projectId)}
        </h1>

        {!isNew && project && (
          <p style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '0 0 18px' }}>
            <span className={project.published ? 'admin-badge admin-badge-ok' : 'admin-badge'}>
              {project.published ? 'منشور' : 'مخفي'}
            </span>
            {can(session.role, 'content.publish') && (
              <ProjectPublishToggle projectId={project.id} published={project.published} />
            )}
            {project.published && (
              <Link href={`/projects/${project.id}`} className="btn-ghost" style={{ fontSize: 12 }}>
                افتح الصفحة العامّة ←
              </Link>
            )}
          </p>
        )}

        <ProjectEditor
          project={shell}
          isNew={isNew}
          groups={groups}
          plannedSections={PLANNED_SECTIONS}
        />
      </AdminShell>
    </div>
  );
}
