import React, { useEffect, useState } from 'react';
import { Search as SearchIcon, ExternalLink } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useUserSearch } from '../hooks/useUserSearch';
import { useUserStatus } from '../hooks/useUserStatus';
import { userPath } from '../utils/firestorePaths';
import { Avatar } from '../Avatar';
import type { CommunityUser } from '../types';

interface UserManagementScreenProps {
  onOpenAuthor: (authorId: string) => void;
}

// Detail view — reuses PublicProfile.tsx's exact getDoc(userPath(uid))
// pattern (Rules already permit reading the full users/{uid} document,
// `allow read: if true` — no Rules change needed here). Only the fields
// PublicProfile already fetches but doesn't render (role/status/postsCount)
// are additionally shown; nothing new is read.
interface UserFetchState {
  uid: string | null;
  user: CommunityUser | null;
  // Optimistic override applied after a successful ban/unban write, so the
  // badge/button flip instantly without waiting on a re-fetch.
  statusOverride: CommunityUser['status'] | null;
}

const UserDetail: React.FC<{ uid: string; onOpenAuthor: (authorId: string) => void }> = ({ uid, onOpenAuthor }) => {
  const { currentUser } = useAuthContext();
  const { submitting, error, setUserStatus } = useUserStatus();
  // Derived, not stored (same fix documented in usePost.ts): `fetchState.uid`
  // records which uid the last completed fetch belongs to; `isCurrent` below
  // compares it against the CURRENT uid prop, so switching the selected
  // account never needs a synchronous setState-to-reset inside the effect —
  // stale data just never renders (isCurrent is false until the new fetch
  // resolves).
  const [fetchState, setFetchState] = useState<UserFetchState>({ uid: null, user: null, statusOverride: null });

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(firestoreDb, userPath(uid)))
      .then(snap => {
        if (cancelled) return;
        setFetchState({ uid, user: snap.exists() ? (snap.data() as CommunityUser) : null, statusOverride: null });
      })
      .catch(err => {
        console.error('[UserManagementScreen:detail]', err);
        if (!cancelled) setFetchState({ uid, user: null, statusOverride: null });
      });
    return () => { cancelled = true; };
  }, [uid]);

  const isCurrent = fetchState.uid === uid;
  const loading = !isCurrent;
  const user = isCurrent ? fetchState.user : null;

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 24 }}>جارٍ التحميل...</p>;
  }
  if (!user) {
    return <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 24 }}>لم يعد هذا الحساب متاحاً.</p>;
  }

  const isSelf = currentUser?.uid === uid;
  const isOtherModerator = user.role === 'moderator' && !isSelf;
  const effectiveStatus = fetchState.statusOverride ?? user.status;
  const banDisabledReason = isSelf
    ? 'لا يمكنك تغيير حالة حسابك الخاص من هنا'
    : isOtherModerator
      ? 'لا يمكن حظر مشرف آخر من هنا'
      : null;

  const toggleBan = async () => {
    const nextStatus = effectiveStatus === 'banned' ? 'active' : 'banned';
    const ok = await setUserStatus(uid, nextStatus);
    if (ok) setFetchState(prev => (prev.uid === uid ? { ...prev, statusOverride: nextStatus } : prev));
  };

  return (
    <div style={{ background: '#ffffff', border: '0.5px solid #e5eaf0', borderRadius: 14, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Avatar photoURL={user.photoURL} name={user.displayName} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c', margin: 0 }}>{user.displayName}</p>
          <p style={{ fontSize: 12, color: '#94a3b3', margin: '2px 0 0' }}>{user.postsCount} منشور</p>
        </div>
        <button
          onClick={() => onOpenAuthor(uid)}
          aria-label="عرض الملف الكامل"
          style={{ background: 'none', border: 'none', color: '#94a3b3', cursor: 'pointer', display: 'flex' }}
        >
          <ExternalLink size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
          background: user.role === 'moderator' ? '#eaf2ff' : '#eef2f6',
          color: user.role === 'moderator' ? '#1d4ed8' : '#5a6b7c',
        }}>
          {user.role === 'moderator' ? 'مشرف' : 'عضو'}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
          background: effectiveStatus === 'banned' ? '#fef2f2' : '#f0fdf4',
          color: effectiveStatus === 'banned' ? '#b91c1c' : '#166534',
        }}>
          {effectiveStatus === 'banned' ? 'محظور' : 'نشط'}
        </span>
      </div>

      {error && <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 10px' }}>{error}</p>}
      {banDisabledReason && (
        <p style={{ fontSize: 11, color: '#94a3b3', margin: '0 0 8px' }}>{banDisabledReason}</p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={toggleBan}
          disabled={submitting || !!banDisabledReason}
          style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none',
            background: (submitting || banDisabledReason) ? '#e5eaf0' : (effectiveStatus === 'banned' ? '#0e7c86' : '#dc2626'),
            color: (submitting || banDisabledReason) ? '#94a3b3' : '#ffffff',
            fontSize: 13, fontWeight: 700, cursor: (submitting || banDisabledReason) ? 'not-allowed' : 'pointer',
          }}
        >
          {effectiveStatus === 'banned' ? 'إلغاء الحظر' : 'حظر الحساب'}
        </button>
      </div>

      {/* Promotion to moderator has no client write path today (role is
          console-only, by design — see the design writeup's bootstrap
          disclosure) and this task deliberately keeps it that way even for
          an existing moderator acting on another account: a scoped Rules
          exception for status exists now, but role stays console-only to
          bound a compromised moderator account's blast radius. Shown
          disabled, with an honest note, rather than hidden — a moderator
          should know the capability exists but isn't available here. */}
      {user.role !== 'moderator' && (
        <div style={{ marginTop: 8 }}>
          <button
            disabled
            style={{
              width: '100%', padding: '10px', borderRadius: 10, border: '0.5px solid #e5eaf0',
              background: '#f7f9fb', color: '#94a3b3', fontSize: 13, fontWeight: 700, cursor: 'not-allowed',
            }}
          >
            ترقية إلى مشرف
          </button>
          <p style={{ fontSize: 11, color: '#94a3b3', margin: '6px 0 0', textAlign: 'center' }}>
            متاحة فقط عبر Firebase Console حالياً
          </p>
        </div>
      )}
    </div>
  );
};

