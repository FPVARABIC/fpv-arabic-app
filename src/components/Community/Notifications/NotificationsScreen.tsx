import React, { useEffect, useState } from 'react';
import { ArrowRight, Heart, MessageCircle, UserPlus, Megaphone, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useLessonReminder } from '../hooks/useLessonReminder';
import { announcementPath } from '../utils/firestorePaths';
import { timeAgo } from '../utils/timeAgo';
import { Avatar } from '../Avatar';
import type { Announcement, CommunityNotificationWithId } from '../types';

interface NotificationsScreenProps {
  // Notifications data is owned by CommunityHomeScreens (HomeView.tsx) via
  // a SINGLE useNotifications() instance shared with CommunityHome's own
  // badge count — passed down as props rather than called again here, so
  // marking an item read on this screen updates the exact same unreadCount
  // the header badge reads, not a second, independent hook instance.
  notifications: CommunityNotificationWithId[];
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => void;
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
}

// Lazily fetches the referenced announcements/{id} doc for display — the
// notification doc itself deliberately carries no title/body (every
// notification type shares the same generic schema, see types.ts), so an
// announcement's actual text is looked up on render, not denormalized at
// notification-creation time.
const AnnouncementRow: React.FC<{ announcementId: string; onOpen: () => void }> = ({ announcementId, onOpen }) => {
  const [announcement, setAnnouncement] = useState<Announcement | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(firestoreDb, announcementPath(announcementId)))
      .then(snap => { if (!cancelled) setAnnouncement(snap.exists() ? (snap.data() as Announcement) : null); })
      .catch(err => { console.error('[NotificationsScreen:announcement]', err); if (!cancelled) setAnnouncement(null); });
    return () => { cancelled = true; };
  }, [announcementId]);

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'right',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: '#fef3c7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Megaphone size={16} color="#b45309" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: '#1a2b3c', margin: 0, fontWeight: 700 }}>
          {announcement === undefined ? 'جارٍ التحميل...' : announcement?.title ?? 'إعلان لم يعد متاحاً'}
        </p>
        {announcement?.body && (
          <p style={{ fontSize: 12, color: '#5a6b7c', margin: '2px 0 0', lineHeight: 1.5 }}>{announcement.body}</p>
        )}
      </div>
    </button>
  );
};

const notificationText = (n: CommunityNotificationWithId): string => {
  switch (n.type) {
    case 'follow': return `${n.actorName ?? 'مستخدم'} بدأ متابعتك`;
    case 'like_post': return `${n.actorName ?? 'مستخدم'} أعجب بمنشورك`;
    case 'like_comment': return `${n.actorName ?? 'مستخدم'} أعجب بتعليقك`;
    case 'comment': return `${n.actorName ?? 'مستخدم'} علّق على منشورك`;
    default: return '';
  }
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications, loading, error, markAsRead, onBack, onOpenPost, onOpenAuthor,
}) => {
  const { reminder, dismiss } = useLessonReminder();
  const navigate = useNavigate();

  const handleOpen = (n: CommunityNotificationWithId) => {
    if (!n.read) markAsRead(n.id);
    if (n.type === 'follow' && n.actorId) onOpenAuthor(n.actorId);
    else if ((n.type === 'like_post' || n.type === 'comment') && n.postId) onOpenPost(n.postId);
    else if (n.type === 'like_comment' && n.postId) onOpenPost(n.postId);
  };

  const openLessonReminder = () => {
    if (!reminder) return;
    dismiss();
    navigate(`/lessons/${reminder.lessonId}`);
  };

  return (
    <div style={{ minHeight: '100%', background: '#f7f9fb' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
        borderBottom: '0.5px solid #e5eaf0', background: '#ffffff',
      }}>
        <button onClick={onBack} aria-label="رجوع" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a2b3c', display: 'flex' }}>
          <ArrowRight size={20} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c' }}>الإشعارات</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px 24px' }}>
        {/* Lesson-progress reminder (Notifications Phase 1, type 4) — a
            purely client-rendered, Firestore-independent pseudo-entry,
            merged into the same inbox surface rather than a second UI
            location. Always rendered first when present. */}
        {reminder && (
          <button
            onClick={openLessonReminder}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'right',
              background: '#eefcfb', border: '0.5px solid #99f0ea', borderRadius: 14, padding: 12, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: '#0e7c86',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BookOpen size={16} color="#ffffff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: '#1a2b3c', margin: 0, fontWeight: 700 }}>لم تكمل هذا الدرس بعد</p>
              <p style={{ fontSize: 12, color: '#5a6b7c', margin: '2px 0 0' }}>{reminder.lessonTitle}</p>
            </div>
          </button>
        )}

        {loading && notifications.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 24 }}>جارٍ التحميل...</p>
        )}
        {!loading && error && (
          <p style={{ textAlign: 'center', color: '#dc2626', fontSize: 13, padding: 24 }}>{error}</p>
        )}
        {!loading && !error && notifications.length === 0 && !reminder && (
          <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 32 }}>لا توجد إشعارات بعد.</p>
        )}

        {notifications.map(n => (
          <div
            key={n.id}
            style={{
              background: n.read ? '#ffffff' : '#f0fdfa',
              border: '0.5px solid #e5eaf0', borderRadius: 14, padding: 12,
            }}
          >
            {n.type === 'announcement' && n.targetId ? (
              <AnnouncementRow announcementId={n.targetId} onOpen={() => { if (!n.read) markAsRead(n.id); }} />
            ) : (
              <button
                onClick={() => handleOpen(n)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'right',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <Avatar photoURL={n.actorPhoto} name={n.actorName ?? 'مستخدم'} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: '#1a2b3c', margin: 0 }}>{notificationText(n)}</p>
                  <span style={{ fontSize: 11, color: '#94a3b3' }} dir="ltr">{timeAgo(n.createdAt)}</span>
                </div>
                <div style={{ flexShrink: 0, color: '#94a3b3', display: 'flex' }}>
                  {n.type === 'follow' && <UserPlus size={16} />}
                  {(n.type === 'like_post' || n.type === 'like_comment') && <Heart size={16} />}
                  {n.type === 'comment' && <MessageCircle size={16} />}
                </div>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
