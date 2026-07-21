import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { type User } from 'firebase/auth';
import { useAuthContext } from '../../contexts/AuthContext';
import { authErrorMessage } from '../../utils/authErrorMessages';
import { AvatarPicker } from './AvatarPicker';
import { AVATAR_OPTIONS } from '../../data/avatars';

// Single shared sign-in/sign-up/guest/forgot-password surface — the ONE
// place in the app allowed to render a Google-sign-in button or an
// email/password form (see scripts/testAuthPanel.ts's structural
// enforcement). Two independent per-screen implementations existed before
// this (SplashView.tsx, ProfileSheet.tsx) — each with its own duplicated
// GoogleIcon svg and its own handleGoogleSignIn — this replaces both.
//
// `full` mode (SplashView, the app's main entry screen): the complete
// form, always visible, bottom-anchored as a fixed panel over the splash
// artwork.
// `compact` mode (ProfileSheet's guest state): a single short prompt
// button; tapping it expands, IN NORMAL DOCUMENT FLOW (never
// position:absolute/fixed — it's nested inside ProfileSheet's own already-
// positioned bottom sheet), into the exact same form full mode shows.
//
// `onSignedIn`/`onGuestContinue` are the only two things that differ by
// context (SplashView navigates to /home; ProfileSheet just lets its own
// isGuest check re-render away from this branch) — everything else
// (fields, validation, errors, the sign-in/up toggle, forgot password) is
// identical and lives here exactly once.
export type AuthPanelMode = 'compact' | 'full';
export type AuthPanelTheme = 'dark' | 'light';

interface AuthPanelProps {
  mode: AuthPanelMode;
  theme?: AuthPanelTheme;
  onSignedIn: (user: User) => void | Promise<void>;
  onGuestContinue: () => void;
  // Optional visibility signal for hosts that keep this component mounted
  // even while visually hidden (ProfileSheet's bottom sheet never unmounts
  // on close — it only translates off-screen via CSS, see ProfileSheet.tsx).
  // Without this, a compact-mode instance would otherwise carry a previous
  // attempt's typed email/password/error across a close-then-reopen cycle.
  // SplashView (full mode) is naturally remounted fresh by the router on
  // every visit, so it has no need to pass this.
  visible?: boolean;
}

type FormMode = 'signin' | 'signup';

// Firebase's own actual enforced minimum (auth/weak-password) — checked
// client-side too, in handleEmailSubmit, so this specific/common mistake
// fails instantly instead of after a round trip to the server.
const MIN_PASSWORD_LENGTH = 6;

// Exported so ProfileSheet.tsx's signed-in-avatar provider badge (a
// non-interactive indicator next to an ALREADY-authenticated user, not a
// sign-in action) can reuse this exact markup instead of duplicating it.
export const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

interface Palette {
  panelBg: string;
  panelBorder: string;
  textPrimary: string;
  textSecondary: string;
  textError: string;
  textSuccess: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  tabActiveBorder: string;
  tabActiveBg: string;
  tabInactiveBorder: string;
  tabInactiveText: string;
  submitBg: string;
  submitBorder: string;
  submitText: string;
  guestBg: string;
  guestBorder: string;
  guestText: string;
  linkColor: string;
  dividerColor: string;
}

const PALETTES: Record<AuthPanelTheme, Palette> = {
  dark: {
    panelBg: 'rgba(8,15,26,0.92)',
    panelBorder: '1px solid rgba(34,211,238,0.18)',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    textError: '#f87171',
    textSuccess: '#4ade80',
    inputBg: 'rgba(2,8,15,0.6)',
    inputBorder: '1px solid rgba(148,163,184,0.25)',
    inputText: '#e2e8f0',
    tabActiveBorder: '1px solid rgba(34,211,238,0.5)',
    tabActiveBg: 'rgba(34,211,238,0.12)',
    tabInactiveBorder: '1px solid rgba(255,255,255,0.12)',
    tabInactiveText: '#94a3b8',
    submitBg: 'rgba(8,15,26,0.55)',
    submitBorder: '1px solid rgba(34,211,238,0.45)',
    submitText: '#e2e8f0',
    guestBg: 'rgba(8,15,26,0.45)',
    guestBorder: '1px solid rgba(255,255,255,0.16)',
    guestText: '#cbd5e1',
    linkColor: '#22d3ee',
    dividerColor: 'rgba(255,255,255,0.1)',
  },
  light: {
    panelBg: '#ffffff',
    panelBorder: '1px solid #bfdbfe',
    textPrimary: '#0f2543',
    textSecondary: '#64748b',
    textError: '#dc2626',
    textSuccess: '#16a34a',
    inputBg: '#ffffff',
    inputBorder: '1.5px solid #93c5fd',
    inputText: '#0f2543',
    tabActiveBorder: '1.5px solid #60a5fa',
    tabActiveBg: '#eaf2ff',
    tabInactiveBorder: '1px solid #dbeafe',
    tabInactiveText: '#64748b',
    submitBg: '#3b7dd8',
    submitBorder: 'none',
    submitText: '#ffffff',
    guestBg: 'transparent',
    guestBorder: '1px solid #bfdbfe',
    guestText: '#64748b',
    linkColor: '#1d4ed8',
    dividerColor: '#dbeafe',
  },
};

