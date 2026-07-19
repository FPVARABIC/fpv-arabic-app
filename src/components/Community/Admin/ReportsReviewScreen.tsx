import React from 'react';
import { useReportsQueue } from '../hooks/useReportsQueue';
import { timeAgo } from '../utils/timeAgo';
import type { ReportReason, ReportTargetType } from '../types';

interface ReportsReviewScreenProps {
  // Every report — post or comment — is opened via the same existing
  // PostDetail navigation. There is no standalone comment screen; a comment
  // report opens its parent post (report.postId), same as a post report.
  onOpenPost: (postId: string) => void;
}

const REASON_LABELS: Record<ReportReason, string> = {
  spam: 'spam',
  abuse: 'مسيء',
  dangerous: 'معلومات خطيرة',
  other: 'آخر',
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  post: 'منشور',
  comment: 'تعليق',
};

// Reports review (Admin dashboard, Phase 2) — reads reports/{resolved==false}
// via useReportsQueue.ts (requires the moderator-scoped read Rules added
// alongside this screen). Every report shown here is a live, real document —
// hiding content and marking resolved are two independent actions, kept
// separate so the report itself stays reviewable evidence even after the
// underlying content is hidden.
export const ReportsReviewScreen: React.FC<ReportsReviewScreenProps> = ({ onOpenPost }) => {
  const {
    reports, loading, hasMore, error, loadMoreError, loadMore, refresh,
    actionState, markResolved, hideReportedContent,
  } = useReportsQueue();

  return (
    <div style={{ padding: 16 }}>
      {loading && reports.length === 0 && (
        <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 24 }}>جارٍ تحميل البلاغات...</p>
      )}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 8px' }}>{error}</p>
          <button
            onClick={refresh}
            style={{ background: 'none', border: '0.5px solid #e5eaf0', borderRadius: 999, padding: '4px 14px', fontSize: 12, color: '#0e7c86', cursor: 'pointer' }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {!loading && !error && reports.length === 0 && (
        <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 32 }}>لا توجد بلاغات بانتظار المراجعة.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reports.map(report => {
          const state = actionState[report.id];
          const submitting = state?.submitting ?? false;
          return (
            <div key={report.id} style={{ background: '#ffffff', border: '0.5px solid #e5eaf0', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                  background: '#fef2f2', color: '#b91c1c',
                }}>
                  {REASON_LABELS[report.reason]}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                  background: '#eef2f6', color: '#5a6b7c',
                }}>
                  {TARGET_LABELS[report.targetType]}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b3', marginRight: 'auto' }} dir="ltr">{timeAgo(report.createdAt)}</span>
              </div>

              {report.note && (
                <p style={{ fontSize: 13, color: '#1a2b3c', margin: '0 0 10px', lineHeight: 1.6 }}>{report.note}</p>
              )}

              {state?.error && (
                <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 8px' }}>{state.error}</p>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => onOpenPost(report.postId)}
                  style={{ padding: '7px 14px', borderRadius: 10, border: '0.5px solid #e5eaf0', background: '#ffffff', color: '#0e7c86', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  فتح {TARGET_LABELS[report.targetType] === 'تعليق' ? 'المنشور الأصلي' : 'المنشور'}
                </button>
                <button
                  onClick={() => hideReportedContent(report)}
                  disabled={submitting}
                  style={{
                    padding: '7px 14px', borderRadius: 10, border: '0.5px solid #fecaca', background: '#fff',
                    color: submitting ? '#94a3b3' : '#dc2626', fontSize: 12, fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  إخفاء {TARGET_LABELS[report.targetType]}
                </button>
                <button
                  onClick={() => markResolved(report.id)}
                  disabled={submitting}
                  style={{
                    padding: '7px 14px', borderRadius: 10, border: 'none', background: submitting ? '#e5eaf0' : '#0e7c86',
                    color: submitting ? '#94a3b3' : '#ffffff', fontSize: 12, fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer', marginRight: 'auto',
                  }}
                >
                  تمّت المعالجة
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {loadMoreError && (
        <p style={{ textAlign: 'center', color: '#dc2626', fontSize: 12, padding: '10px 0 0' }}>{loadMoreError}</p>
      )}
      {hasMore && reports.length > 0 && (
        <div style={{ textAlign: 'center', padding: '14px 0 0' }}>
          <button
            onClick={loadMore}
            disabled={loading}
            style={{
              background: 'none', border: '0.5px solid #e5eaf0', borderRadius: 999,
              padding: '6px 18px', fontSize: 12, fontWeight: 700,
              color: loading ? '#94a3b3' : '#0e7c86', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'جارٍ التحميل...' : 'عرض المزيد'}
          </button>
        </div>
      )}
    </div>
  );
};
