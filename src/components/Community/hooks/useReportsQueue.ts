import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection, query, where, orderBy, limit, startAfter, getDocs, doc, updateDoc,
  type QueryConstraint, type QueryDocumentSnapshot, type DocumentData,
} from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { REPORTS_COLLECTION, postPath, commentPath } from '../utils/firestorePaths';
import type { Report, ReportWithId } from '../types';

const PAGE_SIZE = 20;

export interface UseReportsQueueResult {
  reports: ReportWithId[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  loadMore: () => void;
  refresh: () => void;
  // Per-report action state — keyed by reportId, so one report's in-flight
  // action never disables another report's buttons.
  actionState: Record<string, { submitting: boolean; error: string | null }>;
  markResolved: (reportId: string) => Promise<void>;
  hideReportedContent: (report: ReportWithId) => Promise<void>;
}

// Cursor-paginated moderator report queue (Admin dashboard, Phase 2) —
// mirrors usePublicProfilePosts.ts's proven request-generation/cursor/
// error-separation pattern exactly, scoped to reports/{resolved==false}
// instead of a single author's posts. Requires firestore.rules'
// isModerator()-scoped read on reports/{reportId} (added alongside this
// hook) — a non-moderator calling this hook gets every getDocs() call
// rejected server-side regardless of what this code does.
export const useReportsQueue = (): UseReportsQueueResult => {
  const [reports, setReports] = useState<ReportWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, { submitting: boolean; error: string | null }>>({});
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const isFetchingRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadPage = useCallback(async (reset: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const localRequestId = requestIdRef.current;
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const constraints: QueryConstraint[] = [
        where('resolved', '==', false),
        orderBy('createdAt', 'asc'),
      ];
      const afterCursor = reset ? null : cursorRef.current;
      if (afterCursor) constraints.push(startAfter(afterCursor));
      constraints.push(limit(PAGE_SIZE));

      const snap = await getDocs(query(collection(firestoreDb, REPORTS_COLLECTION), ...constraints));
      if (localRequestId !== requestIdRef.current) return;

      const page: ReportWithId[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Report) }));
      cursorRef.current = snap.docs[snap.docs.length - 1] ?? cursorRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setReports(prev => (reset ? page : [...prev, ...page]));
    } catch (err) {
      if (localRequestId !== requestIdRef.current) return;
      if (reset) {
        setError('تعذّر تحميل البلاغات. حاول مرة أخرى.');
      } else {
        setLoadMoreError('تعذّر تحميل المزيد من البلاغات.');
      }
      console.error('[useReportsQueue]', err);
    } finally {
      if (localRequestId === requestIdRef.current) {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, []);

  const refresh = useCallback(() => {
    requestIdRef.current += 1;
    isFetchingRef.current = false;
    cursorRef.current = null;
    setReports([]);
    setHasMore(true);
    setError(null);
    setLoadMoreError(null);
    loadPage(true);
  }, [loadPage]);

  useEffect(() => {
    refresh();
    return () => {
      requestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) loadPage(false);
  }, [loading, hasMore, loadPage]);

  const setReportActionState = (reportId: string, submitting: boolean, actionError: string | null) => {
    setActionState(prev => ({ ...prev, [reportId]: { submitting, error: actionError } }));
  };

  // Marks a report resolved (the only Rules-permitted update — see
  // firestore.rules' reports/{reportId} update branch, hasOnly(['resolved'])).
  // Removes it from the local queue on success since this screen only ever
  // lists unresolved reports.
  const markResolved = useCallback(async (reportId: string) => {
    setReportActionState(reportId, true, null);
    try {
      await updateDoc(doc(firestoreDb, REPORTS_COLLECTION, reportId), { resolved: true });
      setReports(prev => prev.filter(r => r.id !== reportId));
      setActionState(prev => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });
    } catch (err) {
      console.error('[useReportsQueue:markResolved]', err);
      setReportActionState(reportId, false, 'تعذّر تحديث البلاغ. حاول مرة أخرى.');
    }
  }, []);

  // Hides the reported post or comment — the existing isModerator()
  // status-only 'hidden' branch on posts/{postId} and comments/{commentId}
  // (unchanged by this task). Does NOT mark the report resolved on its own —
  // a moderator reviews the hidden content, then explicitly marks resolved,
  // so the two actions stay independently auditable.
  const hideReportedContent = useCallback(async (report: ReportWithId) => {
    setReportActionState(report.id, true, null);
    try {
      const targetRef = report.targetType === 'post'
        ? doc(firestoreDb, postPath(report.postId))
        : doc(firestoreDb, commentPath(report.postId, report.targetId));
      await updateDoc(targetRef, { status: 'hidden' });
      setReportActionState(report.id, false, null);
    } catch (err) {
      console.error('[useReportsQueue:hideReportedContent]', err);
      setReportActionState(report.id, false, 'تعذّر إخفاء المحتوى. حاول مرة أخرى.');
    }
  }, []);

  return { reports, loading, hasMore, error, loadMoreError, loadMore, refresh, actionState, markResolved, hideReportedContent };
};
