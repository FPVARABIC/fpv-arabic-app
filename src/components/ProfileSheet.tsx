import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Info, Shield, LogOut, Pencil, Check, X, ChevronLeft } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useProgressContext } from '../contexts/ProgressContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storageKeys';

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

const getFrameRect = (): DOMRect | null => {
  const el = document.querySelector('[data-app-frame="true"]');
  return el ? el.getBoundingClientRect() : null;
};

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

const GuestAvatar: React.FC = () => (
  <svg width="68" height="68" viewBox="0 0 68 68" fill="none" aria-hidden="true">
    <circle cx="34" cy="34" r="33" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2"/>
    <circle cx="34" cy="27" r="11" fill="#60a5fa"/>
    <path d="M10 58c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#60a5fa"/>
  </svg>
);

const StatBox: React.FC<{ value: string; label: string; animName: string }> = ({ value, label, animName }) => (
  <div style={{
    position: 'relative', flex: 1,
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #dbeafe',
    padding: '12px 8px',
    textAlign: 'center',
    minWidth: 0,
    boxShadow: '0 1px 4px rgba(37,99,235,0.07)',
  }}>
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute', inset: -2,
        width: 'calc(100% + 4px)', height: 'calc(100% + 4px)',
        overflow: 'visible', pointerEvents: 'none', display: 'block',
      }}
      viewBox="0 0 72 72"
      preserveAspectRatio="none"
    >
      {/* Layer 1 — static base border */}
      <rect x="1.5" y="1.5" width="69" height="69" rx="11" fill="none"
        stroke="#bfdbfe" strokeWidth="1.5" opacity="0.6" />
      {/* Layer 2 — comet tail */}
      <rect x="1.5" y="1.5" width="69" height="69" rx="11" fill="none"
        stroke="#93c5fd" strokeWidth="3" strokeDasharray="28 212" strokeLinecap="round" opacity="0.8"
        style={{ animation: `${animName} 3s linear infinite` }} />
      {/* Layer 3 — comet head */}
      <rect x="1.5" y="1.5" width="69" height="69" rx="11" fill="none"
        stroke="#1d4ed8" strokeWidth="4" strokeDasharray="5 235" strokeLinecap="round"
        style={{ animation: `${animName} 3s linear infinite` }} />
    </svg>
    <p style={{ fontSize: 16, fontWeight: 700, color: '#1d4ed8', margin: 0, lineHeight: 1.3 }}>{value}</p>
    <p style={{ fontSize: 10, fontWeight: 600, color: '#3b82f6', margin: '3px 0 0', lineHeight: 1.2 }}>{label}</p>
  </div>
);

const RingProgress: React.FC<{ pct: number; label: string; stroke: string }> = ({ pct, label, stroke }) => {
  const r = 19;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <svg width="58" height="58" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r={r} fill="none" stroke="#dbeafe" strokeWidth="5" />
      <circle cx="25" cy="25" r={r} fill="none" stroke={stroke} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} transform="rotate(-90 25 25)" />
      <text x="25" y="22" textAnchor="middle" dominantBaseline="middle"
        fill="#1d4ed8" fontSize="10" fontWeight="700">{pct}%</text>
      <text x="25" y="36" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="600">{label}</text>
    </svg>
  );
};

const ICON_WRAP: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10,
  background: '#eff6ff', border: '1px solid #bfdbfe',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const ICON_WRAP_DANGER: React.CSSProperties = {
  ...ICON_WRAP, background: '#fef2f2', border: '1px solid #fecaca',
};

const MENU_BTN: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 6px', background: 'transparent', border: 'none',
  cursor: 'pointer', fontFamily: 'inherit', borderRadius: 10,
};

