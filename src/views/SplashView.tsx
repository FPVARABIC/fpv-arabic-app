import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useProgressContext } from '../contexts/ProgressContext';
import { useAuthContext } from '../contexts/AuthContext';
import { AvatarPicker } from '../components/Auth/AvatarPicker';
import { AVATAR_OPTIONS } from '../data/avatars';
import { authErrorMessage } from '../utils/authErrorMessages';

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

// Firebase's own actual enforced minimum (auth/weak-password) — checked
// client-side too, in handleEmailSubmit, so this specific/common mistake
// fails instantly instead of after a round trip to the server.
const MIN_PASSWORD_LENGTH = 6;

type AuthMode = 'signin' | 'signup';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '12px',
  background: 'rgba(2,8,15,0.6)',
  border: '1px solid rgba(148,163,184,0.25)',
  color: '#e2e8f0',
  fontSize: '14px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const { setHasStarted, mergeGuestProgress } = useProgressContext();
  const { currentUser, isAuthLoading, signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuthContext();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Native-only email/password form state — never read or rendered on web.
  const [mode, setMode] = useState<AuthMode>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_OPTIONS[0].path);

  const isNative = Capacitor.isNativePlatform();

  // Returning signed-in user — skip the welcome screen. Guarded on
  // !isSigningIn: without this, a sign-up's OWN onAuthStateChanged firing —
  // which happens the instant createUserWithEmailAndPassword resolves,
  // before AuthContext's signUpWithEmail has even reached its awaited
  // updateProfile call — would race this effect's navigate() ahead of
  // signUpWithEmail's own navigate(), landing on /home before
  // displayName/photoURL are set. firestore.rules permanently locks
  // displayName after creation (see its users/{uid} update rule), so a
  // user's chosen name would be silently and irreversibly replaced by
  // ensureCommunityUser.ts's generic 'مستخدم' fallback — not a cosmetic
  // glitch, a permanent one. Google sign-in has no such race (Google
  // always supplies a full profile upfront, nothing to update afterward),
  // so this guard changes nothing for it.
  React.useEffect(() => {
    if (!isAuthLoading && currentUser && !isSigningIn) {
      setHasStarted(true);
      navigate('/home', { replace: true });
    }
  }, [isAuthLoading, currentUser, isSigningIn]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogle();
      await mergeGuestProgress(user.uid);
      setHasStarted(true);
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('[Auth] Google sign-in failed:', err);
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

    if (mode === 'signup' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`كلمة المرور يجب ألا تقل عن ${MIN_PASSWORD_LENGTH} أحرف.`);
      return;
    }

    setIsSigningIn(true);
    try {
      const user = mode === 'signup'
        ? await signUpWithEmail(displayName.trim() || 'مستخدم', email.trim(), password, selectedAvatar)
        : await signInWithEmail(email.trim(), password);
      await mergeGuestProgress(user.uid);
      setHasStarted(true);
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('[Auth] Email auth failed:', err);
      setError(authErrorMessage(err));
      setIsSigningIn(false);
    }
  };

  const handleGuest = () => {
    setError(null);
    setHasStarted(true);
    navigate('/home', { replace: true });
  };

  const showLoading = isAuthLoading || isSigningIn;

  return (
    <div
      style={{
        background: '#02080f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Phone-frame column — matches AppShell frame. Height comes from the
          .splash-frame class (real viewport height, not the wrapper above)
          so it can never fall short of or exceed the actual screen — see
          that class for why. */}
      <div
        className="splash-frame"
        style={{
          width: '100%',
          maxWidth: '390px',
          position: 'relative',
          boxShadow: '0 0 0 1px rgba(34,211,238,0.13), 0 0 70px rgba(24,230,230,0.08)',
        }}
      >
        {/* Cover-fit, not width-100/height-auto: the old auto-height image
            only rendered ~690px tall (its own aspect ratio at 390px width),
            shorter than nearly every real device viewport, leaving the
            remaining height below it as a plain dark gap — the frame's
            bottom (where the gradient/buttons anchor) didn't line up with
            the screen's actual bottom. Filling the frame and letting the
            image cover + crop it (matching the native cold-start splash's
            own CENTER_CROP behavior, see capacitor.config.ts) makes the
            artwork always reach the true bottom, no gap, at any viewport
            height. */}
        <img
          src="/assets/splash.png"
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Bottom gradient — contrast fix: the splash artwork's bottom third
            (lantern/carpet/coffee pot) is bright and busy, and the button
            stack below (bottom: 48, ~98px tall) used to extend above this
            gradient's old 120px reach entirely, leaving the Google button's
            upper portion with no scrim at all. Taller + darker at its base
            (near-matching the page's own #02080f background, rgb(2,8,15),
            so it reads as "fading into the app" rather than an arbitrary new
            shade) so it now fully covers the whole button stack with margin
            to spare. */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '260px',
            background: 'linear-gradient(to bottom, transparent, rgba(2,8,15,0.92))',
            pointerEvents: 'none',
          }}
          aria-hidden
        />

        {/* Buttons / form / loading indicator. Native gets top:24 +
            overflowY:'auto' — the email/password form (mode toggle, up to
            4 fields, avatar grid, submit, guest) is much taller than a
            single Google button and can exceed the 260px gradient's own
            reach, so its own card background (below) carries its own
            contrast independent of the artwork behind it, and this
            container can scroll internally on a short viewport rather than
            overflow off-screen. Web is untouched: no top/overflowY, exactly
            as before. */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 24,
            right: 24,
            ...(isNative ? { top: 24, overflowY: 'auto' as const } : {}),
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {showLoading ? (
            /* Single centered dot while auth resolves or sign-in is in flight */
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, paddingBottom: 4 }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <span
                  key={i}
                  className="animate-pulse"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#22d3ee',
                    animationDelay: `${delay}s`,
                    display: 'block',
                  }}
                />
              ))}
            </div>
          ) : isNative ? (
            // Native email/password + preset-avatar sign-up (Part B/C).
            // signInWithPopup opens a real browser popup — inside the
            // Android WebView there is no such thing, and Google actively
            // blocks sign-in inside embedded/WebView browsers anyway, so
            // Google Sign-In is web-only; native gets this form instead.
            <div
              style={{
                background: 'rgba(8,15,26,0.88)',
                border: '1px solid rgba(34,211,238,0.18)',
                borderRadius: '18px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {error && (
                <p style={{ margin: 0, fontSize: '13px', color: '#f87171', textAlign: 'center', lineHeight: 1.5 }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    borderRadius: '10px',
                    border: mode === 'signin' ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.12)',
                    background: mode === 'signin' ? 'rgba(34,211,238,0.12)' : 'transparent',
                    color: mode === 'signin' ? '#e2e8f0' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    borderRadius: '10px',
                    border: mode === 'signup' ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.12)',
                    background: mode === 'signup' ? 'rgba(34,211,238,0.12)' : 'transparent',
                    color: mode === 'signup' ? '#e2e8f0' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  إنشاء حساب
                </button>
              </div>

              {mode === 'signup' && (
                <>
                  <input
                    type="text"
                    placeholder="الاسم"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
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
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={e => setPassword(e.target.value)}
                dir="ltr"
                style={inputStyle}
              />

              <button
                onClick={handleEmailSubmit}
                disabled={isSigningIn}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '14px',
                  background: 'rgba(8,15,26,0.55)',
                  border: '1px solid rgba(34,211,238,0.45)',
                  color: '#e2e8f0',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: isSigningIn ? 'default' : 'pointer',
                  opacity: isSigningIn ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {mode === 'signup' ? 'إنشاء حساب' : 'تسجيل الدخول'}
              </button>

              {/* Guest — always rendered as the last item in this same
                  scrollable card, never conditionally hidden by mode or
                  form state, so it stays reachable regardless of how tall
                  the sign-up fields above get. */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} aria-hidden />
              <button
                onClick={handleGuest}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  background: 'rgba(8,15,26,0.45)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  color: '#cbd5e1',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                المتابعة كزائر
              </button>
            </div>
          ) : (
            <>
              {error && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#f87171',
                    textAlign: 'center',
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </p>
              )}

              {/* Google Sign-In — contrast fix: a real dark backdrop
                  (rgba(8,15,26,...), independent of the bottom gradient
                  above) so the button reads clearly even where the artwork
                  behind it is brightest, not just where the gradient
                  happens to be darkest. Border opacity raised slightly to
                  stay visible against a dark backdrop rather than the raw
                  photo. Text color unchanged — already high-contrast. */}
              <button
                onClick={handleGoogleSignIn}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '13px 20px',
                  borderRadius: '14px',
                  background: 'rgba(8,15,26,0.55)',
                  border: '1px solid rgba(34,211,238,0.45)',
                  color: '#e2e8f0',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <GoogleIcon />
                تسجيل الدخول بـ Google
              </button>

              {/* Guest — same dark-backdrop treatment; text color brightened
                  from #94a3b8 (too low-contrast even on a dark backdrop) to
                  #cbd5e1, still visibly secondary to the Google button's
                  brighter #e2e8f0 without being unreadable. */}
              <button
                onClick={handleGuest}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  background: 'rgba(8,15,26,0.45)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  color: '#cbd5e1',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                المتابعة كزائر
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
