'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserBackend } from '@/lib/backend/supabase/client';
import { isSupabaseConfigured } from '@/lib/backend/supabase/env';

/**
 * Sign-in, sign-up and password reset — through the auth port, never the SDK.
 *
 * WHERE THE SESSION LIVES NOW
 * ---------------------------
 * Supabase's browser client writes the session into cookies itself, and the
 * middleware refreshes them on every request — so there is no token-exchange
 * endpoint any more. The Firebase version needed `/api/auth/session` because
 * its browser SDK kept the token where the server could not see it; here the
 * cookie IS the shared channel, and `router.refresh()` after a successful call
 * re-renders the server components against it. The server still never believes
 * the browser about anything: `getSession()` verifies the token against the
 * Auth server and re-reads the role from the profiles table on every request.
 *
 * ERRORS ARE SENTENCES, NOT CODES
 * -------------------------------
 * The port already returns Arabic. «البريد أو كلمة المرور غير صحيحة» is one
 * sentence for both failures on purpose — distinguishing «no such account»
 * from «wrong password» is an account-enumeration oracle, and the reset flow
 * makes the same refusal: «أُرسل الرابط إن كان البريد مسجَّلاً».
 */

type Mode = 'signin' | 'signup' | 'reset';

export const SignInForm: React.FC<{ nextPath: string }> = ({ nextPath }) => {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  /** Success → re-render the server components against the new cookie, then go. */
  function arrive() {
    router.refresh();
    router.push(nextPath);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { auth } = browserBackend();
      if (mode === 'reset') {
        const r = await auth.resetPassword(email, `${window.location.origin}/signin`);
        if (!r.ok) { setError(r.errorAr); return; }
        setNotice('أُرسل رابط إعادة تعيين كلمة المرور إن كان البريد مسجَّلاً.');
        setMode('signin');
        return;
      }
      if (mode === 'signup') {
        const r = await auth.signUpWithPassword(email, password, displayName.trim());
        if (!r.ok) { setError(r.errorAr); return; }
        arrive();
        return;
      }
      const r = await auth.signInWithPassword(email, password);
      if (!r.ok) { setError(r.errorAr); return; }
      arrive();
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      // OAuth leaves the page: the port hands back the provider URL and the
      // browser navigates to it. Supabase redirects back to `nextPath` with
      // the session already in the URL fragment, which the client stores.
      const r = await browserBackend().auth.signInWithProvider(
        'google',
        `${window.location.origin}${nextPath}`,
      );
      if (!r.ok) { setError(r.errorAr); setBusy(false); return; }
      if (r.url) { window.location.assign(r.url); return; }
      arrive();
    } catch {
      setError('تعذّر تسجيل الدخول عبر جوجل. حاول مرة أخرى.');
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="card" style={{ padding: '18px 20px' }} data-testid="signin-unconfigured">
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--sev-warning)', lineHeight: 1.9 }}>
          تسجيل الدخول غير مهيّأ في هذه البيئة: متغيّرات{' '}
          <span className="ltr">NEXT_PUBLIC_SUPABASE_*</span> غير مضبوطة. راجع{' '}
          <span className="ltr">web/.env.example</span>.
        </p>
      </div>
    );
  }

  const INPUT: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
  };
  const LABEL: React.CSSProperties = {
    display: 'block', fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 6, fontWeight: 700,
  };

  return (
    <div className="card" style={{ padding: '20px 22px' }} data-testid="signin-form">
      <div role="tablist" aria-label="نوع العملية" style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {([
          { id: 'signin', labelAr: 'تسجيل الدخول' },
          { id: 'signup', labelAr: 'حساب جديد' },
        ] as const).map(t => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={mode === t.id}
            data-testid={`signin-tab-${t.id}`}
            onClick={() => { setMode(t.id); setError(null); setNotice(null); }}
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              border: mode === t.id ? '1px solid var(--border-accent)' : '1px solid var(--border-soft)',
              background: mode === t.id ? 'rgba(56,224,224,0.10)' : 'transparent',
              color: mode === t.id ? 'var(--accent-ink)' : 'var(--text-dim)',
            }}
          >
            {t.labelAr}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} noValidate>
        {mode === 'signup' && (
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="displayName" style={LABEL}>الاسم الظاهر</label>
            <input
              id="displayName"
              data-testid="signin-name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={40}
              autoComplete="nickname"
              style={INPUT}
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="email" style={LABEL}>البريد الإلكتروني</label>
          <input
            id="email"
            data-testid="signin-email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            dir="ltr"
            style={{ ...INPUT, textAlign: 'left' }}
          />
        </div>

        {mode !== 'reset' && (
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="password" style={LABEL}>كلمة المرور</label>
            <input
              id="password"
              data-testid="signin-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              dir="ltr"
              style={{ ...INPUT, textAlign: 'left' }}
            />
          </div>
        )}

        {error && (
          // role="alert" so a screen reader announces it without the user
          // having to go looking for what went wrong.
          <p
            role="alert"
            data-testid="signin-error"
            style={{
              margin: '0 0 14px', padding: '10px 13px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.32)',
              fontSize: 13, color: 'var(--sev-blocker)', lineHeight: 1.85,
            }}
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            data-testid="signin-notice"
            style={{
              margin: '0 0 14px', padding: '10px 13px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.32)',
              fontSize: 13, color: 'var(--sev-ok)', lineHeight: 1.85,
            }}
          >
            {notice}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={busy}
          data-testid="signin-submit"
          style={{ width: '100%', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'جارٍ…' : mode === 'signup' ? 'أنشئ الحساب' : mode === 'reset' ? 'أرسل الرابط' : 'ادخل'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} aria-hidden />
        <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>أو</span>
        <span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }} aria-hidden />
      </div>

      <button
        type="button"
        className="btn-ghost"
        onClick={onGoogle}
        disabled={busy}
        data-testid="signin-google"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        المتابعة عبر Google
      </button>

      {mode !== 'reset' && (
        <p style={{ margin: '16px 0 0', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => { setMode('reset'); setError(null); setNotice(null); }}
            data-testid="signin-forgot"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12.5, color: 'var(--text-dim)', textDecoration: 'underline',
            }}
          >
            نسيت كلمة المرور
          </button>
        </p>
      )}
    </div>
  );
};
