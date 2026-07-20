import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { ANNOUNCEMENTS_COLLECTION, notificationsPath } from '../utils/firestorePaths';

// Announcements are moderator-broadcast only — rare, low-volume by
// construction (see AnnouncementComposerScreen.tsx, the only create path).
// Both caps below are defensive ceilings, not realistic ones — the same
// "not expected to bind in practice" judgment call already documented for
// COMMENTS_TAIL_SAFETY_LIMIT in usePost.ts.
const RECENT_ANNOUNCEMENTS_LIMIT = 20;
const EXISTING_MIRRORS_SAFETY_LIMIT = 200;

// Deterministic per-(uid, announcementId) notification document ID — the
// same defense-in-depth idempotency technique already used elsewhere in this
// codebase for a "this exact pairing happens at most once" guarantee
// (postLikePath/commentLikePath key on (targetId, uid) the same way). Even if
// the pre-check below ever raced or missed an already-mirrored entry, a
// second write attempt to this SAME doc ID is evaluated as an `update` by
// firestore.rules (the document already exists at that point) — and that
// update rule is scoped to hasOnly(['read']) only, so a full-shape repeat
// write is denied outright, never silently duplicated.
const mirrorNotificationId = (announcementId: string): string => `announcement-${announcementId}`;

// Fills in the missing half of the announcement mechanism (Notifications
// Phase 1 built the Rules and the schema; nothing ever called them — see the
// investigation that found this gap). One-shot reconciliation, not a
// listener: matches this codebase's own established notifications
// convention (useNotifications.ts's own comment: no onSnapshot exists
// anywhere in Community notification code, and this doesn't introduce the
// first one). Called from useNotifications.ts's load() — see that file for
// why that's the right trigger point.
//
// Best-effort: a failure here must never break the notifications list/badge
// itself loading, so every error is caught here and never rethrown.
export async function mirrorUnseenAnnouncements(uid: string): Promise<void> {
  try {
    const [announcementsSnap, existingMirrorsSnap] = await Promise.all([
      getDocs(query(
        collection(firestoreDb, ANNOUNCEMENTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(RECENT_ANNOUNCEMENTS_LIMIT),
      )),
      // Bare single-field equality filter — the same automatic single-field
      // index Firestore always maintains already covers this (identical
      // precedent to useNotifications.ts's own unreadQuery, a bare
      // where('read','==',false)); no firestore.indexes.json entry needed.
      getDocs(query(
        collection(firestoreDb, notificationsPath(uid)),
        where('type', '==', 'announcement'),
        limit(EXISTING_MIRRORS_SAFETY_LIMIT),
      )),
    ]);

    const alreadyMirroredIds = new Set(
      existingMirrorsSnap.docs.map(d => d.data().targetId as string),
    );

    const unmirrored = announcementsSnap.docs.filter(d => !alreadyMirroredIds.has(d.id));
    if (unmirrored.length === 0) return;

    await Promise.all(unmirrored.map(announcementDoc =>
      setDoc(doc(firestoreDb, notificationsPath(uid), mirrorNotificationId(announcementDoc.id)), {
        type: 'announcement',
        actorId: null,
        actorName: null,
        actorPhoto: null,
        targetType: 'announcement',
        targetId: announcementDoc.id,
        postId: null,
        read: false,
        createdAt: serverTimestamp(),
      }).catch(err => {
        // A single announcement's mirror failing (a genuine race against
        // another tab/session for the same user, or any other transient
        // issue) must never abort the others.
        console.error('[mirrorUnseenAnnouncements] mirror write failed', announcementDoc.id, err);
      }),
    ));
  } catch (err) {
    console.error('[mirrorUnseenAnnouncements]', err);
  }
}
