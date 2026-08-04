import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { getReportDetail, REPORT_REASON_AR } from '@/lib/server/adminRead';
import { REPORT_STATUS_AR, canTransition } from '@/lib/server/admin';
import { listAudit } from '@/lib/server/audit';
import { AdminShell } from '@/components/admin/AdminShell';
import { AuditTable } from '@/components/admin/AuditTable';
import { AdminAction } from '@/components/admin/AdminAction';
import { PostMedia } from '@/components/community/PostMedia';
import { toParagraphs } from '@/lib/text';
import { can } from '@core/data/auth/roles';

export const metadata: Metadata = { title: 'بلاغ — الإدارة', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * One report, with the content it is about.
 *
 * THE REPORTED CONTENT IS SHOWN, INCLUDING ITS MEDIA
 * --------------------------------------------------
 * A moderator cannot judge a report without seeing what was reported, and that
 * includes the image or clip. It is read with the Admin SDK precisely because
 * the public read rule refuses hidden and deleted posts — the ones most likely
 * to be under review. The media renders through the SAME `PostMedia` component
 * the public feed uses, so a video still does not autoplay and still costs a
 * poster frame rather than a download.
 *
 * The text is rendered as TEXT NODES through the same paragraph pipeline as the
 * public site. Reported content is the most hostile input this product handles
 * — it is, by definition, something someone objected to — and an admin screen
 * that interpreted markup would be the worst possible place to do it.
 */
export default async function AdminReportDetail(
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await getSession();
  if (!session || !sessionCan(session, 'community.viewReports')) redirect('/');

  const { reportId } = await params;
  const report = await getReportDetail(reportId);
  if (!report) notFound();

  const mayDecide = can(session.role, 'community.resolveReports');
  const mayHide = can(session.role, 'community.hidePost');
  const mayDelete = can(session.role, 'community.deletePost');
  const terminal = report.status === 'resolved' || report.status === 'rejected';
  const history = can(session.role, 'audit.view') ? await listAudit({ targetId: reportId, limit: 20 }) : [];

  return (
    <div className="shell">
      <AdminShell role={session.role} actorName={session.displayName} current="/admin/reports" titleAr="بلاغ">
        <p style={{ margin: '0 0 18px' }}>
          <Link href="/admin/reports" className="btn-ghost">← كل البلاغات</Link>
        </p>

        <dl className="admin-kv card-sm" data-testid="admin-report-detail" style={{ padding: '16px 18px' }}>
          <div><dt>الحالة</dt><dd><span className="admin-badge" data-testid="admin-report-status">{REPORT_STATUS_AR[report.status]}</span></dd></div>
          <div><dt>النوع</dt><dd>{report.targetType === 'comment' ? 'تعليق' : 'منشور'}</dd></div>
          <div><dt>السبب</dt><dd>{REPORT_REASON_AR[report.reason] ?? report.reason}</dd></div>
          <div><dt>توضيح المُبلِّغ</dt><dd style={{ overflowWrap: 'anywhere' }}>{report.note ?? '—'}</dd></div>
          <div><dt>المُبلِّغ</dt><dd>{report.reporterName ?? '—'} <span className="ltr" style={{ fontSize: 11, color: 'var(--text-dimmer)' }}>{report.reporterId}</span></dd></div>
          <div><dt>وصل في</dt><dd dir="ltr">{report.createdAt?.slice(0, 16).replace('T', ' ') ?? '—'}</dd></div>
          {report.reviewedBy && (
            <>
              <div><dt>راجعه</dt><dd className="ltr">{report.reviewedBy}</dd></div>
              <div><dt>وقت المراجعة</dt><dd dir="ltr">{report.reviewedAt?.slice(0, 16).replace('T', ' ') ?? '—'}</dd></div>
              <div><dt>ملاحظة المراجعة</dt><dd style={{ overflowWrap: 'anywhere' }}>{report.reviewNoteAr ?? '—'}</dd></div>
            </>
          )}
        </dl>

        {/* ── The reported content ─────────────────────────────────────── */}
        <section className="admin-section" aria-labelledby="content-h">
          <h2 id="content-h">المحتوى المُبلَّغ عنه</h2>
          {!report.content?.exists ? (
            <div className="card-sm admin-empty" data-testid="admin-report-content-missing">
              المحتوى لم يعد موجوداً.
            </div>
          ) : (
            <article className="card-sm" data-testid="admin-report-content" style={{ padding: '16px 18px' }}>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-dimmer)' }}>
                بقلم {report.content.authorName ?? '—'}{' '}
                <span className="ltr">{report.content.authorId}</span>{' · '}
                <span className="admin-badge">{report.content.status}</span>
              </p>
              <div data-testid="admin-report-content-text">
                {toParagraphs(report.content.text).map((block, bi) => (
                  <p key={bi} style={{ margin: bi === 0 ? 0 : '10px 0 0', fontSize: 14, lineHeight: 1.95, overflowWrap: 'anywhere' }}>
                    {block.map((line, li) => (
                      <span key={li}>{line}{li < block.length - 1 && <br />}</span>
                    ))}
                  </p>
                ))}
              </div>
              <PostMedia
                mediaType={report.content.mediaType}
                mediaURL={report.content.mediaURL}
                thumbnailURL={report.content.thumbnailURL}
                mediaWidth={report.content.mediaWidth}
                mediaHeight={report.content.mediaHeight}
                mediaDuration={report.content.mediaDuration}
                authorName={report.content.authorName ?? ''}
                variant="detail"
              />
              <p style={{ marginTop: 14 }}>
                <Link href={`/community/posts/${report.postId}`} className="btn-ghost" data-testid="admin-report-open-context">
                  افتحه في سياقه ←
                </Link>
              </p>
            </article>
          )}
        </section>

        {/* ── Content actions ──────────────────────────────────────────── */}
        {report.content?.exists && report.targetType === 'post' && (mayHide || mayDelete) && (
          <section className="admin-section" aria-labelledby="content-actions-h">
            <h2 id="content-actions-h">إجراءات على المحتوى</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              {mayHide && report.content.status === 'active' && (
                <AdminAction
                  endpoint="/api/admin/posts/moderate"
                  payload={{ postId: report.targetId, action: 'hide', reportId: report.id }}
                  labelAr="أخفِ المنشور"
                  confirmAr="سيختفي المنشور عن الجمهور. ملفاته تُحذف تلقائياً بعد الإخفاء، فإعادة الإظهار قد تعيد النص دون الوسيط."
                  severity="danger"
                  testId="admin-hide-post"
                />
              )}
              {mayHide && report.content.status === 'hidden' && (
                <AdminAction
                  endpoint="/api/admin/posts/moderate"
                  payload={{ postId: report.targetId, action: 'unhide', reportId: report.id }}
                  labelAr="أعد إظهار المنشور"
                  confirmAr="سيعود المنشور للظهور. إن كانت ملفاته حُذفت عند الإخفاء فلن تعود."
                  testId="admin-unhide-post"
                />
              )}
              {mayDelete && report.content.status !== 'deleted' && (
                <AdminAction
                  endpoint="/api/admin/posts/moderate"
                  payload={{ postId: report.targetId, action: 'delete', reportId: report.id }}
                  labelAr="احذف المنشور إدارياً"
                  confirmAr="حذف ناعم: يبقى السجل والتعليقات، ويختفي المنشور عن الجميع نهائياً من الواجهة."
                  severity="danger"
                  testId="admin-delete-post"
                />
              )}
              {mayDelete && report.content.mediaType !== 'none' && (
                <AdminAction
                  endpoint="/api/admin/media/delete"
                  payload={{ postId: report.targetId, reportId: report.id }}
                  labelAr="احذف الوسائط فقط"
                  confirmAr="ستُحذف ملفات هذا المنشور من التخزين نهائياً ويبقى نصّه. يُحدَّد الملف من مسار المنشور نفسه، لا من رابط."
                  severity="danger"
                  testId="admin-delete-media"
                />
              )}
            </div>
          </section>
        )}

        {report.content?.exists && report.targetType === 'comment' && can(session.role, 'community.hideComment') && (
          <section className="admin-section" aria-labelledby="comment-actions-h">
            <h2 id="comment-actions-h">إجراءات على التعليق</h2>
            <AdminAction
              endpoint="/api/admin/comments/moderate"
              payload={{ postId: report.postId, commentId: report.targetId, reportId: report.id }}
              labelAr="أخفِ التعليق"
              confirmAr="سيختفي التعليق عن الجمهور ويبقى محفوظاً في قاعدة البيانات."
              severity="danger"
              testId="admin-hide-comment"
            />
          </section>
        )}

        {/* ── The decision ─────────────────────────────────────────────── */}
        <section className="admin-section" aria-labelledby="decision-h">
          <h2 id="decision-h">قرار البلاغ</h2>
          {!mayDecide ? (
            <p className="admin-badge" data-testid="admin-decide-forbidden">صلاحيتك للقراءة فقط.</p>
          ) : terminal ? (
            <p className="admin-badge admin-badge-ok" data-testid="admin-decide-closed">
              أُغلق هذا البلاغ. القرار المتخذ جزء من السجل ولا يُعدَّل — أي مراجعة جديدة تبدأ ببلاغ جديد.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {canTransition(report.status, 'in_review') && (
                <AdminAction
                  endpoint="/api/admin/reports/decide"
                  payload={{ reportId: report.id, to: 'in_review' }}
                  labelAr="ابدأ المراجعة"
                  confirmAr="سيُعلَّم البلاغ بأنه قيد المراجعة."
                  testId="admin-report-review"
                />
              )}
              <AdminAction
                endpoint="/api/admin/reports/decide"
                payload={{ reportId: report.id, to: 'resolved' }}
                labelAr="اقبل البلاغ وأغلقه"
                confirmAr="سيُغلق البلاغ نهائياً بوصفه مقبولاً. لا يمكن إعادة فتحه."
                severity="danger"
                testId="admin-report-resolve"
              />
              <AdminAction
                endpoint="/api/admin/reports/decide"
                payload={{ reportId: report.id, to: 'rejected' }}
                labelAr="ارفض البلاغ وأغلقه"
                confirmAr="سيُغلق البلاغ نهائياً بوصفه مرفوضاً. لا يمكن إعادة فتحه."
                severity="danger"
                testId="admin-report-reject"
              />
            </div>
          )}
        </section>

        {can(session.role, 'audit.view') && history.length > 0 && (
          <section className="admin-section" aria-labelledby="report-history-h">
            <h2 id="report-history-h">سجل هذا البلاغ</h2>
            <AuditTable rows={history} />
          </section>
        )}
      </AdminShell>
    </div>
  );
}
