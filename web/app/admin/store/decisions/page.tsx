import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { OWNER_DECISIONS } from '@core/data/store/decisions';
import { AdminShell } from '@/components/admin/AdminShell';
import { DecisionCard } from '@/components/admin/DecisionCard';
import { recordedDecisions } from '@/lib/server/storeDecisions';

export const metadata: Metadata = {
  title: 'قرارات تنتظرك — الإدارة',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * The questions the system declined to answer.
 *
 * Its own page rather than badges scattered through the product queue, because
 * these are not work items — they are decisions, they need reading, and mixing
 * them into a list of ninety rows guarantees nobody reads them.
 */
export default async function AdminDecisions() {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.viewProducts')) redirect('/');

  const recorded = await recordedDecisions();
  const open = OWNER_DECISIONS.filter(d => !recorded[d.id]);
  const settled = OWNER_DECISIONS.filter(d => recorded[d.id]);

  return (
    <AdminShell role={session.role} actorName={session.displayName}
      current="/admin/store/decisions" titleAr="قرارات تنتظرك">
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 18px', lineHeight: 1.95 }}>
        <span dir="ltr">{open.length}</span> قراراً مفتوحاً من{' '}
        <span dir="ltr">{OWNER_DECISIONS.length}</span>. كل واحد منها مشكلة يراها
        النظام ولا يملك صلاحية حسمها — لأن حسمها يحتاج قراراً تجارياً أو قانونياً.
        الخيارات وأثر كل خيار مكتوبة، والتوصية موجودة فقط حيث ترجّحها الأدلّة.
      </p>

      {open.length === 0 && (
        <p className="card-sm" data-testid="decisions-none"
          style={{ padding: '14px 16px', fontSize: 13, color: '#6ee7b7' }}>
          لا قرار مفتوح. كل ما كان ينتظرك حُسم.
        </p>
      )}

      {open.map(d => <DecisionCard key={d.id} decision={d} />)}

      {settled.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: '28px 0 12px' }}>قرارات حُسمت</h2>
          {settled.map(d => (
            <DecisionCard key={d.id} decision={d} recorded={recorded[d.id]} />
          ))}
        </>
      )}
    </AdminShell>
  );
}
