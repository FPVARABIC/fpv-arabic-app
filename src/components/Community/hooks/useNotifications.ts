import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection, doc, getDocs, getCountFromServer, limit, orderBy, query, updateDoc, where,
} from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { notificationsPath, notificationPath } from '../utils/firestorePaths';
import type { CommunityNotification, CommunityNotificationWithId } from '../types';

const PAGE_SIZE = 30;

export interface UseNotificationsResult {
  notifications: CommunityNotificationWithId[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  refresh: () => void;
  markAsRead: (notificationId: string) => void;
}

// One-shot fetch + manual refresh, matching this codebase's existing
// convention (useFeed.ts/usePost.ts/useFollow.ts) — no onSnapshot listener
// exists anywhere in Community code today, and this hook doesn't introduce
// the first one. The list query (orderBy('createdAt','desc')) and the
// unread-count query (a bare where('read','==',false)) each need only the
// automatic single-field index Firestore always maintains — no new entries
// in firestore.indexes.json required for either.
export const useNotifications = (): UseNotificationsResult => {
  const { currentUser } = useAuthContext();
  const currentUid = currentUser?.uid ?? null;

  const [notifications, setNotifications] = useState<CommunityNotificationWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Same "mint a fresh generation per invocation, only apply if still
  // current" pattern already used by useFollow.ts/useFeed.ts — an older,
  // slower-resolving load() can never clobber a newer one's already-applied
  // result regardless of resolution order.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const localId = ++requestIdRef.current;
    if (!currentUid) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const listQuery = query(
        collection(firestoreDb, notificationsPath(currentUid)),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
      );
      const unreadQuery = query(
        collection(firestoreDb, notificationsPath(currentUid)),
        where('read', '==', false),
      );
      const [listSnap, unreadSnap] = await Promise.all([
        getDocs(listQuery),
        getCountFromServer(unreadQuery),
      ]);
      if (localId !== requestIdRef.current) return;
      setNotifications(listSnap.docs.map(d => ({ id: d.id, ...(d.data() as CommunityNotification) })));
      setUnreadCount(unreadSnap.data().count);
    } catch (err) {
      if (localId !== requestIdRef.current) return;
      console.error('[useNotifications:load]', err);
      setError('تعذّر تحميل الإشعارات.');
    } finally {
      if (localId === requestIdRef.current) setLoading(false);
    }
  }, [currentUid]);

  useEffect(() => {
    load();
    return () => {
      requestIdRef.current += 1;
    };
  }, [load]);

  const markAsRead = useCallback((notificationId: string) => {
    if (!currentUid) return;
    // Optimistic local flip — this is the owner's own inbox metadata, low
    // stakes: unlike a like/follow toggle, a failed mark-as-read has no
    // visible rollback need beyond a console log — the item simply still
    // shows as unread on the next refresh.
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
    updateDoc(doc(firestoreDb, notificationPath(currentUid, notificationId)), { read: true })
      .catch(err => console.error('[useNotifications:markAsRead]', err));
  }, [currentUid]);

  return { notifications, loading, error, unreadCount, refresh: load, markAsRead };
};