export const AuthPanel: React.FC<AuthPanelProps> = ({ mode, theme = 'dark', onSignedIn, onGuestContinue, visible }) => {
  const { currentUser, isAuthLoading, signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword } = useAuthContext();
  const p = PALETTES[theme];
  const isNative = Capacitor.isNativePlatform();

  const [compactExpanded, setCompactExpanded] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('signin');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_OPTIONS[0].path);

  const [resetSent, setResetSent] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  // Plain mount-flag guard (not the monotonic-generation pattern
  // useEnsureCommunityUser.ts uses) — that pattern exists specifically
  // because Strict Mode's dev-only double-invoke can permanently strand a
  // boolean flag false when an EFFECT itself starts the async work being
  // guarded. Here the async work only ever starts from a user click, which
  // can never happen during that synchronous double-invoke, so a boolean
  // reset back to true by this same effect on the (real) second mount is
  // safe. Guards only the setState calls below, never the onSignedIn
  // callback itself — a completed sign-in should still reach the parent
  // (e.g. mergeGuestProgress) even if this component happens to unmount
  // first.
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ProfileSheet's bottom sheet never unmounts on close (see the `visible`
  // prop's own comment above) — so without this, reopening it would show
  // whatever email/password/error/expanded-state was left over from the
  // last attempt. Only fires on the false->true transition (reopening),
  // never on close itself, so nothing visibly resets while the sheet is
  // still sliding away.
  const wasVisibleRef = React.useRef(visible);
  React.useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setCompactExpanded(false);
      setFormMode('signin');
      setDisplayName('');
      setEmail('');
      setPassword('');
      setError(null);
      setResetSent(false);
      setResetSending(false);
    }
    wasVisibleRef.current = visible;
  }, [visible]);

  // Already-signed-in-on-mount (cold launch with a persisted session) —
  // guarded on !isSigningIn so this can never race an in-flight sign-up's
  // own onAuthStateChanged firing before signUpWithEmail's own
  // updateProfile call resolves (see AuthContext.tsx's signUpWithEmail
  // comment for why that ordering matters — firestore.rules permanently
  // locks displayName after creation). For `compact` mode this is a
  // practical no-op: the parent's own isGuest check re-renders this
  // component out of existence in the same update before it could matter.
  React.useEffect(() => {
    if (!isAuthLoading && currentUser && !isSigningIn) {
      void onSignedIn(currentUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, currentUser, isSigningIn]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    background: p.inputBg,
    border: p.inputBorder,
    color: p.inputText,
    fontSize: '13px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setError(null);
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogle();
      await onSignedIn(user);
    } catch (err) {
      console.error('[AuthPanel] Google sign-in failed:', err);
      if (!mountedRef.current) return;
      setError('حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.');
      setIsSigningIn(false);
    }
  };

  const handleEmailSubmit = async () => {
    // Duplicate-submission guard — same synchronous check-then-set pattern
    // already established by usePostLike.ts/useCommentLike.ts's `toggling`,
    // not a new one-off mechanism.
    if (isSigningIn) return;
    setError(null);

    if (formMode === 'signup' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`كلمة المرور يجب ألا تقل عن ${MIN_PASSWORD_LENGTH} أحرف.`);
      return;
    }

    setIsSigningIn(true);
    try {
      const user = formMode === 'signup'
        ? await signUpWithEmail(displayName.trim() || 'مستخدم', email.trim(), password, selectedAvatar)
        : await signInWithEmail(email.trim(), password);
      await onSignedIn(user);
    } catch (err) {
      console.error('[AuthPanel] Email auth failed:', err);
      if (!mountedRef.current) return;
      setError(authErrorMessage(err));
      setIsSigningIn(false);
    }
  };

  const handleForgotPassword = async () => {
    if (resetSending) return;
    setError(null);
    if (!email.trim()) {
      setError('أدخل بريدك الإلكتروني أولاً.');
      return;
    }
    setResetSending(true);
    try {
      await resetPassword(email.trim());
      if (!mountedRef.current) return;
      setResetSent(true);
    } catch (err) {
      console.error('[AuthPanel] Password reset failed:', err);
      if (!mountedRef.current) return;
      setError(authErrorMessage(err));
    } finally {
      if (mountedRef.current) setResetSending(false);
    }
  };

  const handleGuestClick = () => {
    setError(null);
    onGuestContinue();
    if (mode === 'compact') setCompactExpanded(false);
  };

  const switchMode = (next: FormMode) => {
    setFormMode(next);
    setError(null);
    setResetSent(false);
  };

  const showLoading = isAuthLoading || isSigningIn;

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px 0',
    borderRadius: '10px',
    border: active ? p.tabActiveBorder : p.tabInactiveBorder,
    background: active ? p.tabActiveBg : 'transparent',
    color: active ? p.textPrimary : p.tabInactiveText,
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  const formBody = (
    <>
      {error && (
        <p style={{ margin: 0, fontSize: '12.5px', color: p.textError, textAlign: 'center', lineHeight: 1.5 }}>
          {error}
        </p>
      )}

      {isNative ? (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => switchMode('signin')} style={tabButtonStyle(formMode === 'signin')}>
              تسجيل الدخول
            </button>
            <button type="button" onClick={() => switchMode('signup')} style={tabButtonStyle(formMode === 'signup')}>
              إنشاء حساب
            </button>
          </div>

          {formMode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="الاسم"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoComplete="name"
                style={inputStyle}
              />
              <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
            </>
          )}

          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            dir="ltr"
            autoComplete="email"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            dir="ltr"
            autoComplete={formMode === 'signup' ? 'new-password' : 'current-password'}
            style={inputStyle}
          />

          {formMode === 'signin' && (
            resetSent ? (
              <p style={{ margin: 0, fontSize: '12px', color: p.textSuccess, textAlign: 'center' }}>
                تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني إن كان مرتبطاً بحساب.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetSending}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: p.linkColor, fontSize: '12px', textAlign: 'center',
                  cursor: resetSending ? 'default' : 'pointer', fontFamily: 'inherit',
                  opacity: resetSending ? 0.6 : 1,
                }}
              >
                {resetSending ? '...' : 'نسيت كلمة المرور؟'}
              </button>
            )
          )}

          <button
            onClick={handleEmailSubmit}
            disabled={isSigningIn}
            style={{
              width: '100%',
              padding: '11px 20px',
              borderRadius: '12px',
              background: p.submitBg,
              border: p.submitBorder,
              color: p.submitText,
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSigningIn ? 'default' : 'pointer',
              opacity: isSigningIn ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {formMode === 'signup' ? 'إنشاء حساب' : 'تسجيل الدخول'}
          </button>
        </>
      ) : (
        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '11px 20px',
            borderRadius: '12px',
            background: p.submitBg,
            border: p.submitBorder,
            color: p.submitText,
            fontSize: '14px',
            fontWeight: 600,
            cursor: isSigningIn ? 'default' : 'pointer',
            opacity: isSigningIn ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          <GoogleIcon />
          تسجيل الدخول بـ Google
        </button>
      )}

      <div style={{ height: 1, background: p.dividerColor }} aria-hidden />
      <button
        onClick={handleGuestClick}
        style={{
          width: '100%',
          padding: '10px 20px',
          borderRadius: '12px',
          background: p.guestBg,
          border: p.guestBorder,
          color: p.guestText,
          fontSize: '13px',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        المتابعة كزائر
      </button>
    </>
  );

  if (mode === 'compact' && !compactExpanded) {
    return (
      <button
        onClick={() => setCompactExpanded(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 11,
          background: p.panelBg, border: p.panelBorder,
          color: p.linkColor, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        سجّل الدخول للمتابعة
      </button>
    );
  }

  const panelContent = showLoading ? (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '8px 0' }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <span
          key={i}
          className="animate-pulse"
          style={{
            width: 6, height: 6, borderRadius: '50%', background: '#22d3ee',
            animationDelay: `${delay}s`, display: 'block',
          }}
        />
      ))}
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {formBody}
    </div>
  );

  if (mode === 'compact') {
    // Normal document flow — nested inside ProfileSheet's own bottom
    // sheet, which already owns its own fixed positioning. Never
    // position:absolute/fixed here.
    return (
      <div
        style={{
          background: p.panelBg,
          border: p.panelBorder,
          borderRadius: '16px',
          padding: '14px',
        }}
      >
        {panelContent}
      </div>
    );
  }

  // full mode — bottom-anchored fixed panel. Capped maxHeight (not a
  // top:24 near-full-height span, which used to cover the splash artwork's
  // own "FPV بالعربي" logo emblem — that logo sits at a fixed PROPORTION of
  // the image, roughly 11%-37% down, and object-fit:cover's height-driven
  // scaling means that proportion is constant across every device height.
  // A capped, bottom-anchored height keeps this panel's top edge well
  // clear of that band on every common phone height, instead of a
  // device-height-dependent guess.
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        maxHeight: 'min(52vh, 420px)',
        overflowY: 'auto',
        background: p.panelBg,
        border: p.panelBorder,
        borderRadius: '18px',
        padding: '14px',
      }}
    >
      {panelContent}
    </div>
  );
};
