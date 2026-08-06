import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { isServiceConfigured, serviceClient } from './service';
import { toOrderSummary, toSupplyRecord, type Row } from './rows';
import { ORDER_STATUS_NEXT } from '@core/data/store/types';
import type {
  AdminPort, DraftOrderInput, FulfilmentState, OrderSummary, PaymentState, PlatformRole,
} from '../ports';

/**
 * The ADMIN adapter — the secret key, and the only file that holds it.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE FIRST LINE OF THIS FILE IS THE MOST IMPORTANT ONE
 * ═══════════════════════════════════════════════════════════════════════════
 * `import 'server-only'` is not documentation. The package's entire content is
 * a module that THROWS when resolved through a browser condition, so any client
 * component that imports this file — directly or through six layers of
 * re-export — fails the build with a message naming the import chain.
 *
 * That matters because the alternative protections are all conventions. A
 * comment saying «server only» is obeyed by whoever reads it. A folder named
 * `server/` is obeyed by whoever notices. Tree-shaking is an optimisation and
 * makes no promise about what it removes. A build error is the only one that
 * cannot be forgotten, and the thing being protected here is a key that
 * bypasses every policy in `0002` and `0003` at once.
 *
 * WHAT THE SECRET KEY ACTUALLY IS
 * ===============================
 * `service_role`. It does not «have more permissions» — it is exempt from
 * row-level security ENTIRELY. Every `using` and `with check` clause proven by
 * the 58 assertions in `scripts/testSupabaseRls.ts` and the 59 in
 * `testSupabaseStorage.ts` simply does not apply to it.
 *
 * The consequence is the reverse of the client adapter's, and it is the whole
 * reason this file reads as it does: `client.ts` deliberately writes NO
 * ownership filters because the policies are the filter. Here there are no
 * policies, so every condition must be written out by hand — and a forgotten
 * condition is not a denied request, it is an unrestricted one.
 *
 * WHY THE OPERATIONS BELOW ARE THE ONES THAT ARE HERE
 * ===================================================
 * Each is something `0002` refuses a client ON PURPOSE, so each would be
 * impossible without this key:
 *
 *   createOrder          `orders` has NO client INSERT policy at all. That is
 *                        what makes «الطلب لا يرسل السعر من العميل» mechanical
 *                        rather than remembered — the client cannot write an
 *                        order, so it cannot write a price.
 *   setPaymentState      money moved. Driven by a provider webhook.
 *   setFulfilmentState   what the shop did. A customer who could set this
 *                        could close their own dispute.
 *   setUserRole/Status   `profiles_update_self` freezes both columns.
 *   moderateContent      hiding is not something an author may do to a critic.
 *   supplyFor            `store_supply` has no client policy whatsoever, and
 *                        price ÷ margin = cost.
 *   appendAudit          a log a client can write is a log that can be forged.
 *   listReports          reading the queue leaks reporter identities.
 *
 * Nothing else belongs here. If an operation CAN go through RLS, it goes in
 * `client.ts` — because an operation that runs on the secret key is an
 * operation whose correctness rests on this file being right, and every one
 * added enlarges that surface.
 */

/* ── The client ───────────────────────────────────────────────────────────── */

/**
 * The key itself lives in `service.ts` — one module reads it, two privileged
 * modules share the client it builds. Exported so a route can answer «الخدمة
 * غير مهيّأة» instead of throwing when the key has not been added yet.
 */
export function isAdminConfigured(): boolean {
  return isServiceConfigured();
}

function admin(): SupabaseClient | null {
  return serviceClient();
}

const NOT_CONFIGURED_AR = 'الخدمة غير مهيّأة على الخادم.';
const FAILED_AR = 'تعذّر إتمام العملية. حاول مرة أخرى.';

/* ── Order reference ──────────────────────────────────────────────────────── */

/**
 * A human-facing order reference: `FPV-<base36 time>-<4 random>`.
 *
 * Short enough to read down a phone line, and NOT sequential. A sequential
 * reference tells every customer how many orders the shop has taken and lets
 * anyone guess their neighbour's — and while `orders_read_own` would refuse the
 * read, a guessable reference still leaks the shop's volume to anyone who
 * places two orders a week apart.
 *
 * Collisions are caught by the `unique` constraint on the column rather than
 * by trusting the entropy, which is why `createOrder` reports the insert error
 * instead of retrying blind.
 */
function newReference(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `FPV-${t}-${r}`;
}

/* ── The port ─────────────────────────────────────────────────────────────── */

