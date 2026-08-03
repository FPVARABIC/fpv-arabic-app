import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server/session';
import { NewPostForm } from '@/components/community/NewPostForm';

export const metadata: Metadata = {
  title: 'منشور جديد',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Composing a post.
 *
 * The page is server-guarded: a signed-out visitor is redirected before the
 * form exists, and a banned account is refused with an explanation rather than
 * being allowed to type a post that Firestore will reject on submit.
 */
export default async function NewPostPage() {
  const session = await getSession();
  if (!session) redirect('/signin?next=%2Fcommunity%2Fnew');

  if (session.status === 'banned') {
    return (
      <div className="shell" style={{ paddingTop: 50, paddingBottom: 50, maxWidth: 620 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>لا يمكنك النشر</h1>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '12px 0 0', lineHeight: 1.95 }}>
          هذا الحساب موقوف، فلا يمكنه النشر أو التعليق. يمكنك متابعة القراءة في المجتمع
          والموسوعة كالمعتاد.
        </p>
        <p style={{ marginTop: 20 }}>
          <Link href="/community" className="btn-ghost">← العودة إلى المجتمع</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 50, maxWidth: 680 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/community">المجتمع</Link> <span aria-hidden>/</span> منشور جديد
      </nav>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '14px 0 0' }}>منشور جديد</h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '10px 0 22px', lineHeight: 1.9 }}>
        سؤال محدد يصل إلى إجابة أسرع: اذكر قطعك، وما جرّبته، وما رأيته بالضبط.
        رفع الصور يأتي في التحديث التالي.
      </p>
      <NewPostForm />
    </div>
  );
}
