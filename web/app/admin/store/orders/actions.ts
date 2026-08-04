'use server';

import { revalidatePath } from 'next/cache';
import { getSession, sessionCan } from '@/lib/server/session';
import { updateOrderStatus } from '@/lib/server/storeOrders';
import { actorFromSession, logAudit, markAuditResult, newRequestId } from '@/lib/server/audit';
import type { OrderStatus } from '@core/data/store/types';

/**
 * Moving an order forward.
 *
 * The capability is checked HERE, on the server, not by whether the button
 * rendered. A staff member who can see orders is not necessarily one who may
 * change them, and the two capabilities are separate for that reason.
 *
 * Audited before the write, like every other privileged mutation in this
 * codebase: an action nobody can trace is an action nobody is accountable for.
 */
export async function setOrderStatus(orderId: string, next: OrderStatus) {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.manageOrders')) {
    return { ok: false as const, errorAr: 'لا تملك صلاحية تغيير حالة الطلبات.' };
  }

  // Written BEFORE the change, then corrected with what actually happened —
  // the same order every other privileged mutation in this codebase uses, so a
  // write that fails halfway still leaves a trace of having been attempted.
  const entryId = await logAudit(actorFromSession(session), newRequestId(), {
    action: 'store.order.status',
    targetType: 'order',
    targetId: orderId,
    after: next,
  });

  const result = await updateOrderStatus(orderId, next);
  await markAuditResult(entryId, result.ok ? 'ok' : 'error', result.ok ? undefined : result.errorAr);
  if (result.ok) revalidatePath('/admin/store/orders');
  return result;
}
