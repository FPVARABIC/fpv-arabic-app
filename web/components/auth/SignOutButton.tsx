'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientAuth, isClientConfigured } from '@/lib/firebaseClient';

/**
 * Sign out — both halves of it.
 *
 * Two things must happen and neither is sufficient alone:
 *
 *   DELETE /api/auth/session   clears the httpOnly cookie AND revokes the
 *                              account's refresh tokens server-side, so other
 *                              devices' sessions die too
 *   clientAuth().signOut()     drops the browser's own Firebase state, so the
 *                              SDK does not immediately mint a fresh token
 *
 * The server call goes FIRST. If it fails, the user is still signed in and the
 * button says so, rather than clearing local state and leaving a live session
 * on the server that the user believes is closed.
 */
/**
 * `className` and `children` exist so the same button can be a plain ghost
 * button on the profile page and a menu row in the account rail. The behaviour
 * — the ordering of the two halves and the refusal to clear local state on a
 * failed server call — is the thing that must not be duplicated, and this is
 * what stops a second copy of it being written for the rail.
 */
export const SignOutButton: React.FC<{
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}> = ({ className, children, 'data-testid': testId }) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/session', { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      if (isClientConfigured()) await clientAuth().signOut().catch(() => {});
      router.refresh();
      router.push('/');
    } catch {
      setError('تعذّر تسجيل الخروج. حاول مرة أخرى.');
      setBusy(false);
    }
  }

  return (
    <span style={className ? { display: 'contents' } : undefined}>
      <button
        type="button"
        className={className ?? 'btn-ghost'}
        onClick={onClick}
        disabled={busy}
        data-testid={testId ?? 'signout-button'}
      >
        {busy ? 'جارٍ…' : (children ?? 'تسجيل الخروج')}
      </button>
      {error && (
        <span role="alert" style={{ display: 'block', marginTop: 8, fontSize: 12.5, color: 'var(--sev-blocker)' }}>
          {error}
        </span>
      )}
    </span>
  );
};