export function adminBackend(): AdminPort {
  const sb = admin();
  const unconfigured = { ok: false as const, errorAr: NOT_CONFIGURED_AR };

  return {
    /**
     * Prices the basket from the catalogue and writes the order.
     *
     * THE CLIENT'S NUMBERS ARE NOT READ — there are none. `DraftOrderInput`
     * carries product ids, variant ids and quantities and nothing else, so
     * «الطلب لا يرسل السعر من العميل بوصفه حقيقة» is enforced by the TYPE
     * rather than by a check somebody has to remember to write. A caller
     * cannot send a total; there is no field for one.
     *
     * Every line's price is FROZEN onto the order at this moment and never
     * looks at the catalogue again. A margin edited tomorrow must not change
     * what a customer agreed to today — an order that follows the live price
     * is not a record of an agreement, it is a live quote pretending to be one.
     */
    async createOrder(draft: DraftOrderInput, userId: string | null) {
      if (!sb) return unconfigured;

      const items = draft.items.filter(i => i.quantity > 0 && i.productId);
      if (items.length === 0) return { ok: false, errorAr: 'السلة فارغة.' };
      // A guard against a basket that is a denial-of-service rather than an
      // order. The number is generous; the point is that it is bounded.
      if (items.length > 50) return { ok: false, errorAr: 'عدد الأصناف في السلة كبير جداً.' };

      try {
        // ONE query for every variant named, then priced locally. Pricing each
        // line with its own round trip would be N queries for a basket of N,
        // and would let the catalogue change halfway through a single order.
        const variantIds = items.map(i => i.variantId).filter((v): v is string => Boolean(v));
        const productIds = [...new Set(items.map(i => i.productId))];

        const [{ data: variants }, { data: products }] = await Promise.all([
          variantIds.length
            ? sb.from('store_variants').select('*').in('id', variantIds)
            : Promise.resolve({ data: [] as Row[] }),
          sb.from('store_products').select('*').in('id', productIds),
        ]);

        const variantById = new Map((variants ?? []).map(v => [String((v as Row).id), v as Row]));
        const productById = new Map((products ?? []).map(p => [String((p as Row).id), p as Row]));

        let subtotal = 0;
        let currency = 'EUR';
        const lines: Row[] = [];

        for (const item of items) {
          const product = productById.get(item.productId);
          // A product that is not published, or is suspended, cannot be
          // ordered — checked HERE because the secret key would happily read
          // and sell it. `store_products_read_published` protects the browser;
          // nothing protects this code but this line.
          if (!product || product.published !== true || product.suspended_reason_ar) {
            return { ok: false, errorAr: 'أحد المنتجات لم يعد متاحاً. حدّث السلة وحاول مرة أخرى.' };
          }

          const variant = item.variantId ? variantById.get(item.variantId) : undefined;
          if (item.variantId && (!variant || String(variant.product_id) !== item.productId)) {
            return { ok: false, errorAr: 'أحد الخيارات لم يعد متاحاً. حدّث السلة وحاول مرة أخرى.' };
          }

          const unit = variant ? numeric(variant.price_minor) : null;
          if (unit === null) {
            return { ok: false, errorAr: 'أحد المنتجات بلا سعر محدد. تواصل معنا لإتمام الطلب.' };
          }

          if (variant?.currency) currency = String(variant.currency);
          const quantity = Math.min(Math.trunc(item.quantity), 99);
          const lineTotal = unit * quantity;
          subtotal += lineTotal;

          lines.push({
            product_id: item.productId,
            variant_id: item.variantId,
            name_ar: String(variant?.label_ar ?? product.name_ar ?? ''),
            unit_price_minor: unit,
            quantity,
            line_total_minor: lineTotal,
          });
        }

        // Shipping is quoted from the region table for the same reason prices
        // are: a client that names its own shipping cost names its own total.
        const shipping = await quoteShipping(sb, draft.shippingRegionId, subtotal);
        if (shipping === null) {
          return { ok: false, errorAr: 'لا نشحن إلى هذه المنطقة حالياً.' };
        }

        const { data: order, error } = await sb
          .from('orders')
          .insert({
            reference: newReference(),
            user_id: userId,
            email: draft.email,
            phone: draft.phone ?? null,
            ship_to: draft.shipTo,
            shipping_region_id: draft.shippingRegionId,
            subtotal_minor: subtotal,
            shipping_minor: shipping,
            total_minor: subtotal + shipping,
            currency,
            // `draft`, not `awaiting_payment`. The order exists; no payment has
            // been attempted. Mollie moves it on, and Mollie is a later batch.
            payment_state: 'draft',
            fulfilment: 'received',
            note_ar: draft.noteAr ?? null,
          })
          .select('*')
          .single();

        if (error || !order) {
          console.error('[admin] createOrder failed', error?.message);
          return { ok: false, errorAr: FAILED_AR };
        }

        const orderId = String((order as Row).id);
        const { error: itemsError } = await sb
          .from('order_items')
          .insert(lines.map(l => ({ ...l, order_id: orderId })));

        if (itemsError) {
          // An order with no lines is worse than no order: it appears in the
          // queue with a total and nothing to ship. PostgREST has no
          // multi-statement transaction, so the compensating delete is the
          // available correctness — and it is recorded, because a failure that
          // leaves no trace is a failure nobody investigates.
          console.error('[admin] order items failed, rolling back', itemsError.message);
          await sb.from('orders').delete().eq('id', orderId);
          await appendAuditTo(sb, {
            actorId: userId,
            action: 'order.create.rollback',
            targetType: 'order',
            targetId: orderId,
            summary: itemsError.message,
          });
          return { ok: false, errorAr: FAILED_AR };
        }

        await appendAuditTo(sb, {
          actorId: userId,
          action: 'order.create',
          targetType: 'order',
          targetId: orderId,
          metadata: { total_minor: subtotal + shipping, lines: lines.length },
        });

        return { ok: true, order: toOrderSummary(order as Row) };
      } catch (e) {
        console.error('[admin] createOrder threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    async setPaymentState(orderId: string, state: PaymentState, actorId: string | null) {
      if (!sb) return unconfigured;
      try {
        const { data, error } = await sb
          .from('orders').update({ payment_state: state }).eq('id', orderId).select('id');
        if (error || !data?.length) return { ok: false, errorAr: FAILED_AR };
        await appendAuditTo(sb, {
          actorId, action: 'order.payment_state', targetType: 'order',
          targetId: orderId, summary: state,
        });
        return { ok: true };
      } catch (e) {
        console.error('[admin] setPaymentState threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    /**
     * The fulfilment axis, and the only transition check in this file.
     *
     * `ORDER_STATUS_NEXT` is the authority — the same table the existing admin
     * panel already drives — and it is FORWARD ONLY: a delivered order cannot
     * return to «received». An order's history is a record of what happened,
     * and a status that can move backwards is a record that can be rewritten.
     *
     * The check is here rather than in a database constraint because the map
     * lives in TypeScript and is shared with the panel that renders the
     * buttons. Two copies would drift; one copy, consulted by both, cannot.
     */
    async setFulfilmentState(orderId: string, state: FulfilmentState, actorId: string) {
      if (!sb) return unconfigured;
      try {
        const { data: current } = await sb
          .from('orders').select('fulfilment').eq('id', orderId).maybeSingle();
        if (!current) return { ok: false, errorAr: 'الطلب غير موجود.' };

        const from = String((current as Row).fulfilment) as FulfilmentState;
        if (from !== state && !ORDER_STATUS_NEXT[from]?.includes(state)) {
          return { ok: false, errorAr: 'هذا الانتقال غير مسموح من الحالة الحالية للطلب.' };
        }

        const { data, error } = await sb
          .from('orders').update({ fulfilment: state }).eq('id', orderId).select('id');
        if (error || !data?.length) return { ok: false, errorAr: FAILED_AR };

        await appendAuditTo(sb, {
          actorId, action: 'order.fulfilment', targetType: 'order',
          targetId: orderId, summary: `${from} → ${state}`,
        });
        return { ok: true };
      } catch (e) {
        console.error('[admin] setFulfilmentState threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    /**
     * Change somebody's role.
     *
     * THE LAST OWNER CANNOT BE DEMOTED. A platform whose last owner demotes
     * themselves has nobody who can promote anyone, and no way back in short of
     * a SQL console. The count is taken immediately before the write, which is
     * a race in theory; in a platform with a handful of owners, all of them
     * human, it is not one in practice — and the alternative is a database
     * trigger, which is where this check should move if that ever stops being
     * true.
     */
    async setUserRole(userId: string, role: PlatformRole, actorId: string) {
      if (!sb) return unconfigured;
      try {
        const { data: target } = await sb
          .from('profiles').select('role').eq('id', userId).maybeSingle();
        if (!target) return { ok: false, errorAr: 'الحساب غير موجود.' };

        const from = String((target as Row).role);
        if (from === 'owner' && role !== 'owner') {
          const { count } = await sb
            .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner');
          if ((count ?? 0) <= 1) {
            return { ok: false, errorAr: 'لا يمكن إزالة آخر مالك للمنصة.' };
          }
        }

        const { data, error } = await sb
          .from('profiles').update({ role }).eq('id', userId).select('id');
        if (error || !data?.length) return { ok: false, errorAr: FAILED_AR };

        await appendAuditTo(sb, {
          actorId, action: 'role.change', targetType: 'profile',
          targetId: userId, summary: `${from} → ${role}`,
        });
        return { ok: true };
      } catch (e) {
        console.error('[admin] setUserRole threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    async setUserStatus(userId: string, status: 'active' | 'banned', actorId: string) {
      if (!sb) return unconfigured;
      try {
        const { data, error } = await sb
          .from('profiles').update({ status }).eq('id', userId).select('id');
        if (error || !data?.length) return { ok: false, errorAr: FAILED_AR };
        await appendAuditTo(sb, {
          actorId, action: status === 'banned' ? 'user.ban' : 'user.unban',
          targetType: 'profile', targetId: userId,
        });
        return { ok: true };
      } catch (e) {
        console.error('[admin] setUserStatus threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    async moderateContent(input) {
      if (!sb) return unconfigured;
      const table = input.kind === 'post' ? 'posts' : 'comments';
      try {
        const { data, error } = await sb
          .from(table).update({ status: input.status }).eq('id', input.id).select('id');
        if (error || !data?.length) return { ok: false, errorAr: FAILED_AR };
        await appendAuditTo(sb, {
          actorId: input.actorId,
          action: `${input.kind}.${input.status}`,
          targetType: input.kind,
          targetId: input.id,
          summary: input.reasonAr,
        });
        return { ok: true };
      } catch (e) {
        console.error('[admin] moderateContent threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    /**
     * The freshest supply record among a product's rows.
     *
     * A product priced as a whole has one row with a null `variant_id`; a
     * product whose variants are costed separately has one per variant. The
     * newest answers the question the publication gate actually asks — «has
     * anybody looked at this product's economics recently» — which the oldest
     * cannot.
     */
    async supplyFor(productId: string) {
      if (!sb) return null;
      try {
        const { data, error } = await sb
          .from('store_supply')
          .select('*')
          .eq('product_id', productId)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (error || !data?.length) return null;
        return toSupplyRecord(data[0] as Row);
      } catch (e) {
        console.error('[admin] supplyFor threw', e);
        return null;
      }
    },

    /**
     * Append to the audit log. Never throws, and never blocks the operation.
     *
     * A failed audit write must not undo a completed action — a ban that was
     * applied and then rolled back because logging failed leaves an abuser
     * unbanned for a reason nobody will ever find. So the failure goes to
     * `console` and the caller carries on. The log is append-only and has NO
     * client policy at all, so this is the only path into it.
     */
    appendAudit: entry => appendAuditTo(sb, entry),

    async listReports(state) {
      if (!sb) return [];
      try {
        let q = sb.from('reports').select('*').order('created_at', { ascending: false }).limit(200);
        if (state) q = q.eq('state', state);
        const { data, error } = await q;
        if (error || !data) return [];
        return (data as Row[]).map(r => ({
          id: String(r.id),
          targetType: String(r.target_type),
          targetId: String(r.target_id),
          reason: String(r.reason),
          state: String(r.state),
          createdAt: typeof r.created_at === 'string' ? r.created_at : null,
        }));
      } catch (e) {
        console.error('[admin] listReports threw', e);
        return [];
      }
    },
  };
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Append to the audit log. Never throws, and never blocks the operation.
 *
 * A failed audit write must not undo a completed action — a ban that was
 * applied and then rolled back because logging failed leaves an abuser
 * unbanned for a reason nobody will ever find. So the failure goes to
 * `console` and the caller carries on. The log is append-only and has NO
 * client policy at all, so this module is the only path into it.
 *
 * A MODULE FUNCTION, NOT A METHOD ON THE PORT. Every operation above logs, and
 * calling `this.appendAudit()` would work right up until somebody wrote
 * `const { setUserRole } = adminBackend()` — at which point `this` is
 * undefined and a role change throws instead of being recorded. Destructuring
 * a port is a completely reasonable thing to do; a port whose methods break
 * when you do it is the one that is wrong.
 */
async function appendAuditTo(
  sb: SupabaseClient | null,
  entry: {
    actorId: string | null; action: string; targetType: string;
    targetId?: string; summary?: string; metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!sb) return;
  try {
    await sb.from('audit_log').insert({
      actor_id: entry.actorId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      summary: entry.summary ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.error('[admin] appendAudit failed', entry.action, e);
  }
}


/** `bigint` and `numeric` arrive as strings when the driver refuses to round. */
function numeric(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/**
 * The shipping cost for a region and a basket, or `null` if we do not ship there.
 *
 * `null` is «refuse the order», not «free». A region row that is missing or
 * inactive means the shop has never worked out what it costs to send a parcel
 * there, and quoting zero would have it discover the answer by losing money.
 */
async function quoteShipping(
  sb: SupabaseClient, regionId: string | null, subtotalMinor: number,
): Promise<number | null> {
  if (!regionId) return null;
  const { data } = await sb
    .from('shipping_regions').select('*').eq('id', regionId).eq('active', true).maybeSingle();
  if (!data) return null;

  const row = data as Row;
  const freeOver = numeric(row.free_over_minor);
  if (freeOver !== null && subtotalMinor >= freeOver) return 0;
  return numeric(row.base_minor) ?? 0;
}

export type { OrderSummary };
