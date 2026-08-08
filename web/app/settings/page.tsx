import type { Metadata } from 'next';
import Link from 'next/link';
import { getSession } from '@/lib/server/session';
import { AccountRail } from '@/components/AccountRail';
import { LocalDataControls } from '@/components/settings/LocalDataControls';

export const metadata: Metadata = {
  title: 'الإعدادات',
  description: 'إعدادات حسابك والبيانات المحفوظة في هذا المتصفّح.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Settings — the phone app's screen, on a screen that can hold more of it.
 *
 * WHAT WAS KEPT
 * -------------
 * The app's settings screen is a list of reset actions, each with a name, a
 * one-line description of what it deletes, and a confirmation step before it
 * runs. Every one of those is here, with the same wording and the same
 * confirm-before-destroy rule. Nothing was dropped and nothing was renamed.
 *
 * WHAT THE BIGGER SCREEN BUYS
 * ---------------------------
 * The app shows the description under the button, because a 390px column has
 * no other place to put it. Here the description sits BESIDE the action, so a
 * reader can compare six actions at a glance instead of scrolling a list and
 * remembering. That is the whole difference — the same content, laid out for a
 * screen that can show it at once.
 *
 * WHY THE RESETS ARE CLIENT-SIDE
 * ------------------------------
 * Because the data they clear is client-side. The phone app keeps lesson
 * progress, build progress and checklists in local storage, and so does this
 * browser. A server round-trip would imply the server holds this data; it does
 * not, and saying so plainly is part of the screen.
 */
export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="shell" style={{ paddingTop: 34, paddingBottom: 48 }}>
      <div className="with-rail">
        <div style={{ minWidth: 0 }} className="fade-in">
          <header>
            <h1 className="page-title">الإعدادات</h1>
            <p className="page-lede">
              نفس إعدادات التطبيق. ما تحذفه هنا يخصّ هذا المتصفّح وحده — تقدّمك في
              تطبيق الهاتف محفوظ على جهازك ولا يتأثّر بما تفعله هنا.
            </p>
          </header>

          <LocalDataControls />

          <section className="admin-section" style={{ marginTop: 34 }}>
            <h2 className="accent-head" style={{ fontSize: 18, fontWeight: 900, margin: '0 0 12px' }}>
              الحساب
            </h2>
            <div className="card" style={{ padding: '18px 20px' }}>
              {session ? (
                <>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
                    أنت مسجَّل الدخول باسم <strong style={{ color: 'var(--text)' }}>{session.displayName ?? 'مستخدم'}</strong>.
                    هذا الحساب نفسه الذي تستخدمه في تطبيق الهاتف — تغييره في أحدهما يظهر في الآخر.
                  </p>
                  <p style={{ margin: '14px 0 0' }}>
                    <Link href="/profile" className="btn-ghost">افتح ملفك الشخصي</Link>
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
                    أنت تتصفّح كزائر — وكل المحتوى مفتوح لك. الحسابات ستُفعَّل مع
                    افتتاح المتجر، وتقدّمك المحفوظ في هذا المتصفّح يبقى لك.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="admin-section" style={{ marginTop: 34 }}>
            <h2 className="accent-head" style={{ fontSize: 18, fontWeight: 900, margin: '0 0 12px' }}>
              الخصوصية
            </h2>
            <div className="card" style={{ padding: '18px 20px' }}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
                تقدّمك في الدروس ومراحل البناء وقوائم الفحص محفوظ في متصفّحك، لا على
                خادم. ما يُحفظ على الخادم هو ما تطلبه من المتجر باسمك، لا أكثر.
              </p>
            </div>
          </section>
        </div>

        <AccountRail
          signedIn={!!session}
          displayName={session?.displayName ?? null}
          photoURL={session?.photoURL ?? null}
          email={session?.email ?? null}
          role={session?.role ?? 'user'}
          signInNext="/settings"
        />
      </div>
    </div>
  );
}
