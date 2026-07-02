import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgressContext } from '../contexts/ProgressContext';
import { useAuthContext } from '../contexts/AuthContext';

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const { setHasStarted, mergeGuestProgress } = useProgressContext();
  const { currentUser, isAuthLoading, signInWithGoogle } = useAuthContext();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Returning signed-in user — skip the welcome screen
  React.useEffect(() => {
    if (!isAuthLoading && currentUser) {
      setHasStarted(true);
      navigate('/home', { replace: true });
    }
  }, [isAuthLoading, currentUser]);

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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Phone-frame column — matches AppShell frame */}
      <div
        style={{
          width: '100%',
          maxWidth: '390px',
          position: 'relative',
          boxShadow: '0 0 0 1px rgba(34,211,238,0.13), 0 0 70px rgba(24,230,230,0.08)',
        }}
      >
        <img
          src="/assets/splash.png"
          alt=""
          aria-hidden
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />

        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
            background: 'linear-gradient(to bottom, transparent, rgba(4,16,30,0.85))',
            pointerEvents: 'none',
          }}
          aria-hidden
        />

        {/* Buttons / loading indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 24,
            right: 24,
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

              {/* Google Sign-In */}
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
                  background: 'rgba(34,211,238,0.07)',
                  border: '1px solid rgba(34,211,238,0.35)',
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

              {/* Guest */}
              <button
                onClick={handleGuest}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#94a3b8',
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
