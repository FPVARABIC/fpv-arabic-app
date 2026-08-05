'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setProjectPublished } from '@/app/admin/projects/actions';

/**
 * Showing or hiding one project.
 *
 * The refusal is the interesting part. Publishing is checked on the SERVER
 * against the merged project — seeds plus whatever the panel wrote — so a
 * project whose form was half-filled cannot be published by a stale tab, and
 * the message names the empty sections rather than saying «تعذّر».
 *
 * Hiding is never refused. The moment you need something off the site is not
 * the moment to be told it is incomplete.
 */
export const ProjectPublishToggle: React.FC<{ projectId: string; published: boolean }> = ({
  projectId, published,
}) => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className={published ? 'admin-danger' : 'btn-ghost'}
        data-testid={`project-publish-${projectId}`}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const r = await setProjectPublished(projectId, !published);
          setPending(false);
          if (r.ok) router.refresh();
          else setError(r.errorAr);
        }}
        style={{ fontSize: 12 }}
      >
        {pending ? '…' : published ? 'أخفِ' : 'انشر'}
      </button>
      {error && (
        <span role="alert" style={{ display: 'block', fontSize: 11.5, color: 'var(--sev-blocker)', marginTop: 4 }}>
          {error}
        </span>
      )}
    </>
  );
};
