import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Settings, Info, Shield, ShieldCheck, LogOut, Pencil, Check, X, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useProgressContext } from '../contexts/ProgressContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { firestoreDb } from '../lib/firebase';
import { userPath } from './Community/utils/firestorePaths';
import { AvatarPicker } from './Auth/AvatarPicker';
import { AuthPanel, GoogleIcon } from './Auth/AuthPanel';

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
  // Optional: navigates to the current user's existing PublicProfile
  // (Community screen). Omitted by call sites with no Community profile
  // screen to navigate to (e.g. the legacy dashboard) — in that case the
  // avatar/name simply render as before, non-interactive.
  onOpenProfile?: (uid: string) => void;
  // Admin dashboard (Phase 2) — omitted by call sites with no admin screen
  // to navigate to (mirrors onOpenProfile's own convention). The row itself
  // is only rendered when isModerator is true; see useIsModerator.ts for
  // where that comes from — this component never fetches role itself.
  isModerator?: boolean;
  onOpenAdmin?: () => void;
}

const getFrameRect = (): DOMRect | null => {
  const el = document.querySelector('[data-app-frame="true"]');
  return el ? el.getBoundingClientRect() : null;
};

// Unified across all 3 identity states (guest / signed-in-with-photo /
// signed-in-without-photo) — approved as one shared visual language rather
// than each state having its own avatar size.
const AVATAR_SIZE = 64;

// Flex-centered wrapper — the actual fix for the previous positioning bug.
// The old code used textAlign:'center' on a block-level parent, which only
// ever centers inline content; Tailwind's preflight forces
// `svg { display: block }`, so the avatar SVG was never actually affected
// by that text-align and fell back to sitting flush against its RTL
// start edge (the right side). A flex column with alignItems:'center'
// centers block-level children regardless of their display value.
const AvatarHeaderWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
    {children}
  </div>
);

const GuestAvatar: React.FC = () => (
  <svg width={AVATAR_SIZE} height={AVATAR_SIZE} viewBox="0 0 68 68" fill="none" aria-hidden="true">
    <circle cx="34" cy="34" r="33" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2"/>
    <circle cx="34" cy="27" r="11" fill="#60a5fa"/>
    <path d="M10 58c0-13.255 10.745-24 24-24s24 10.745 24 24" fill="#60a5fa"/>
  </svg>
);

// Signed-in avatar with a genuine onError fallback — the previous version
// only checked whether photoURL was truthy, so a present-but-broken URL
// (expired Google CDN link, network hiccup) rendered a broken image icon
// instead of falling back. imgFailed resets whenever photoURL itself
// changes, so a since-fixed URL isn't permanently stuck on the fallback.
// showGoogleBadge — the badge/label used to be unconditional, assuming
// every signed-in user came from Google. Email/password accounts (Part B)
// made that false; the caller now passes whether this specific user's
// first provider entry is actually 'google.com'.
const SignedInAvatar: React.FC<{ photoURL: string | null; letter: string; showGoogleBadge: boolean }> = ({ photoURL, letter, showGoogleBadge }) => {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [photoURL]);
  const showImg = !!photoURL && !imgFailed;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {showImg ? (
        <img
          src={photoURL!}
          alt="صورة الحساب"
          onError={() => setImgFailed(true)}
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #60a5fa' }}
        />
      ) : (
        <div style={{
          width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: '50%',
          background: '#3b7dd8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(37,99,235,0.15)',
        }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#ffffff' }}>{letter}</span>
        </div>
      )}
      {showGoogleBadge && (
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 22, height: 22, borderRadius: '50%',
          background: '#fff', border: '2px solid #dbeafe',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}>
          <GoogleIcon size={13} />
        </div>
      )}
    </div>
  );
};

