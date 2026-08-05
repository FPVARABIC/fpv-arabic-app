'use client';

/**
 * The boundary of last resort: the ROOT LAYOUT itself failed.
 *
 * WHY IT IS SEPARATE FROM `error.tsx`
 * -----------------------------------
 * `error.tsx` renders INSIDE the root layout, so it cannot help when the
 * layout is what threw. This one replaces the document — which is why it must
 * supply its own `<html>` and `<body>`, and why it cannot reuse the site's
 * header, footer or stylesheet. Everything it needs is inline.
 *
 * WHY IT MATTERS HERE SPECIFICALLY
 * --------------------------------
 * The root layout calls `getSession()` on every request that is not served
 * from a prerendered file. That is the exact line between the pages that
 * worked in production and the pages that returned `Internal Server Error`:
 * `/` is a static file and never runs it, while `/community`, `/projects` and
 * `/search` run it on every request. A layout-level failure therefore takes
 * out every dynamic route at once while the home page looks perfectly healthy
 * — which is the most misleading shape this failure can have, and the one
 * that actually happened.
 *
 * The staging badge is repeated here on purpose. This is the one page the root
 * layout cannot put it on, and «which environment am I looking at» matters
 * most on the screen that says something went wrong.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{
        margin: 0,
        background: '#FAF8F3',
        color: '#152232',
        font: '400 15px/1.9 system-ui, -apple-system, "Segoe UI", Cairo, sans-serif',
      }}>
        <p style={{
          margin: 0, padding: '7px 16px', textAlign: 'center',
          background: '#F2EEE6', color: '#5F6C79', fontSize: 12.5, fontWeight: 700,
        }}>
          نسخة تجريبية — لا تُخصم أموال ولا تُشحن طلبات
        </p>

        <div style={{ maxWidth: 640, margin: '12vh auto', padding: '0 24px' }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#0B6E7D', margin: 0 }}>
            FPVARABIC
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: '10px 0 0' }}>
            المنصّة لم تستطع بدء الصفحة
          </h1>
          <p style={{ color: '#55636F', margin: '14px 0 0' }}>
            فشل تجهيز الإطار الأساسي للموقع على الخادم، لا محتوى الصفحة نفسها.
            هذا يصيب كل الصفحات التي تُبنى عند الطلب، بينما تبقى الصفحات
            الجاهزة مسبقاً تعمل — ولهذا قد تبدو الرئيسية سليمة.
          </p>

          {error.digest && (
            <p style={{ margin: '18px 0 0', fontSize: 13, color: '#5F6C79' }}>
              رمز الخطأ:{' '}
              <code dir="ltr" style={{
                background: '#F2EEE6', padding: '3px 8px', borderRadius: 6, fontSize: 12.5,
              }}>
                {error.digest}
              </code>
              <br />
              ابحث عن هذا الرمز في سجلّ الدالة على Netlify؛ السبب الحقيقي مكتوب بجانبه.
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0, borderRadius: 9, padding: '10px 18px', cursor: 'pointer',
                background: '#0B6E7D', color: '#fff', fontWeight: 800, fontSize: 14,
                fontFamily: 'inherit',
              }}
            >
              أعد المحاولة
            </button>
            <a
              href="/"
              style={{
                borderRadius: 9, padding: '10px 18px', textDecoration: 'none',
                border: '1px solid #E3DED3', color: '#152232', fontWeight: 800, fontSize: 14,
              }}
            >
              الرئيسية
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
