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
export const SignOutButton: React.FC = () => {
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
    <span>
      <button
        type="button"
        className="btn-ghost"
        onClick={onClick}
        disabled={busy}
        data-testid="signout-button"
      >
        {busy ? 'جارٍ…' : 'تسجيل الخروج'}
      </button>
      {error && (
        <span role="alert" style={{ display: 'block', marginTop: 8, fontSize: 12.5, color: '#fca5a5' }}>
          {error}
        </span>
      )}
    </span>
  );
};
