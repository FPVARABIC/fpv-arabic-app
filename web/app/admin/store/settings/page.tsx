import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { AdminShell } from '@/components/admin/AdminShell';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { privateStoreSettings, publicStoreSettings } from '@/lib/server/storeSettings';

export const metadata: Metadata = {
  title: 'إعدادات المتجر — الإدارة',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * The shop's own settings.
 *
 * Behind `store.viewSupply` because the margin is on it, and the margin is the
 * commercially sensitive half of the store — price ÷ margin is cost, which is
 * the whole reason it lives in a private document rather than beside the banner
 * a customer reads.
 */
export default async function AdminStoreSettings() {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.viewSupply')) redirect('/');

  const [priv, pub] = await Promise.all([privateStoreSettings(), publicStoreSettings()]);
  const canEdit = sessionCan(session, 'store.editProducts');

  return (
    <AdminShell role={session.role} actorName={session.displayName}
      current="/admin/store/settings" titleAr="إعدادات المتجر">
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 18px', lineHeight: 1.95 }}>
        كل ما في هذه الصفحة يُقرأ من قاعدة البيانات لا من الشيفرة — تغييره لا
        يحتاج نشر إصدار جديد. هامش الربح ومدة مراجعة التكلفة لا يراهما العميل.
      </p>
      {canEdit
        ? <SettingsForm privateSettings={priv} publicSettings={pub} />
        : (
          <p className="card-sm" data-testid="settings-readonly"
            style={{ padding: '13px 15px', fontSize: 12.5, color: 'var(--text-dimmer)' }}>
            لديك صلاحية العرض فقط.
          </p>
        )}
    </AdminShell>
  );
}
