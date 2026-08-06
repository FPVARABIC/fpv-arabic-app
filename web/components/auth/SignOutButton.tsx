'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserBackend } from '@/lib/backend/supabase/client';

/**
 * Sign out.
 *
 * One call now, where Firebase needed two: `signOut()` on the port revokes the
 * session with the Auth server (global scope — other devices' sessions die
 * too, which is exactly the case where signing out matters most) AND clears
 * the cookies the server reads. There is no separate httpOnly cookie to clear
 * because there is no separate token-exchange endpoint any more.
 *
 * `router.refresh()` then re-renders the server components signed out, so the
 * header updates from the server's view of the session rather than from
 * client state — the browser still never gets to say who it is.
 */
/**
 * `className` and `children` exist so the same button can be a plain ghost
 * button on the profile page and a menu row in the account rail. The
 * behaviour is the thing that must not be duplicated, and this is what stops
 * a second copy of it being written for the rail.
 */
export const SignOutButton: React.FC<{
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}> = ({ className, children, 'data-testid': testId }) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    // The port's signOut never throws — signing out must always LOOK like it
    // worked, because a user told «تعذّر تسجيل الخروج» on a shared machine
    // walks away from a session they believe is closed.
    await browserBackend().auth.signOut();
    router.refresh();
    router.push('/');
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
    </span>
  );
};
