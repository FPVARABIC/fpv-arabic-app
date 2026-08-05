import Link from 'next/link';
import type { Metadata } from 'next';
import {
  PAYMENT_HELP_CASES, PAYMENT_HELP_RULES_AR, PAYMENT_HELP_CONTACT_AR,
} from '@core/data/store/paymentHelp';
import { SECTION_ROUTES } from '@/lib/webRoutes';
import { paymentHelpHref } from '@/lib/store';

export const metadata: Metadata = {
  title: 'مشاكل الدفع — ماذا أفعل',
  description:
    'ماذا يعني كل حالة دفع، وهل خُصم المبلغ، وما الخطوة التالية: الدفع مفتوح، '
    + 'فشل، أُلغي، انتهت المهلة، أو خُصم والطلب غير مؤكَّد.',
  alternates: { canonical: paymentHelpHref() },
};

export const revalidate = 300;

/**
 * «فشل الدفع، ماذا أفعل؟»
 *
 * WHY IT IS ORGANISED BY SYMPTOM AND NOT BY OUR STATUSES
 * ------------------------------------------------------
 * A customer does not know they are in `requires_action`. They know the bank
 * app asked for something, or that money left and nothing happened. Every
 * heading here is a sentence they could have said themselves — which is also
 * what makes the page findable, because it is what they type.
 *
 * The one case that maps to no status at all is the one that matters most:
 * «خُصم المبلغ والطلب غير مؤكَّد». A page organised around `PaymentStatus`
 * would have had no row for it.
 *
 * THE THREE RULES COME FIRST, BEFORE THE READER FINDS THEIR CASE
 * --------------------------------------------------------------
 * Two of them prevent an expensive mistake — paying twice, and treating a
 * browser redirect as proof of payment — and somebody frightened enough to be
 * on this page may not read past the first block. They are not "important
 * notices" decorating the top; they are the answer to the question that made
 * the reader open the page.
 *
 * WHAT THIS PAGE NEVER DOES
 * -------------------------
 * Guess why a bank declined. The provider returns a status, not a reason, and
 * every plausible guess we could print — «تأكّد من رصيدك» — is wrong most of
 * the time and insulting some of it. Each case says what is true, whether money
 * moved, and one next step.
 */
export default function PaymentHelpPage() {
  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 40, maxWidth: 760 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.store}>المتجر</Link> <span aria-hidden>/</span> مشاكل الدفع
      </nav>

      <h1 className="page-title" style={{ marginTop: 12 }}>مشاكل الدفع</h1>
      <p className="page-lede">
        ماذا يعني ما حدث، وهل خُصم المبلغ، وما الخطوة التالية. اختر الحالة التي
        تشبه ما تراه.
      </p>

      {/* The three rules. First, because they answer the panic. */}
      <section aria-labelledby="rules-h" className="card" data-testid="payment-help-rules"
        style={{ padding: '18px 20px', marginTop: 20 }}>
        <h2 id="rules-h" style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>
          قبل أي شيء
        </h2>
        <ul style={{ margin: '11px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
          {PAYMENT_HELP_RULES_AR.map(r => (
            <li key={r} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
              <span aria-hidden style={{
                width: 5, height: 5, borderRadius: 999, background: 'var(--sev-warning)',
                marginTop: 10, flexShrink: 0,
              }} />
              <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.95 }}>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* The cases. */}
      <section aria-labelledby="cases-h" style={{ marginTop: 30 }}>
        <h2 id="cases-h" style={{ fontSize: 19, fontWeight: 900, margin: '0 0 4px' }}>
          الحالات
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 16px' }}>
          لكل حالة: ما معناها، وهل خرج المال، وما تفعله الآن.
        </p>

        <ol data-testid="payment-help-cases"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 14 }}>
          {PAYMENT_HELP_CASES.map(c => (
            <li key={c.id} id={c.id} className="card"
              data-testid={`payment-help-${c.id}`}
              style={{ padding: '17px 19px', scrollMarginTop: 80 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{c.titleAr}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '9px 0 0', lineHeight: 1.95 }}>
                {c.meaningAr}
              </p>

              <dl className="admin-kv card-sm" style={{ padding: '13px 15px', marginTop: 13 }}>
                <div>
                  <dt>هل خُصم المبلغ</dt>
                  <dd>{c.moneyAr}</dd>
                </div>
                <div>
                  <dt>ما تفعله الآن</dt>
                  <dd style={{ fontWeight: 700 }}>{c.nextStepAr}</dd>
                </div>
                {c.waitAr && (
                  <div>
                    <dt>كم تنتظر</dt>
                    <dd>{c.waitAr}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ol>
      </section>

      {/* When to write to us. Last, because it is the step after the steps. */}
      <section aria-labelledby="contact-h" style={{ marginTop: 30 }}>
        <h2 id="contact-h" style={{ fontSize: 16, fontWeight: 900, margin: '0 0 8px' }}>
          متى تراسلنا
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95, margin: 0 }}>
          {PAYMENT_HELP_CONTACT_AR}
        </p>
        <p style={{ margin: '14px 0 0' }}>
          <Link href="/contact" className="btn-primary" data-testid="payment-help-contact">
            افتح صفحة التواصل
          </Link>
        </p>
      </section>
    </div>
  );
}
