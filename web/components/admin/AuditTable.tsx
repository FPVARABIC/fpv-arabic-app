import type { AuditRecord } from '@/lib/server/audit';

/**
 * The audit trail, rendered.
 *
 * WHY THE ACTION NAMES ARE TRANSLATED HERE AND NOT STORED IN ARABIC
 * -----------------------------------------------------------------
 * The stored `action` is a stable machine identifier (`user.role.assign`).
 * Storing the Arabic phrasing instead would freeze today's wording into
 * permanent records, and the day someone improves the wording the log would
 * contain two vocabularies for the same event. The label is presentation; the
 * identifier is the record.
 *
 * A row whose action this table does not recognise still renders — it shows the
 * raw identifier rather than blanking. An audit log that hides entries it does
 * not understand is worse than one that shows them awkwardly.
 */

const ACTION_AR: Record<string, string> = {
  'user.role.assign': 'تغيير دور',
  'user.ban': 'إيقاف حساب',
  'user.unban': 'رفع الإيقاف',
  'post.hide': 'إخفاء منشور',
  'post.unhide': 'إعادة إظهار منشور',
  'post.delete': 'حذف إداري لمنشور',
  'comment.hide': 'إخفاء تعليق',
  'comment.unhide': 'إعادة إظهار تعليق',
  'report.resolve': 'قبول بلاغ',
  'report.reject': 'رفض بلاغ',
  'report.review': 'بدء مراجعة بلاغ',
  'media.delete': 'حذف وسائط',
  'owner.grant': 'منح دور المالك',
};

const RESULT_AR: Record<string, { labelAr: string; cls: string }> = {
  ok: { labelAr: 'نُفِّذ', cls: 'admin-badge admin-badge-ok' },
  denied: { labelAr: 'مرفوض', cls: 'admin-badge admin-badge-warn' },
  error: { labelAr: 'فشل', cls: 'admin-badge admin-badge-bad' },
};

function formatAt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'short', timeStyle: 'short',
  }).format(d);
}

export const AuditTable: React.FC<{ rows: AuditRecord[] }> = ({ rows }) => (
  <div className="admin-table-wrap">
    <table className="admin-table" data-testid="audit-table">
      <caption className="sr-only">
        سجل الإجراءات الإدارية: المنفِّذ ودوره، ونوع الإجراء، والهدف، والنتيجة، والوقت.
      </caption>
      <thead>
        <tr>
          <th scope="col">الإجراء</th>
          <th scope="col">المنفِّذ</th>
          <th scope="col">الهدف</th>
          <th scope="col">قبل / بعد</th>
          <th scope="col">السبب</th>
          <th scope="col">النتيجة</th>
          <th scope="col">الوقت</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const result = RESULT_AR[r.result] ?? RESULT_AR.ok;
          return (
            <tr key={r.id} data-testid={`audit-row-${r.id}`}>
              <td>
                <span style={{ fontWeight: 800 }}>{ACTION_AR[r.action] ?? r.action}</span>
                {/* The raw identifier, for anyone matching entries against code. */}
                <span className="ltr" style={{ display: 'block', fontSize: 11, color: 'var(--text-dimmer)' }}>
                  {r.action}
                </span>
              </td>
              <td>
                <span style={{ display: 'block' }}>{r.actorEmail ?? '—'}</span>
                <span className="admin-badge admin-badge-role">{r.actorRole}</span>
                <span className="ltr" style={{ display: 'block', fontSize: 11, color: 'var(--text-dimmer)' }}>
                  {r.actorUid}
                </span>
              </td>
              <td>
                <span style={{ display: 'block', fontSize: 12 }}>{r.targetType}</span>
                <span className="ltr" style={{ fontSize: 11, color: 'var(--text-dimmer)' }}>{r.targetId}</span>
              </td>
              <td className="ltr" style={{ fontSize: 12 }}>
                {r.before ?? '—'} → {r.after ?? '—'}
              </td>
              <td style={{ maxWidth: 260, overflowWrap: 'anywhere' }}>{r.reasonAr ?? '—'}</td>
              <td>
                <span className={result.cls}>{result.labelAr}</span>
                {r.error && (
                  <span className="ltr" style={{ display: 'block', fontSize: 11, color: 'var(--text-dimmer)' }}>
                    {r.error}
                  </span>
                )}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {formatAt(r.at)}
                {/* The correlation id, so several rows from one request can be
                    tied together by eye without a query. */}
                <span className="ltr" style={{ display: 'block', fontSize: 10.5, color: 'var(--text-dimmer)' }}>
                  {r.requestId.slice(0, 8)}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
