'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { clientAuth, isClientConfigured } from '@/lib/firebaseClient';

/**
 * Sign-in, sign-up and password reset.
 *
 * THE TWO-STEP THAT MAKES THIS SECURE
 * -----------------------------------
 * Firebase authenticates in the browser and hands back an ID token. That token
 * is immediately POSTed to `/api/auth/session`, which verifies it server-side
 * and replies with an httpOnly cookie. Only after that exchange succeeds does
 * the user count as signed in as far as this site is concerned.
 *
 * The consequence is deliberate: a browser that authenticates with Firebase but
 * fails the exchange is NOT signed in here. There is no path where the client
 * decides it is authenticated and the server goes along with it.
 *
 * `router.refresh()` after the exchange re-renders the server components with
 * the new cookie, so the header updates from the verified session rather than
 * from client state — the browser never gets to say who it is.
 *
 * ERRORS ARE TRANSLATED, NOT ECHOED
 * ---------------------------------
 * Firebase error codes are mapped to plain Arabic. `auth/invalid-credential`
 * deliberately does not distinguish "no such account" from "wrong password",
 * because that distinction is an account-enumeration oracle.
 */

type Mode = 'signin' | 'signup' | 'reset';

const ERROR_AR: Record<string, string> = {
  'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
  'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
  'auth/user-disabled': 'هذا الحساب موقوف.',
  'auth/too-many-requests': 'محاولات كثيرة متتالية. انتظر قليلاً ثم أعد المحاولة.',
  'auth/email-already-in-use': 'هذا البريد مسجَّل بالفعل. سجّل الدخول بدل إنشاء حساب.',
  'auth/weak-password': 'كلمة المرور ضعيفة — استخدم ستة أحرف على الأقل.',
  'auth/popup-closed-by-user': 'أُغلقت نافذة الدخول قبل إتمامها.',
  'auth/popup-blocked': 'المتصفح منع النافذة المنبثقة. اسمح بها ثم أعد المحاولة.',
  'auth/network-request-failed': 'تعذّر الاتصال. تحقّق من الشبكة.',
  'auth/operation-not-allowed': 'طريقة الدخول هذه غير مفعّلة في هذا المشروع.',
};

function messageFor(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  return ERROR_AR[code] ?? 'تعذّر إتمام العملية. حاول مرة أخرى.';
}

export const SignInForm: React.FC<{ nextPath: string }> = ({ nextPath }) => {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const configured = isClientConfigured();

  /** The exchange. Without it, authenticating in the browser means nothing. */
  async function establishSession(user: User) {
    const idToken = await user.getIdToken(/* forceRefresh */ true);
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // Leave no half-signed-in state: if the server refused, the browser must
      // not keep a Firebase session that the site does not recognise.
      await clientAuth().signOut().catch(() => {});
      throw new Error(body?.error ?? 'تعذّر إنشاء الجلسة');
    }
    // Re-render server components so the header and any private page pick up
    // the verified session. Then navigate.
    router.refresh();
    router.push(nextPath);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const auth = clientAuth();
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setNotice('أُرسل رابط إعادة تعيين كلمة المرور إن كان البريد مسجَّلاً.');
        setMode('signin');
        return;
      }
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const name = displayName.trim();
        if (name) await updateProfile(cred.user, { displayName: name });
        await establishSession(cred.user);
        return;
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await establishSession(cred.user);
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith('تعذّر')
        ? err.message
        : messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const cred = await signInWithPopup(clientAuth(), new GoogleAuthProvider());
      await establishSession(cred.user);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="card" style={{ padding: '18px 20px' }} data-testid="signin-unconfigured">
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--sev-warning)', lineHeight: 1.9 }}>
          تسجيل الدخول غير مهيّأ في هذه البيئة: متغيّرات{' '}
          <span className="ltr">NEXT_PUBLIC_FIREBASE_*</span> غير مضبوطة. راجع{' '}
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
