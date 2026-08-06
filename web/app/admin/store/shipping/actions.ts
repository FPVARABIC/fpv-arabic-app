'use server';

import { revalidatePath } from 'next/cache';
import { requireCapability } from '@/lib/server/adminRoute';
import { logAudit, newRequestId, actorFromSession } from '@/lib/server/audit';
import { saveShippingZone, shippingZones, shippingRules } from '@/lib/server/storeShipping';
import { mergeStoreDoc } from '@/lib/backend/supabase/adminData';
import { SEED_SHIPPING_ZONES } from '@core/data/store/shipping';

/**
 * Saving a shipping zone.
 *
 * EVERY FIELD IS PARSED, NONE IS TRUSTED
 * --------------------------------------
 * These arrive from a form, which is to say from a browser, which is to say
 * from anyone with the capability and a developer console. A cost that arrives
 * as `-500` or `1e9` or `"free"` must not reach a customer's basket, so each
 * value is parsed to an integer and range-checked here rather than being read
 * straight out of the payload.
 *
 * WHY REFUSING BEATS COERCING
 * ---------------------------
 * A blank cost could be read as zero. It is not zero — it is «not priced yet»,
 * and the two produce opposite behaviour at the checkout: one ships free, the
 * other refuses to quote. So a blank field saves `null` and an unparseable one
 * is an error the admin sees, never a silent 0.
 */

type Result = { ok: true } | { ok: false; errorAr: string };

/** Money from a form: an integer number of cents, or null for «not set». */
function parseMinor(raw: FormDataEntryValue | null): number | null | 'invalid' {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  // Accept «4,95» and «4.95» — both are typed by Dutch and Arabic keyboards.
  const normalised = s.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return 'invalid';
  const [whole, frac = ''] = normalised.split('.');
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor < 0 || minor > 100_000_00) return 'invalid';
  return minor;
}

function parseDays(raw: FormDataEntryValue | null): number | null | 'invalid' {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return null;
  if (!/^\d{1,3}$/.test(s)) return 'invalid';
  const n = Number(s);
  return n >= 0 && n <= 365 ? n : 'invalid';
}

export async function saveZone(form: FormData): Promise<Result> {
  const gate = await requireCapability('store.editProducts');
  if (!gate.ok) return { ok: false, errorAr: gate.errorAr };

  const zoneId = String(form.get('zoneId') ?? '');
  const seed = SEED_SHIPPING_ZONES.find(z => z.id === zoneId);
  if (!seed) return { ok: false, errorAr: 'منطقة غير معروفة.' };

  const costMinor = parseMinor(form.get('costMinor'));
  if (costMinor === 'invalid') {
    return { ok: false, errorAr: 'تكلفة الشحن غير صالحة — اكتب رقماً مثل 4.95' };
  }

  const freeOverMinor = parseMinor(form.get('freeOverMinor'));
  if (freeOverMinor === 'invalid') {
    return { ok: false, errorAr: 'حدّ الشحن المجاني غير صالح.' };
  }

  const etaDaysMin = parseDays(form.get('etaDaysMin'));
  const etaDaysMax = parseDays(form.get('etaDaysMax'));
  if (etaDaysMin === 'invalid' || etaDaysMax === 'invalid') {
    return { ok: false, errorAr: 'مدة التوصيل غير صالحة — اكتب عدد أيام.' };
  }

  const enabled = form.get('enabled') === 'on';

  /* ── The contradictions, refused rather than saved ──────────────────────── */

  if (etaDaysMin !== null && etaDaysMax !== null && etaDaysMin > etaDaysMax) {
    return { ok: false, errorAr: 'أقل مدة توصيل أكبر من أكثرها.' };
  }
  if ((etaDaysMin === null) !== (etaDaysMax === null)) {
    return { ok: false, errorAr: 'اكتب طرفَي مدة التوصيل أو اتركهما فارغين معاً.' };
  }
  // A free-shipping threshold with no cost to waive describes nothing.
  if (freeOverMinor !== null && costMinor === null) {
    return { ok: false, errorAr: 'لا يمكن تحديد حدّ شحن مجاني قبل إدخال تكلفة الشحن.' };
  }
  // Enabling a zone that cannot quote produces a checkout that refuses at the
  // last step. Better to say so here, where it can be fixed.
  if (enabled && costMinor === null) {
    return {
      ok: false,
      errorAr: 'لا يمكن تفعيل منطقة بلا تكلفة شحن — أدخل التكلفة أو أبقِ المنطقة معطّلة.',
    };
  }

  const before = (await shippingZones()).find(z => z.id === zoneId);

  await saveShippingZone(zoneId, {
    costMinor, freeOverMinor, etaDaysMin, etaDaysMax, enabled,
  });

  await logAudit(actorFromSession(gate.session), newRequestId(), {
    action: 'store.settings',
    targetType: 'product',
    targetId: `shipping:${zoneId}`,
    before: before ? `${before.costMinor ?? 'null'}/${before.enabled}` : null,
    after: `${costMinor ?? 'null'}/${enabled}`,
    meta: {
      zone: zoneId,
      costMinor: costMinor ?? null,
      freeOverMinor: freeOverMinor ?? null,
      enabled,
    },
  });

  revalidatePath('/admin/store/shipping');
  return { ok: true };
}

/**
 * The rules that apply everywhere: what we will not ship, and what a human has
 * to price by hand.
 */
export async function saveRules(form: FormData): Promise<Result> {
  const gate = await requireCapability('store.editProducts');
  if (!gate.ok) return { ok: false, errorAr: gate.errorAr };

  const parseList = (v: FormDataEntryValue | null) =>
    String(v ?? '')
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 200);

  const blockedCategoryIds = parseList(form.get('blockedCategoryIds'));
  const manualReviewProductIds = parseList(form.get('manualReviewProductIds'));

  const before = await shippingRules();

  await mergeStoreDoc('storeSettings', 'shippingRules',
    { blockedCategoryIds, manualReviewProductIds, updatedAt: new Date().toISOString() },
    gate.session.uid);

  await logAudit(actorFromSession(gate.session), newRequestId(), {
    action: 'store.settings',
    targetType: 'product',
    targetId: 'shipping:rules',
    before: `${before.blockedCategoryIds.length}/${before.manualReviewProductIds.length}`,
    after: `${blockedCategoryIds.length}/${manualReviewProductIds.length}`,
    meta: {
      blocked: blockedCategoryIds.join(',') || null,
      manual: manualReviewProductIds.join(',') || null,
    },
  });

  revalidatePath('/admin/store/shipping');
  return { ok: true };
}
