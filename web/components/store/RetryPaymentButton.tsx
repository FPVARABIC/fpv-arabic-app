'use client';

import { useState, useTransition } from 'react';
import { beginPayment } from '@/app/store/cart/checkout/actions';

/**
 * Pay, or pay again.
 *
 * WHY IT SENDS ONLY AN ORDER ID
 * -----------------------------
 * Because that is all the server accepts. The amount, the currency and the
 * shipping are read from the order the server itself wrote — see
 * `payments/service.ts`. There is deliberately no prop on this component that
 * could carry a price, so there is nothing here for a devtools console to
 * change.
 *
 * WHY IT REDIRECTS RATHER THAN CONFIRMING
 * ---------------------------------------
 * A successful call means «the provider has a payment waiting», not «paid».
 * The only honest next step is to send the customer to the provider, so that is
 * what happens — and the button is disabled meanwhile, because a second click
 * during the round trip is the commonest way somebody tries to pay twice. The
 * server would return the SAME checkout URL anyway, but not making them wait to
 * find that out is the better interface.
 */
export const RetryPaymentButton: React.FC<{ orderId: string }> = ({ orderId }) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        className="btn-primary"
        data-testid="pay-retry"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await beginPayment(orderId);
            if (!r.ok) { setError(r.errorAr); return; }
            window.location.href = r.checkoutUrl;
          });
        }}
      >
        {pending ? 'جارٍ التحويل…' : 'ادفع الآن'}
      </button>

      {error && (
        <p
          role="alert"
          data-testid="pay-retry-error"
          style={{
            flexBasis: '100%', margin: '10px 0 0', fontSize: 13,
            color: 'var(--sev-blocker)', lineHeight: 1.9,
          }}
        >
          {error}
        </p>
      )}
    </>
  );
};