// Single unified stats card replacing the old 3-separate-boxes +
// 2-separate-rings layout. Values are passed in as already-computed
// strings — no calculation lives here; overallProgress/lessonProgress/
// roadmapProgress themselves are untouched in useProgress.ts, only their
// separate circular (ring) visualization is removed.
const StatsCard: React.FC<{ lessons: string; progress: string; build: string }> = ({ lessons, progress, build }) => (
  <div style={{ background: '#f5f8ff', borderRadius: 14, display: 'flex', padding: '14px 0' }}>
    {[
      { v: build, l: 'البناء' },
      { v: progress, l: 'التقدّم' },
      { v: lessons, l: 'الدروس' },
    ].map((s, i) => (
      <React.Fragment key={s.l}>
        {i > 0 && <div style={{ width: 1, background: '#dbeafe' }} />}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8', margin: 0 }}>{s.v}</p>
          <p style={{ fontSize: 11, color: '#3b82f6', margin: '3px 0 0' }}>{s.l}</p>
        </div>
      </React.Fragment>
    ))}
  </div>
);

const ICON_WRAP: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10,
  background: '#eaf2ff', border: '1px solid #bfdbfe',
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

export const ProfileSheet: React.FC<ProfileSheetProps> = ({ open, onClose, onOpenProfile, isModerator, onOpenAdmin }) => {
  const navigate = useNavigate();
  const { currentUser, isGuest, signOut } = useAuthContext();
  const {
    completedLessons, totalLessons,
    completedRoadmapSteps, totalRoadmapSteps,
    overallProgress, mergeGuestProgress,
  } = useProgressContext();
  // lessonProgress/roadmapProgress are still computed exactly as before in
  // useProgress.ts — unused here now that their separate ring visualization
  // is dropped; overallProgress alone represents "التقدّم" in the card.

  const [customName, setCustomName] = useLocalStorage<string>(STORAGE_KEYS.CUSTOM_DISPLAY_NAME, '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [signOutError, setSignOutError] = useState<string | null>(null);
  // Guest's AuthPanel expanded past the initial "سجّل الدخول للمتابعة"
  // prompt into the actual form — while true, StatsCard/the settings menu
  // below are hidden (see their own condition) so the unbounded-height
  // guest sheet doesn't crowd them together with the sign-in/up form.
  const [authExpanded, setAuthExpanded] = useState(false);

  // Preset avatar change (Part C) — general profile feature, available to
  // every signed-in user regardless of how they signed up (Google or
  // email/password both reach the exact same firestore.rules update
  // branch; Rules never inspect provider). avatarOverride is a local,
  // optimistic display override: updateProfile() mutates the SAME
  // firebase/auth User object AuthContext's currentUser state already
  // holds, but mutating an object in place doesn't itself trigger a React
  // re-render, so this sheet's own header would otherwise keep showing the
  // old photo until some unrelated re-render happened to occur.
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);

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
  const isGoogleUser = currentUser?.providerData?.[0]?.providerId === 'google.com';
  const effectivePhotoURL = avatarOverride ?? currentUser?.photoURL ?? null;

  const openAvatarPicker = () => {
    setAvatarError(null);
    setPendingAvatar(effectivePhotoURL);
    setShowAvatarPicker(true);
  };
  const cancelAvatarPicker = () => setShowAvatarPicker(false);
  const saveAvatar = async () => {
    if (!currentUser || !pendingAvatar || avatarSaving) return;
    setAvatarSaving(true);
    setAvatarError(null);
    try {
      // Firestore first (the community-facing representation, gated by
      // firestore.rules' photoURL-only update branch), then the local
      // Firebase Auth profile (so this sheet's own header — and anywhere
      // else already holding this same currentUser reference — reflects it
      // without needing a full reload).
      await updateDoc(doc(firestoreDb, userPath(currentUser.uid)), { photoURL: pendingAvatar });
      await updateProfile(currentUser, { photoURL: pendingAvatar });
      setAvatarOverride(pendingAvatar);
      setShowAvatarPicker(false);
    } catch (err) {
      console.error('[ProfileSheet] Avatar update failed:', err);
      setAvatarError('تعذّر تحديث الصورة. حاول مرة أخرى.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const startEditName = () => {
    setNameInput(customName || currentUser?.displayName || '');
    setIsEditingName(true);
  };
  const saveName = () => { setCustomName(nameInput.trim()); setIsEditingName(false); };
  const cancelEditName = () => setIsEditingName(false);

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

  // Reuses the exact same Community profile navigation already wired for
  // every other author (CommunityHome's own-avatar tap, PostCard/PostDetail/
  // CommentsList's onOpenAuthor) — just called with the current user's own
  // uid via the onOpenProfile callback passed down from HomeView. No new
  // profile screen, route, or duplicated profile logic is introduced.
  const openOwnProfile = () => {
    if (!currentUser || !onOpenProfile) return;
    onClose();
    onOpenProfile(currentUser.uid);
  };

  return (
    <>
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
        <div style={{ background: 'linear-gradient(180deg, #eaf2ff 0%, #ffffff 100%)', padding: '14px 18px 18px' }}>
          {/* Handle bar */}
          <div style={{ width: 36, height: 4, background: '#93c5fd', borderRadius: 99, margin: '0 auto 18px' }} />

          {/* Identity */}
          {isGuest ? (
            <AvatarHeaderWrap>
              <GuestAvatar />
              <p style={{ fontSize: 17, fontWeight: 700, color: '#0f2543', margin: '10px 0 3px' }}>زائر</p>
              <p style={{ fontSize: 13, color: '#3b7dd8', margin: '0 0 14px', fontWeight: 500 }}>المتابعة كزائر</p>
              <AuthPanel
                mode="compact"
                theme="light"
                visible={open}
                onExpandedChange={setAuthExpanded}
                onSignedIn={async (user) => { await mergeGuestProgress(user.uid); }}
                onGuestContinue={() => {}}
              />
            </AvatarHeaderWrap>
          ) : (
            <AvatarHeaderWrap>
              <button
                onClick={openOwnProfile}
                aria-label="فتح ملفك الشخصي"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
              >
                <SignedInAvatar photoURL={effectivePhotoURL} letter={displayName[0]} showGoogleBadge={isGoogleUser} />
              </button>

              {/* Name + badge */}
              <div style={{ marginTop: 10, width: '100%' }}>
                {isEditingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <input
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                      autoFocus
                      style={{
                        flex: 1, minWidth: 0, maxWidth: 200,
                        background: '#fff', border: '1.5px solid #60a5fa',
                        borderRadius: 8, padding: '5px 10px',
                        fontSize: 14, color: '#0f2543', outline: 'none',
                        fontFamily: 'inherit', direction: 'rtl', textAlign: 'center',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <button
                      onClick={openOwnProfile}
                      aria-label="فتح ملفك الشخصي"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: 0, display: 'inline-flex', fontFamily: 'inherit' }}
                    >
                      <span style={{
                        fontSize: 16, fontWeight: 700, color: '#0f2543',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
                      }}>
                        {displayName}
                      </span>
                    </button>
                    <button onClick={startEditName}
                      style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex' }}>
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
                <p style={{ fontSize: 12, color: '#2563eb', margin: '4px 0 3px', fontWeight: 500 }}>
                  {isGoogleUser ? 'مسجّل بـ Google' : 'مسجّل بالبريد الإلكتروني'}
                </p>
                {currentUser?.email && (
                  <p style={{
                    fontSize: 11, color: '#5a7fa6', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {currentUser.email}
                  </p>
                )}
              </div>
            </AvatarHeaderWrap>
          )}
        </div>

        {/* Unified stats card + menu — hidden while the guest's AuthPanel is
            expanded into its actual form: the guest sheet has no max-height/
            scroll boundary of its own (see the Sheet div's own style above),
            so an expanded sign-in/sign-up form plus this content together
            can exceed the viewport with nothing to separate them. Collapsed
            state (the initial "سجّل الدخول للمتابعة" prompt) is unaffected —
            authExpanded starts false and this renders exactly as before. */}
        {!authExpanded && (
        <>
        <div style={{ padding: '14px 16px 0' }}>
          <StatsCard
            build={`${completedRoadmapSteps.length}/${totalRoadmapSteps}`}
            progress={`${overallProgress}%`}
            lessons={`${completedLessons.length}/${totalLessons}`}
          />
        </div>

        {/* Menu */}
        <div style={{ padding: '14px 14px 88px' }}>
          {/* icon is first DOM child → right in RTL; chevron is last → left in RTL */}
          {/* لوحة الإشراف — moderator-only entry point (Phase 2). Rendered
              conditionally, never disabled-but-visible: a non-moderator must
              never even see this row exists. Purely a UX gate — the
              destination screen independently re-checks isModerator on its
              own mount, and every underlying write is separately enforced by
              firestore.rules' isModerator() checks regardless of this. */}
          {isModerator && onOpenAdmin && (
            <button onClick={() => { onClose(); onOpenAdmin(); }} style={MENU_BTN}>
              <div style={ICON_WRAP}><ShieldCheck size={16} color="#3b7dd8" /></div>
              <span style={{ flex: 1, fontSize: 14, color: '#0f2543', fontWeight: 600, textAlign: 'right' }}>لوحة الإشراف</span>
              <ChevronLeft size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
            </button>
          )}
          {/* تغيير الصورة الشخصية (Part C) — general profile feature, every
              signed-in user regardless of how they signed up. Guests have
              no users/{uid} doc to update, so this is !isGuest-gated the
              same way تسجيل الخروج below is. */}
          {!isGuest && (
            <>
              <button onClick={() => (showAvatarPicker ? cancelAvatarPicker() : openAvatarPicker())} style={MENU_BTN}>
                <div style={ICON_WRAP}><ImageIcon size={16} color="#3b7dd8" /></div>
                <span style={{ flex: 1, fontSize: 14, color: '#0f2543', fontWeight: 600, textAlign: 'right' }}>تغيير الصورة الشخصية</span>
                <ChevronLeft size={15} color="#60a5fa" style={{ flexShrink: 0, transform: showAvatarPicker ? 'rotate(-90deg)' : undefined }} />
              </button>
              {showAvatarPicker && (
                <div style={{ padding: '4px 6px 12px' }}>
                  {avatarError && (
                    <p style={{ fontSize: 12, color: '#dc2626', textAlign: 'center', margin: '0 0 8px' }}>{avatarError}</p>
                  )}
                  <AvatarPicker selected={pendingAvatar} onSelect={setPendingAvatar} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={saveAvatar}
                      disabled={avatarSaving || !pendingAvatar}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: '#3b7dd8', border: 'none', color: '#fff',
                        fontSize: 13, fontWeight: 600, cursor: avatarSaving ? 'default' : 'pointer',
                        opacity: avatarSaving ? 0.6 : 1, fontFamily: 'inherit',
                      }}
                    >
                      حفظ
                    </button>
                    <button
                      onClick={cancelAvatarPicker}
                      disabled={avatarSaving}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: 'transparent', border: '1px solid #bfdbfe', color: '#64748b',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          <button onClick={() => navAndClose('/settings')} style={MENU_BTN}>
            <div style={ICON_WRAP}><Settings size={16} color="#3b7dd8" /></div>
            <span style={{ flex: 1, fontSize: 14, color: '#0f2543', fontWeight: 600, textAlign: 'right' }}>الإعدادات</span>
            <ChevronLeft size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
          </button>
          <button onClick={() => navAndClose('/about')} style={MENU_BTN}>
            <div style={ICON_WRAP}><Info size={16} color="#3b7dd8" /></div>
            <span style={{ flex: 1, fontSize: 14, color: '#0f2543', fontWeight: 600, textAlign: 'right' }}>حول التطبيق</span>
            <ChevronLeft size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
          </button>
          <button onClick={() => navAndClose('/privacy')} style={MENU_BTN}>
            <div style={ICON_WRAP}><Shield size={16} color="#3b7dd8" /></div>
            <span style={{ flex: 1, fontSize: 14, color: '#0f2543', fontWeight: 600, textAlign: 'right' }}>الخصوصية</span>
            <ChevronLeft size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
          </button>

          {/* تسجيل الخروج — signed-in only; same real signOut() already
              wired previously, only the row's visual styling changed to
              match the unified icon-square menu treatment above. */}
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
        </>
        )}
      </div>
    </>
  );
};
