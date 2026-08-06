'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { browserBackend } from '@/lib/backend/supabase/client';
import { ROLE_LABEL_AR, isStaff, type PlatformRole } from '@core/data/auth/roles';

/**
 * The header's account corner — hydrated in the BROWSER, on purpose.
 *
 * WHY NOT THE SERVER, WHEN EVERYTHING ELSE VERIFIES SERVER-SIDE
 * -------------------------------------------------------------
 * Reading the session during layout render calls `cookies()`, and one
 * `cookies()` in the root layout makes EVERY route request-rendered. The
 * sentinel-credential build proved it: the moment real env vars were present,
 * the whole site — the encyclopedia, the projects, the store fronts — went
 * from prerendered HTML to per-request rendering, which is exactly the SSG
 * the platform was built around, thrown away for one avatar in a corner.
 *
 * So the CONTENT stays static and this corner hydrates. Nothing here is a
 * security decision: the header's account chip is presentation, and every
 * page and action that matters verifies its own session server-side
 * (`requireCapability` — the real gate, unchanged). A forged «signed in»
 * chip buys its forger a menu item that 401s.
 *
 * The placeholder state renders NOTHING rather than «تسجيل الدخول», so a
 * signed-in reader does not watch the button flash before their name arrives.
 */

interface HeaderUser {
  displayName: string | null;
  photoURL: string | null;
  role: PlatformRole;
}

export const HeaderSession: React.FC<{
  adminHref: string | null;
  adminLabelAr: string | null;
}> = ({ adminHref, adminLabelAr }) => {
  // undefined = still resolving · null = genuinely signed out
  const [user, setUser] = useState<HeaderUser | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    browserBackend().auth.currentUser().then(u => {
      if (!alive) return;
      setUser(u ? { displayName: u.displayName, photoURL: u.photoURL, role: u.role } : null);
    }).catch(() => { if (alive) setUser(null); });
    return () => { alive = false; };
  }, []);

  if (user === undefined) {
    // Reserve the space so the header does not jump when the answer lands.
    return <span style={{ display: 'inline-block', width: 28, height: 28 }} aria-hidden />;
  }

  if (user === null) {
    return (
      <Link href="/signin" className="btn-ghost" data-testid="header-signin">
        تسجيل الدخول
      </Link>
    );
  }

  return (
    <>
      {isStaff(user.role) && adminHref && (
        <Link
          href={adminHref}
          data-testid="nav-admin"
          style={{
            display: 'inline-block', padding: '6px 12px', borderRadius: 9,
            fontSize: 13, fontWeight: 800, color: 'var(--nav-ink)',
            border: '1px solid rgba(18,34,42,0.28)', whiteSpace: 'nowrap',
            flexShrink: 0, marginInlineEnd: 10,
          }}
        >
          {adminLabelAr ?? 'الإشراف'}
        </Link>
      )}
    <Link
      href="/profile"
      data-testid="header-account"
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      {user.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.photoURL}
          alt=""
          width={28}
          height={28}
          style={{
            width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
            border: '2px solid rgba(255,255,255,0.7)',
          }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--acct-blue)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13,
          }}
        >
          {(user.displayName ?? 'ح').trim().charAt(0)}
        </span>
      )}
      <span
        className="header-account-name"
        style={{ fontSize: 13, fontWeight: 800, color: 'var(--nav-ink)' }}
      >
        {user.displayName ?? 'حسابي'}
      </span>
      {user.role !== 'user' && (
        <span
          className="header-account-role"
          style={{
            fontSize: 10, fontWeight: 800, color: 'var(--nav-ink)',
            border: '1px solid rgba(18,34,42,0.28)', borderRadius: 999,
            padding: '2px 8px',
          }}
        >
          {ROLE_LABEL_AR[user.role]}
        </span>
      )}
    </Link>
    </>
  );
};
