'use server';

import { revalidatePath } from 'next/cache';
import { getSession, sessionCan } from '@/lib/server/session';
import { setStoreDoc, mergeStoreDoc, isServiceConfigured } from '@/lib/backend/supabase/adminData';
import { actorFromSession, logAudit, markAuditResult, newRequestId } from '@/lib/server/audit';
import { storeProduct } from '@core/data/store/catalogue';
import { OWNER_DECISIONS } from '@core/data/store/decisions';

/**
 * Recording the owner's answer to a question the system would not answer.
 *
 * WHY THE ANSWER IS STORED EVEN WHEN IT CHANGES NOTHING
 * -----------------------------------------------------
 * «Keep it as it is» and «this needs a catalogue change» both perform no write
 * to the product — and both are real answers that must stop the panel asking
 * again. A decision page that keeps raising a question somebody already settled
 * is a page people learn to skip, and then it stops working for the questions
 * that matter.
 *
 * WHAT THIS WILL NOT DO
 * ---------------------
 * Swap a product for another, or split one into variants. Those are catalogue
 * changes: they alter what a section offers and what a URL resolves to, and
 * they belong in a reviewed commit rather than in a click. The option exists,
 * it records the intent, and it says plainly that the work follows.
 */

const DECISIONS = 'storeDecisions';

export type DecisionResult = { ok: true } | { ok: false; errorAr: string };

export async function recordDecision(
  decisionId: string, optionId: string,
): Promise<DecisionResult> {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.editProducts')) {
    return { ok: false, errorAr: 'لا تملك صلاحية اتخاذ هذا القرار.' };
  }
  if (!isServiceConfigured()) return { ok: false, errorAr: 'الاتصال بقاعدة البيانات غير متاح.' };

  const decision = OWNER_DECISIONS.find(d => d.id === decisionId);
  const option = decision?.options.find(o => o.id === optionId);
  if (!decision || !option) return { ok: false, errorAr: 'قرار أو خيار غير معروف.' };
  if (!storeProduct(decision.productId)) {
    return { ok: false, errorAr: 'المنتج المرتبط بهذا القرار لم يعد موجوداً.' };
  }

  const now = new Date().toISOString();
  const entryId = await logAudit(actorFromSession(session), newRequestId(), {
    action: 'store.decision',
    targetType: 'product',
    targetId: decision.productId,
    // The option's own words, so the log reads as a decision rather than an id.
    after: `${decision.titleAr} → ${option.labelAr}`,
  });

  try {
    await setStoreDoc(DECISIONS, decisionId, {
      decisionId,
      productId: decision.productId,
      optionId,
      optionLabelAr: option.labelAr,
      action: option.action,
      decidedBy: session.uid,
      decidedByName: session.displayName ?? null,
      decidedAt: now,
    }, session.uid);

    // Hiding is the one action a click may perform: it is reversible, needs no
    // new data, and orders that reference the product keep working.
    if (option.action === 'unpublish') {
      await mergeStoreDoc('storeProducts', decision.productId, {
        published: false,
        updatedAt: now,
        updatedBy: session.uid,
      }, session.uid);
      revalidatePath(`/store/p/${decision.productId}`);
      revalidatePath('/store');
    }
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر حفظ القرار. حاول مرة أخرى.' };
  }

  revalidatePath('/admin/store/decisions');
  revalidatePath('/admin/store/products');
  return { ok: true };
}
