'use client';

import dynamic from 'next/dynamic';

/**
 * The client boundary the workspace needs.
 *
 * `next/dynamic` with `ssr: false` may only be used from a client component, so
 * this file exists purely to be that client component. The page above it stays
 * a server component — which is what keeps its metadata, its heading and its
 * breadcrumb server-rendered, and keeps the part catalogue out of the server
 * bundle entirely.
 *
 * `ssr: false` is deliberate rather than a workaround: the workspace reads the
 * project from localStorage, so rendering it on the server would produce an
 * empty project in the HTML and the real one after hydration — the reader would
 * watch their build appear out of nothing.
 */
const ProjectWorkspace = dynamic(
  () => import('./ProjectWorkspace').then(m => ({ default: m.ProjectWorkspace })),
  {
    ssr: false,
    loading: () => (
      <p className="card-sm" data-testid="project-loading" style={{ padding: '18px 20px' }}>
        جارٍ فتح مساحة العمل…
      </p>
    ),
  },
);

export const ProjectClient: React.FC = () => <ProjectWorkspace />;
