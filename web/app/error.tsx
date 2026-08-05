'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * What a reader sees when a page fails on the server.
 *
 * WHY THIS FILE DID NOT EXIST AND WHY THAT WAS THE REAL DEFECT
 * ------------------------------------------------------------
 * Without an error boundary, Next answers a failed server render with a
 * twenty-one byte body: `Internal Server Error`. No message, no digest, no
 * Arabic, nothing a reader can act on and nothing an author can debug. Three
 * pages failed that way in production — `/community`, `/projects`, `/search` —
 * and the failure was undiagnosable from outside precisely because this file
 * was missing. The bare string is the same whatever threw.
 *
 * So this boundary exists to make the next failure legible:
 *
 *   · it says, in Arabic, what happened and what still works
 *   · it prints the DIGEST — the hash Next logs alongside the real stack, and
 *     the one string that ties what a reader sees to a line in the function log
 *   · it offers a retry, because a transient upstream failure is common and
 *     re-rendering is free
 *   · it keeps the reader inside the platform with real links, rather than
 *     stranding them on a dead page
 *
 * WHY THE DIGEST IS SHOWN RATHER THAN HIDDEN
 * ------------------------------------------
 * It is not sensitive: it is a hash, deliberately designed to be shown to
 * users while the message it stands for stays on the server. Hiding it buys
 * nothing and costs the one thread that connects a report — «the page broke» —
 * to the log line that says why.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Goes to the browser console AND, on the server render, to the function
    // log — so the digest is greppable from either side.
    console.error('[fpvarabic] route error', error.digest ?? '(no digest)', error.message);
  }, [error]);

  return (
    <div className="shell" style={{ paddingTop: 60, paddingBottom: 80, maxWidth: 640 }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-ink)', margin: 0 }}>
        FPVARABIC
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '10px 0 0' }}>
        تعذّر عرض هذه الصفحة
      </h1>
      <p style={{
        fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.95, margin: '14px 0 0',
      }}>
        حدث خطأ أثناء تجهيز الصفحة على الخادم. بقيّة المنصّة تعمل — الموسوعة
        والمشاريع والبرامج لا تعتمد على ما فشل هنا.
      </p>

      {error.digest && (
        <p style={{ margin: '18px 0 0', fontSize: 13, color: 'var(--text-dimmer)' }}>
          رمز الخطأ:{' '}
          <code dir="ltr" style={{
            background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 6,
            fontSize: 12.5,
          }}>
            {error.digest}
          </code>
          <br />
          هذا الرمز يظهر في سجلّ الخادم بجانب السبب الحقيقي.
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
        <button type="button" onClick={reset} className="btn-primary">
          أعد المحاولة
        </button>
        <Link href="/" className="btn-ghost">الرئيسية</Link>
        <Link href="/kb" className="btn-ghost">الموسوعة</Link>
        <Link href="/projects" className="btn-ghost">المشاريع</Link>
      </div>
    </div>
  );
}
