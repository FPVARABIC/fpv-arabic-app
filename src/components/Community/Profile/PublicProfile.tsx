import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { userPath } from '../utils/firestorePaths';
import type { CommunityUser } from '../types';
import { Avatar } from '../Avatar';

interface PublicProfileProps {
  uid: string;
  onBack: () => void;
}

// Photo, name, posts count, join date — nothing more (D2). No saved posts,
// no activity feed, no other social surface — those never belong here.
export const PublicProfile: React.FC<PublicProfileProps> = ({ uid, onBack }) => {
  const [user, setUser] = useState<CommunityUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const snap = await getDoc(doc(firestoreDb, userPath(uid)));
      if (!cancelled) {
        setUser(snap.exists() ? (snap.data() as CommunityUser) : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <div style={{ minHeight: '100%', background: '#f7f9fb' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
        borderBottom: '0.5px solid #e5eaf0', background: '#ffffff',
      }}>
        <button onClick={onBack} aria-label="رجوع" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a2b3c', display: 'flex' }}>
          <ArrowRight size={20} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c' }}>الملف الشخصي</span>
      </div>

      {loading && <p style={{ padding: 24, textAlign: 'center', color: '#94a3b3', fontSize: 13 }}>جارٍ التحميل...</p>}
      {!loading && !user && (
        <p style={{ padding: 24, textAlign: 'center', color: '#94a3b3', fontSize: 13 }}>هذا المستخدم غير موجود.</p>
      )}

      {user && (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar photoURL={user.photoURL} name={user.displayName} size={76} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#1a2b3c', marginTop: 12 }}>{user.displayName}</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 16 }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0e7c86', margin: 0 }} dir="ltr">{user.postsCount}</p>
              <p style={{ fontSize: 12, color: '#5a6b7c', margin: '2px 0 0' }}>منشور</p>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a2b3c', margin: 0 }} dir="ltr">{formatJoinDate(user.joinedAt)}</p>
              <p style={{ fontSize: 12, color: '#94a3b3', margin: '2px 0 0' }}>تاريخ الانضمام</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Western digits everywhere (D12) — toLocaleString('ar') would produce
// Eastern Arabic numerals, so 'en-GB' formatting is used deliberately while
// the surrounding label stays Arabic.
const formatJoinDate = (joinedAt: CommunityUser['joinedAt']): string =>
  joinedAt.toDate().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
