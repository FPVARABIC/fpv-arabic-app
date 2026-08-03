import Link from 'next/link';

/**
 * A real 404 — the requirement named it: «أي وجهة غير موجودة يجب أن تعطي حالة
 * آمنة أو 404 حقيقية، لا صفحة مكسورة».
 *
 * Next serves this with an actual HTTP 404 status, so a crawler drops the URL
 * instead of indexing an error page as content. It also offers the reader a way
 * onward rather than a dead end, because most 404s here will be stale links to
 * content that moved rather than content that never existed.
 */
export default function NotFound() {
  return (
    <div className="shell" style={{ paddingTop: 80, paddingBottom: 80, maxWidth: 620 }}>
      <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 800, margin: 0 }} dir="ltr">404</p>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: '10px 0 0' }}>هذه الصفحة غير موجودة</h1>
      <p style={{ fontSize: 15, color: 'var(--text-dim)', margin: '14px 0 0', lineHeight: 1.95 }}>
        الرابط الذي وصلت منه قد يكون قديماً، أو يشير إلى محتوى انتقل. المحتوى نفسه غالباً
        ما زال موجوداً — ابحث عنه بالاسم أو بالعرَض الذي تصفه.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
        <Link href="/search" className="btn-primary">ابحث</Link>
        <Link href="/kb" className="btn-ghost">الموسوعة</Link>
        <Link href="/diagnose" className="btn-ghost">التشخيص</Link>
        <Link href="/" className="btn-ghost">الرئيسية</Link>
      </div>
    </div>
  );
}
