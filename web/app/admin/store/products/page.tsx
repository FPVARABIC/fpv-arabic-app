import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { STORE_CATEGORIES } from '@core/data/store/categories';
import { AVAILABILITY_LABEL_AR } from '@core/data/store/types';
import { formatPrice } from '@core/data/store/pricing';
import { STAGE_LABEL_AR, hardBlockers, advisories } from '@core/data/store/publication';
import {
  AUDIT_DECISION_LABEL_AR, AUDIT_KIND_LABEL_AR, auditSummary,
} from '@core/data/store/audit';
import type { AuditDecision } from '@core/data/store/audit';
import { AdminShell } from '@/components/admin/AdminShell';
import { PublishToggle } from '@/components/admin/PublishToggle';
import {
  catalogueQueue, applyQueueFilter, queueCounts, isQueueFilter,
  QUEUE_FILTER_LABEL_AR, OWNER_WORK_LABEL_AR, PLATFORM_WORK_LABEL_AR,
  type QueueFilter, type OwnerWork, type PlatformWork,
} from '@/lib/server/storeQueue';

export const metadata: Metadata = {
  title: 'المنتجات — الإدارة',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * The catalogue as a work queue.
 *
 * WHY IT IS FILTERED BY WHAT EACH PRODUCT IS WAITING FOR
 * -------------------------------------------------------
 * Sixty-nine products, none publishable, listed by section, is a wall — it
 * tells you the shop is not ready and nothing about what to do next. The same
 * products grouped by their blocker is a list of errands: eleven need a
 * licensed photograph and nothing else, two need somebody to decide what
 * product actually goes in the slot.
 *
 * Every stage here is computed by the same function the publish button calls,
 * so the queue cannot claim something is ready that the server would refuse.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * A price field and a delete button. Prices are computed on the supply screen
 * from cost and margin so none can exist that nobody can explain; deleting
 * would orphan the orders that reference a product, so hiding is the operation
 * and it is reversible.
 */
export default async function AdminProducts(
  { searchParams }: { searchParams: Promise<{ q?: string }> },
) {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.viewProducts')) redirect('/');

  const { q = 'all' } = await searchParams;
  const filter: QueueFilter = isQueueFilter(q) ? q : 'all';

  const rows = await catalogueQueue();
  const counts = queueCounts(rows);
  const shown = applyQueueFilter(rows, filter);
  const canEdit = sessionCan(session, 'store.editProducts');
  const audit = auditSummary();

  return (
    <AdminShell role={session.role} actorName={session.displayName}
      current="/admin/store/products" titleAr="المنتجات">
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 6px', lineHeight: 1.95 }}>
        <span dir="ltr">{rows.length}</span> منتجاً في{' '}
        <span dir="ltr">{STORE_CATEGORIES.length}</span> قسماً.{' '}
        <span dir="ltr">{counts.published}</span> منشور،{' '}
        <span dir="ltr">{counts.ready}</span> جاهز للنشر.
      </p>
      <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '0 0 16px', lineHeight: 1.95 }}>
        لا يُنشر منتج قبل أن يكون له اسم حقيقي وخيار شراء واحد على الأقل ووصف عربي
        وثلاث مواصفات موثّقة بمصادرها وصورة مرخّصة وسجلّ توريد حديث. الحالة أدناه
        محسوبة من البيانات نفسها، لا مكتوبة يدوياً.
      </p>

      {/* The filters. Each one is a question somebody actually asks, and the
          count beside it is the size of that job. */}
      <nav aria-label="تصفية المنتجات" data-testid="queue-filters"
        style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
        {(Object.keys(QUEUE_FILTER_LABEL_AR) as QueueFilter[]).map(f => (
          <Link key={f} href={`/admin/store/products?q=${f}`}
            data-testid={`queue-filter-${f}`}
            className={f === filter ? 'btn-primary' : 'btn-ghost'}
            style={{ fontSize: 12 }}>
            {QUEUE_FILTER_LABEL_AR[f]} <span dir="ltr">({counts[f]})</span>
          </Link>
        ))}
      </nav>

      {/*
        THE TWO COLUMNS.
        One is the owner's work — photographs, costs, the publish decision —
        and one is the platform's. Mixing them buries their work in ours, and
        neither list is then finishable. Deliberately NOT one percentage: «80%
        complete» reads as nearly done and hides whether the missing fifth is a
        caption or the price.
      */}
      <section className="admin-section" aria-labelledby="split-h">
        <h2 id="split-h">أين يقف العمل</h2>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div data-testid="owner-work">
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 900, color: '#fcd34d' }}>ينتظر مني</p>
            <ul style={{ margin: '9px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
              {(Object.keys(OWNER_WORK_LABEL_AR) as (keyof OwnerWork)[]).map(k => {
                const n = rows.filter(r => r.owner[k]).length;
                return (
                  <li key={k} data-testid={`owner-${k}`}
                    style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 8 }}>
                    <span style={{ minWidth: 34 }} dir="ltr">{n}</span>
                    <span>{OWNER_WORK_LABEL_AR[k]}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div data-testid="platform-work">
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 900, color: 'var(--accent)' }}>
              أنجزه النظام
            </p>
            <ul style={{ margin: '9px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
              {(Object.keys(PLATFORM_WORK_LABEL_AR) as (keyof PlatformWork)[]).map(k => {
                const done = rows.filter(r => r.platform[k]).length;
                return (
                  <li key={k} data-testid={`platform-${k}`}
                    style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 8 }}>
                    <span style={{ minWidth: 52 }} dir="ltr">{done}/{rows.length}</span>
                    <span>{PLATFORM_WORK_LABEL_AR[k]}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* The audit, summarised. The number that matters is the last one. */}
      <section className="admin-section" aria-labelledby="audit-h">
        <h2 id="audit-h">تدقيق الكتالوج</h2>
        <dl className="admin-kv" data-testid="audit-summary">
          {(Object.entries(audit.byDecision) as [AuditDecision, number][]).map(([k, n]) => (
            <div key={k}>
              <dt>{AUDIT_DECISION_LABEL_AR[k]}</dt>
              <dd className="ltr">{n}</dd>
            </div>
          ))}
          <div>
            <dt>في مجموعة الإطلاق</dt>
            <dd className="ltr">{audit.launchSet}</dd>
          </div>
          <div>
            <dt style={{ color: '#fcd34d' }}>بانتظار تأكيد حقوق الصور</dt>
            <dd className="ltr" style={{ color: '#fcd34d' }}>{audit.imagesPending}</dd>
          </div>
        </dl>
      </section>

      {!canEdit && (
        <p className="card-sm" style={{ padding: '12px 14px', margin: '0 0 16px', fontSize: 12.5, color: 'var(--text-dimmer)' }}>
          لديك صلاحية العرض فقط.
        </p>
      )}

      {shown.length === 0 ? (
        <p className="card-sm" data-testid="queue-empty" style={{ padding: '14px 16px', fontSize: 13 }}>
          لا منتج في هذه القائمة.
        </p>
      ) : (
        <ul data-testid="queue-rows" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 9 }}>
          {shown.map(row => {
            const p = row.product;
            return (
              <li key={p.id} className="card-sm" data-testid={`admin-product-${p.id}`}
                style={{ padding: '12px 14px', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <span className="ltr" style={{ fontSize: 13.5, fontWeight: 900 }}>{p.nameEn}</span>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>{p.titleAr}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap' }}>
                    {p.variants[0]?.priceMinor == null
                      ? <span style={{ color: '#fcd34d', fontSize: 11.5, fontWeight: 500 }}>بلا سعر</span>
                      : <span className="ltr">{formatPrice(p.variants[0].priceMinor, p.currency)}</span>}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="admin-badge" data-testid={`stage-${p.id}`}
                    style={{
                      color: row.stage === 'published' ? '#6ee7b7'
                        : row.stage === 'ready' ? 'var(--accent)' : '#fcd34d',
                    }}>
                    {STAGE_LABEL_AR[row.stage]}
                  </span>
                  <span className="admin-badge">{AVAILABILITY_LABEL_AR[p.availability]}</span>
                  <span className="admin-badge">
                    <span dir="ltr">{p.variants.length}</span> خيار
                  </span>
                  <span className="admin-badge">
                    صور: <span dir="ltr">{row.licensedImages}</span>
                  </span>
                  <span className="admin-badge">
                    مواصفات موثّقة: <span dir="ltr">{row.sourcedSpecs}</span>
                  </span>
                  {row.audit && row.audit.decision !== 'approve' && (
                    <span className="admin-badge" style={{ color: '#fcd34d' }}
                      data-testid={`audit-${p.id}`}>
                      {AUDIT_DECISION_LABEL_AR[row.audit.decision]} — {AUDIT_KIND_LABEL_AR[row.audit.kind]}
                    </span>
                  )}
                  {/* What THIS product needs from its owner, named. A row that
                      says «incomplete» is a row somebody has to open to find
                      out why. */}
                  {(Object.keys(OWNER_WORK_LABEL_AR) as (keyof OwnerWork)[])
                    .filter(k => row.owner[k])
                    .map(k => (
                      <span key={k} className="admin-badge" data-testid={`row-owner-${k}-${p.id}`}
                        style={{ color: '#fcd34d' }}>
                        {OWNER_WORK_LABEL_AR[k]}
                      </span>
                    ))}
                  <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {/* The button only appears when the gate would allow it.
                        A control that is always there and always refuses
                        teaches whoever uses it to stop reading the refusal. */}
                    {/* Offered when nothing BLOCKING remains. Outstanding
                        advisories are shown below and acknowledged on the
                        product's own screen, not waved through from a list. */}
                    {canEdit && hardBlockers(row.blockers).length === 0 && (
                      <PublishToggle productId={p.id} published={p.published} />
                    )}
                    <Link href={`/admin/store/products/${encodeURIComponent(p.id)}`}
                      className="btn-ghost" data-testid={`admin-product-edit-${p.id}`}
                      style={{ fontSize: 12 }}>
                      {canEdit ? 'عدّل' : 'اعرض'}
                    </Link>
                  </span>
                </div>

                {/* What is actually stopping it, in words. «Incomplete» is a
                    wall; «no licensed image» is an errand. */}
                {row.blockers.length > 0 && (
                  <ul data-testid={`blockers-${p.id}`}
                    style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 4 }}>
                    {/* Blocking first, then advisory. The colour says which is
                        which without anybody reading a legend. */}
                    {[...hardBlockers(row.blockers), ...advisories(row.blockers)].map((b, i) => (
                      <li key={i} style={{
                        fontSize: 11.5, lineHeight: 1.85,
                        color: b.severity === 'blocking' ? '#fca5a5' : 'var(--text-dimmer)',
                      }}>
                        {b.messageAr}
                        {b.fixHref && (
                          <> <Link href={b.fixHref} style={{ fontSize: 11 }}>افتح ←</Link></>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {/* The audit's own note, where it says something a data-entry
                    round will not fix. */}
                {row.audit && row.audit.decision !== 'approve' && (
                  <p style={{ margin: 0, fontSize: 11.5, color: '#fcd34d', lineHeight: 1.9 }}>
                    {row.audit.noteAr}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