export const ProfileSheet: React.FC<ProfileSheetProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { currentUser, isGuest, signInWithGoogle, signOut } = useAuthContext();
  const {
    completedLessons, totalLessons, lessonProgress,
    completedRoadmapSteps, totalRoadmapSteps, roadmapProgress,
    overallProgress, mergeGuestProgress,
  } = useProgressContext();

  const [customName, setCustomName] = useLocalStorage<string>(STORAGE_KEYS.CUSTOM_DISPLAY_NAME, '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const [frameBox, setFrameBox] = useState<{ left: number; width: number }>({ left: 0, width: 390 });

  useEffect(() => {
    const update = () => {
      const r = getFrameRect();
      if (r) setFrameBox({ left: r.left, width: r.width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const displayName = customName || currentUser?.displayName || 'مستخدم';

  const startEditName = () => {
    setNameInput(customName || currentUser?.displayName || '');
    setIsEditingName(true);
  };
  const saveName = () => { setCustomName(nameInput.trim()); setIsEditingName(false); };
  const cancelEditName = () => setIsEditingName(false);

  const handleGoogleSignIn = async () => {
    setSignInError(null);
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogle();
      await mergeGuestProgress(user.uid);
      setIsSigningIn(false);
    } catch (err) {
      console.error('[ProfileSheet] Google sign-in failed:', err);
      setSignInError('حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.');
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut();
      onClose();
    } catch (err) {
      console.error('[ProfileSheet] Sign-out failed:', err);
      setSignOutError('حدث خطأ أثناء تسجيل الخروج. حاول مرة أخرى.');
    }
  };

  const navAndClose = (path: string) => { onClose(); navigate(path); };

  return (
    <>
      <style>{`
        @keyframes ps-travel-1 {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -240; }
        }
        @keyframes ps-travel-2 {
          from { stroke-dashoffset: -80; }
          to   { stroke-dashoffset: -320; }
        }
        @keyframes ps-travel-3 {
          from { stroke-dashoffset: -160; }
          to   { stroke-dashoffset: -400; }
        }
      `}</style>

      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', top: 0,
            left: frameBox.left, width: frameBox.width, height: '100%',
            background: 'rgba(15,23,42,0.45)', zIndex: 39,
          }}
        />
      )}

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: '80px',
          left: frameBox.left, width: frameBox.width,
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          zIndex: 40,
          background: '#eef4ff',
          borderRadius: '22px 22px 0 0',
          overflow: 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          direction: 'rtl',
          boxShadow: '0 -8px 40px rgba(37,99,235,0.14), 0 -1px 0 rgba(191,219,254,0.9)',
        }}
      >
        {/* Top gradient — handle + identity */}
        <div style={{ background: 'linear-gradient(180deg, #c7d9f8 0%, #eef4ff 100%)', padding: '14px 18px 18px' }}>
          {/* Handle bar */}
          <div style={{ width: 36, height: 4, background: '#93c5fd', borderRadius: 99, margin: '0 auto 18px' }} />

          {/* Identity */}
          {isGuest ? (
            <div style={{ textAlign: 'center', paddingBottom: 4 }}>
              <GuestAvatar />
              <p style={{ fontSize: 17, fontWeight: 700, color: '#0f2543', margin: '10px 0 3px' }}>زائر</p>
              <p style={{ fontSize: 13, color: '#3b7dd8', margin: '0 0 14px', fontWeight: 500 }}>المتابعة كزائر</p>
              {signInError && (
                <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 8px' }}>{signInError}</p>
              )}
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 11,
                  background: '#fff', border: '1.5px solid #60a5fa',
                  color: '#1d4ed8', fontSize: 13, fontWeight: 600,
                  cursor: isSigningIn ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: isSigningIn ? 0.6 : 1,
                  direction: 'rtl',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.10)',
                }}
              >
                <GoogleIcon size={16} />
                {isSigningIn ? '...' : 'سجّل الدخول لحفظ تقدّمك'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="صورة الحساب"
                    style={{ width: 62, height: 62, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #60a5fa' }}
                  />
                ) : (
                  <div style={{
                    width: 62, height: 62, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                    border: '2.5px solid #60a5fa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(37,99,235,0.15)',
                  }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: '#1d4ed8' }}>
                      {displayName[0]}
                    </span>
                  </div>
                )}
                {/* Google badge — bottom-right of avatar */}
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#fff', border: '2px solid #dbeafe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                }}>
                  <GoogleIcon size={13} />
                </div>
              </div>

              {/* Name + badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                      autoFocus
                      style={{
                        flex: 1, minWidth: 0,
                        background: '#fff', border: '1.5px solid #60a5fa',
                        borderRadius: 8, padding: '5px 10px',
                        fontSize: 14, color: '#0f2543', outline: 'none',
                        fontFamily: 'inherit', direction: 'rtl',
                      }}
                    />
                    <button onClick={saveName}
                      style={{ color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                      <Check size={17} />
                    </button>
                    <button onClick={cancelEditName}
                      style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                      <X size={17} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 16, fontWeight: 700, color: '#0f2543',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>
                      {displayName}
                    </span>
                    <button onClick={startEditName}
                      style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex' }}>
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
                <p style={{ fontSize: 12, color: '#2563eb', margin: '4px 0 3px', fontWeight: 500 }}>مسجّل بـ Google</p>
                {currentUser?.email && (
                  <p style={{ fontSize: 11, color: '#5a7fa6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser.email}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stat boxes + rings */}
        <div style={{ padding: '14px 16px 0' }}>
          {/* RTL order: البناء (right) | التقدّم (centre) | الدروس (left) */}
          <div style={{ display: 'flex', gap: 8 }}>
            <StatBox value={`${completedRoadmapSteps.length}/${totalRoadmapSteps}`} label="البناء"  animName="ps-travel-1" />
            <StatBox value={`${overallProgress}%`}                                  label="التقدّم" animName="ps-travel-2" />
            <StatBox value={`${completedLessons.length}/${totalLessons}`}           label="الدروس"  animName="ps-travel-3" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 12 }}>
            <RingProgress pct={lessonProgress}  label="دروس" stroke="#3b82f6" />
            <RingProgress pct={roadmapProgress} label="بناء" stroke="#60a5fa" />
          </div>
        </div>

        {/* Menu */}
        <div style={{ padding: '8px 14px 88px' }}>
          {/* icon is first DOM child → right in RTL; chevron is last → left in RTL */}
          <button onClick={() => navAndClose('/settings')} style={MENU_BTN}>
            <div style={ICON_WRAP}><Settings size={16} color="#1d4ed8" /></div>
            <span style={{ flex: 1, fontSize: 14, color: '#0f2543', fontWeight: 600, textAlign: 'right' }}>الإعدادات</span>
            <ChevronLeft size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
          </button>
          <button onClick={() => navAndClose('/about')} style={MENU_BTN}>
            <div style={ICON_WRAP}><Info size={16} color="#1d4ed8" /></div>
            <span style={{ flex: 1, fontSize: 14, color: '#0f2543', fontWeight: 600, textAlign: 'right' }}>حول التطبيق</span>
            <ChevronLeft size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
          </button>
          <button onClick={() => navAndClose('/privacy')} style={MENU_BTN}>
            <div style={ICON_WRAP}><Shield size={16} color="#1d4ed8" /></div>
            <span style={{ flex: 1, fontSize: 14, color: '#0f2543', fontWeight: 600, textAlign: 'right' }}>الخصوصية</span>
            <ChevronLeft size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
          </button>

          {/* تسجيل الخروج — signed-in only */}
          {!isGuest && (
            <>
              <div style={{ height: 1, background: '#bfdbfe', margin: '6px 8px' }} />
              {signOutError && (
                <p style={{ fontSize: 12, color: '#dc2626', textAlign: 'center', margin: '4px 0' }}>{signOutError}</p>
              )}
              <button onClick={handleSignOut} style={MENU_BTN}>
                <div style={ICON_WRAP_DANGER}><LogOut size={16} color="#dc2626" /></div>
                <span style={{ flex: 1, fontSize: 14, color: '#dc2626', fontWeight: 600, textAlign: 'right' }}>تسجيل الخروج</span>
                <ChevronLeft size={15} color="#fca5a5" style={{ flexShrink: 0 }} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};
