'use server';

import { revalidatePath } from 'next/cache';
import { getSession, sessionCan } from '@/lib/server/session';
import { mergeStoreDoc, isServiceConfigured } from '@/lib/backend/supabase/adminData';
import { actorFromSession, logAudit, markAuditResult, newRequestId } from '@/lib/server/audit';
import {
  SETTINGS_DOC_PUBLIC, SETTINGS_DOC_PRIVATE,
  validatePublicSettings, validatePrivateSettings,
} from '@core/data/store/settings';

/**
 * The shop's own settings — the margin, the review window, the notices.
 *
 * WHY THE MARGIN IS WRITTEN HERE AND NOWHERE ELSE
 * -----------------------------------------------
 * It was a constant read straight out of the code, which meant «change the
 * margin» was a deployment. It is a number a shop owner changes on a Tuesday
 * because a supplier put their prices up, and it moves every price it touches —
 * so it belongs in the database, behind a capability, and in the audit log.
 *
 * WHY PUBLIC AND PRIVATE ARE TWO DOCUMENTS AND ONE FORM
 * -----------------------------------------------------
 * Firestore rules allow or deny a WHOLE document; there is no way to return one
 * with the margin withheld. So the banner a customer reads and the margin they
 * must not lives in `storeSettings/public` and `storeSettings/private`
 * respectively. One screen writes both, because to whoever runs the shop they
 * are one set of settings — the split is a storage fact, not a workflow.
 *
 * Both are validated on the way in AND on the way out (`validate*Settings`), so
 * a hand-edited document produces a working shop with sane defaults rather than
 * «undefined دولار» on every price.
 */

export type SettingsResult = { ok: true } | { ok: false; errorAr: string };

export interface SettingsInput {
  defaultMarginPercent: string;
  priceReviewDays: string;
  bannerEnabled: boolean;
  bannerHeadlineAr: string;
  bannerBodyAr: string;
  shippingNoteAr: string;
  regulatoryNoteAr: string;
}

export async function saveStoreSettings(input: SettingsInput): Promise<SettingsResult> {
  const session = await getSession();
  // The margin decides whether the shop makes money. `store.viewSupply` is the
  // capability that already means «may see the commercial side», and it is
  // deliberately narrower than `store.editProducts`.
  if (!session || !sessionCan(session, 'store.viewSupply')
    || !sessionCan(session, 'store.editProducts')) {
    return { ok: false, errorAr: 'لا تملك صلاحية تعديل إعدادات المتجر.' };
  }
  if (!isServiceConfigured()) return { ok: false, errorAr: 'الاتصال بقاعدة البيانات غير متاح.' };

  const margin = Number(input.defaultMarginPercent.trim());
  if (!Number.isFinite(margin) || margin < 0 || margin > 500) {
    return { ok: false, errorAr: 'هامش الربح يجب أن يكون بين 0 و500.' };
  }
  const days = Number(input.priceReviewDays.trim());
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    // Zero would mark every price stale the instant it was entered and stop the
    // shop selling anything; a thousand is the setting switched off while
    // looking as though it is on, which is worse than off.
    return { ok: false, errorAr: 'مدة مراجعة السعر يجب أن تكون بين يوم و365 يوماً.' };
  }

  const headlineAr = input.bannerHeadlineAr.trim().slice(0, 120);
  const bodyAr = input.bannerBodyAr.trim().slice(0, 600);
  if (input.bannerEnabled && (!headlineAr || !bodyAr)) {
    return { ok: false, errorAr: 'لا يمكن تفعيل الشريط بعنوان أو نصّ فارغ.' };
  }
  const shippingNoteAr = input.shippingNoteAr.trim().slice(0, 300);
  if (!shippingNoteAr) {
    // A shop that says nothing about shipping is a shop that surprises people
    // about shipping.
    return { ok: false, errorAr: 'اكتب ملاحظة الشحن — الصمت عنها يفاجئ العميل.' };
  }

  const now = new Date().toISOString();
  const entryId = await logAudit(actorFromSession(session), newRequestId(), {
    action: 'store.settings',
    targetType: 'product',
    targetId: 'store-settings',
    // The margin is recorded because it is the one that moves money. It is
    // readable by anybody with `audit.view`, which is a wider set than
    // `store.viewSupply` — but a margin alone reveals no cost, only a policy.
    after: `margin=${margin}% review=${days}d banner=${input.bannerEnabled ? 'on' : 'off'}`,
  });

  try {
    await mergeStoreDoc('storeSettings', SETTINGS_DOC_PRIVATE,
      validatePrivateSettings({ defaultMarginPercent: margin, priceReviewDays: days }) as unknown as Record<string, unknown>,
      null);
    await mergeStoreDoc('storeSettings', SETTINGS_DOC_PUBLIC, {
      ...validatePublicSettings({
        currency: 'USD',
        banner: { enabled: input.bannerEnabled, headlineAr, bodyAr },
        shippingNoteAr,
        regulatoryNoteAr: input.regulatoryNoteAr.trim().slice(0, 400),
      }),
      updatedAt: now,
    } as unknown as Record<string, unknown>, null);
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر الحفظ. حاول مرة أخرى.' };
  }

  // A margin change re-prices everything, so everything is invalidated.
  revalidatePath('/store', 'layout');
  revalidatePath('/admin/store/settings');
  revalidatePath('/admin/store/supply');
  return { ok: true };
}
