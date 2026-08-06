import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/auth/SignInForm';
import { getSession } from '@/lib/server/session';
import { safeNextPath } from '@/lib/safeNext';

export const metadata: Metadata = {
  title: 'تسجيل الدخول',
  robots: { index: false, follow: false },
};

// The page branches on whether there is already a session, so it must never be
// cached — a cached "signed out" view served to a signed-in user is confusing,
// and the reverse would be a leak.
export const dynamic = 'force-dynamic';

/**
 * Sign-in.
 *
 * One identity for the whole platform: the same `profiles` row carries the
 * display name, the role and the moderation state that every pillar reads.
 * (The phone app still signs into Firebase until its own migration phase;
 * the account import in the data phase is what joins the two histories.)
 *
 * Already signed in? Bounce them onward rather than showing a login form to
 * someone who is logged in — but only to a validated path (see safeNextPath):
 * `?next=` is attacker-controllable, and an unchecked redirect turns this page
 * into a phishing relay.
 */
export default async function SignInPage(
  { searchParams }: { searchParams: Promise<{ next?: string }> },
) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next, '/');

  const session = await getSession();
  if (session) redirect(nextPath);

  return (
    <div className="shell" style={{ paddingTop: 56, paddingBottom: 60, maxWidth: 470 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>تسجيل الدخول</h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '12px 0 22px', lineHeight: 1.95 }}>
        حساب واحد للمنصة كلها: المنشورات والتعليقات والطلبات والحالة كلها على الحساب نفسه.
        لا يوجد حساب منفصل لكل قسم.
      </p>

      <SignInForm nextPath={nextPath} />

      <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '20px 0 0', lineHeight: 1.9 }}>
        يتحقّق الخادم من جلستك في كل طلب، ولا يقرأ صلاحياتك إلا من سجلّ حسابك — لا من
        المتصفّح. تسجيل الخروج يُنهي جلساتك على الأجهزة الأخرى أيضاً.
      </p>

      <p style={{ marginTop: 22 }}>
        <Link href="/" className="btn-ghost">← العودة إلى الرئيسية</Link>
      </p>
    </div>
  );
}
