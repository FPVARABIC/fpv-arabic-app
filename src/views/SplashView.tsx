import React from 'react';
import { useNavigate } from 'react-router-dom';
import { type User } from 'firebase/auth';
import { useProgressContext } from '../contexts/ProgressContext';
import { AuthPanel } from '../components/Auth/AuthPanel';

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const { setHasStarted, mergeGuestProgress } = useProgressContext();

  const handleSignedIn = async (user: User) => {
    await mergeGuestProgress(user.uid);
    setHasStarted(true);
    navigate('/home', { replace: true });
  };

  const handleGuest = () => {
    setHasStarted(true);
    navigate('/home', { replace: true });
  };

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
        {/* Cover-fit: the image's own aspect ratio at 390px width only ever
            renders ~690px tall at width:100/height:auto, shorter than
            nearly every real device viewport. object-fit:cover with
            height-driven scaling (this frame is proportionally taller/
            narrower than the image itself) means the FULL image height is
            always visible, cropped only on the sides — so the artwork
            (including its "FPVARABIC" logo emblem, roughly 11%-37% down)
            always reaches the true bottom, no gap, at any viewport height,
            and sits at a fixed, predictable proportion of the frame. */}
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

        {/* Bottom gradient — a scrim independent of AuthPanel's own
            background, so the artwork still reads cleanly behind the gap
            between the image and the panel on tall viewports. */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '200px',
            background: 'linear-gradient(to bottom, transparent, rgba(2,8,15,0.92))',
            pointerEvents: 'none',
          }}
          aria-hidden
        />

        <AuthPanel mode="full" theme="dark" onSignedIn={handleSignedIn} onGuestContinue={handleGuest} />
      </div>
    </div>
  );
};