// User management (Admin dashboard, Phase 2) — search/list reuses
// useUserSearch.ts UNCHANGED (no rebuild); selecting a result loads the
// detail view above. No Rules changes needed for reading — only the
// status-only ban/unban write is new (see firestore.rules' users/{uid}
// update rule and useUserStatus.ts).
export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ onOpenAuthor }) => {
  const [input, setInput] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const { results, loading, hasSearched, error, search, clear } = useUserSearch();

  const runSearch = (q: string) => {
    setInput(q);
    setSelectedUid(null);
    if (q.trim().length === 0) {
      clear();
      return;
    }
    search(q);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#ffffff', borderRadius: 10, padding: '8px 12px', border: '0.5px solid #e5eaf0',
        marginBottom: 14,
      }}>
        <SearchIcon size={16} color="#94a3b3" />
        <input
          value={input}
          onChange={e => runSearch(e.target.value)}
          placeholder="ابحث باسم العضو..."
          dir="auto"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#1a2b3c' }}
        />
      </div>

      {hasSearched && loading && (
        <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 20 }}>جارٍ البحث...</p>
      )}
      {hasSearched && !loading && error && (
        <p style={{ textAlign: 'center', color: '#dc2626', fontSize: 13, padding: 20 }}>{error}</p>
      )}
      {hasSearched && !loading && !error && results.length === 0 && (
        <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 20 }}>لا توجد حسابات مطابقة.</p>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map(user => (
            <button
              key={user.uid}
              onClick={() => setSelectedUid(user.uid)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff',
                border: selectedUid === user.uid ? '1px solid #0e7c86' : '0.5px solid #e5eaf0',
                borderRadius: 12, padding: 10, cursor: 'pointer', textAlign: 'right',
              }}
            >
              <Avatar photoURL={user.photoURL} name={user.displayName} size={36} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2b3c' }}>{user.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {selectedUid && <UserDetail uid={selectedUid} onOpenAuthor={onOpenAuthor} />}
    </div>
  );
};
