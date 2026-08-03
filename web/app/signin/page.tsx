import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'تسجيل الدخول',
  robots: { index: false, follow: false },
};

/**
 * Sign-in.
 *
 * The account is the SAME account as the phone app's — the same Firebase
 * project, the same users/{uid} document, the same posts and the same
 * moderation state. There is no web-only identity, which is why signing in here
 * shows a user their existing community history rather than an empty profile.
 *
 * The interactive form is a client component (Firebase Auth runs in the
 * browser); the surrounding page is server-rendered. On success the client
 * exchanges its ID token for an httpOnly session cookie at /api/auth/session, so
 * that the server — and only the server — can verify who is asking on every
 * subsequent request.
 */
export default function SignInPage() {
  return (
    <div className="shell" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 460 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>تسجيل الدخول</h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '12px 0 0', lineHeight: 1.95 }}>
        حسابك هنا هو حسابك نفسه في تطبيق الهاتف: المنشورات والتعليقات والمستوى والحالة
        كلها واحدة. لا يوجد حساب منفصل للموقع.
      </p>

      <div className="card" style={{ padding: '20px 22px', marginTop: 24 }}>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
          واجهة تسجيل الدخول التفاعلية قيد الإكمال في هذه المرحلة. البنية الخادمية جاهزة:
          التحقق يتم من ملفّ تعريف ارتباط موقّع من Firebase، والدور يُقرأ من مصدر لا يستطيع
          المتصفح الكتابة فيه.
        </p>
      </div>

      <p style={{ marginTop: 22 }}>
        <Link href="/" className="btn-ghost">← العودة إلى الرئيسية</Link>
      </p>
    </div>
  );
}
