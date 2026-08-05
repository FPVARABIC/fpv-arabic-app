import { NextResponse } from 'next/server';
import { applyPaymentWebhook } from '@/lib/server/payments/service';

/**
 * The endpoint the payment provider POSTs to.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not read a status, an amount, or an order id from the request body.
 * It hands the raw body to the provider adapter, which returns a reference and
 * nothing else, and the service then asks the provider directly what happened.
 * See `payments/provider.ts` for why that shape is the safe one for both
 * signing and non-signing providers.
 *
 * WHY THE RAW BODY, NOT `req.json()`
 * ----------------------------------
 * Signature verification — for the providers that sign — is computed over the
 * exact bytes sent. Parsing and re-serialising changes them: key order, spacing,
 * unicode escapes. A signature check against re-serialised JSON fails for
 * legitimate messages and, worse, invites somebody to "fix" it by skipping the
 * check. So the body is read once, as text, and passed through untouched.
 *
 * STATUS CODES ARE PART OF THE PROTOCOL
 * -------------------------------------
 * A provider retries on 5xx and stops on 2xx. So:
 *   - handled, or correctly ignored  → 200, do not retry
 *   - we could not reach the provider → 500, please retry
 *   - malformed or unknown reference  → 400, retrying will not help
 * Returning 200 unconditionally — the common shortcut — means a webhook lost to
 * a transient outage is lost permanently, and the order stays unpaid forever.
 */

// A webhook is never cached and never prerendered.
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const rawBody = await req.text();

  const result = await applyPaymentWebhook(req.headers, rawBody);

  if (!result.ok) {
    // «تعذّر التحقّق الآن» is the one case where the provider should come back.
    const retryable = result.errorAr === 'تعذّر التحقّق الآن.';
    return NextResponse.json(
      { ok: false },
      { status: retryable ? 500 : 400 },
    );
  }

  return NextResponse.json({ ok: true, changed: result.changed }, { status: 200 });
}

/**
 * Providers sometimes probe the URL with a GET before saving it.
 *
 * Answering 200 with nothing lets that probe succeed without implying the
 * endpoint does anything on GET — and a GET must never change a payment, which
 * is precisely why there is no handler that could.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true });
}
