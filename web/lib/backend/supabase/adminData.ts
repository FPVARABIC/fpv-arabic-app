import 'server-only';

import { serviceClient, isServiceConfigured } from './service';
import { toIso } from './rows';

/**
 * The privileged DATA layer — every read and write the web's server modules
 * make on the secret key, as named, typed operations.
 *
 * WHY THIS EXISTS INSTEAD OF HANDING MODULES THE CLIENT
 * =====================================================
 * The SDK stays confined to `lib/backend/supabase/` — the same boundary every
 * page observes, held by `scripts/testBackendAdapter.ts`. The server modules
 * (`lib/server/admin.ts`, the store, payments, audit) keep their DECISION
 * logic — capabilities, rank checks, transitions, audit ordering — and call
 * down here for the data. A module that held the raw client would grow ad-hoc
 * queries nobody can enumerate; this file is the enumeration.
 *
 * Firestore was used as a JSON document store, and the web's contracts are
 * document-shaped — so much of this layer is document operations against
 * `store_docs` (0007) plus row operations against the relational community
 * and audit tables.
 *
 * EVERYTHING HERE BYPASSES RLS. That is what the service role is. Each
 * function therefore does exactly what its name says and nothing broader, and
 * new ones are added by name — never by exposing a query builder.
 *
 * Errors THROW (except where noted): the callers are privileged server paths
 * with their own error translation, and a silent null where a write failed
 * would let an admin believe an action happened that did not.
 */

export { isServiceConfigured };

function sb() {
  const c = serviceClient();
  if (!c) throw new Error('SUPABASE_SECRET_KEY is not configured');
  return c;
}

type Json = Record<string, unknown>;

/* ── Profiles ─────────────────────────────────────────────────────────────── */

export interface ProfileRow {
  uid: string;
  role: string;
  status: string;
  displayName: string | null;
  photoURL: string | null;
  displayNameNormalized: string | null;
  createdAt: string | null;
}

function toProfileRow(d: Json): ProfileRow {
  return {
    uid: String(d.id ?? ''),
    role: typeof d.role === 'string' ? d.role : 'user',
    status: d.status === 'banned' ? 'banned' : 'active',
    displayName: typeof d.display_name === 'string' ? d.display_name : null,
    photoURL: typeof d.photo_url === 'string' ? d.photo_url : null,
    displayNameNormalized: typeof d.display_name_normalized === 'string' ? d.display_name_normalized : null,
    createdAt: toIso(d.created_at),
  };
}

export async function getProfileRow(uid: string): Promise<ProfileRow | null> {
  const { data, error } = await sb().from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProfileRow(data as Json) : null;
}

/** The Auth record's email. Null when the account has none or cannot be read. */
export async function getAuthEmail(uid: string): Promise<string | null> {
  try {
    const { data } = await sb().auth.admin.getUserById(uid);
    return data.user?.email ?? null;
  } catch {
    // A profile can exist without a reachable Auth record in a test fixture.
    // A missing email is not a reason to refuse an administrative action.
    return null;
  }
}

export async function updateProfileFields(
  uid: string,
  patch: Partial<{ role: string; status: string; display_name: string | null; photo_url: string | null }>,
): Promise<void> {
  const { error, data } = await sb().from('profiles').update(patch).eq('id', uid).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('profile not found');
}

export async function countOwners(): Promise<number> {
  const { count, error } = await sb()
    .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listProfileRows(opts: {
  limit?: number;
  status?: 'banned';
  role?: string;
  /** Prefix match on the normalized display name. */
  namePrefix?: string;
} = {}): Promise<ProfileRow[]> {
  let q = sb().from('profiles').select('*').order('created_at', { ascending: false });
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.role) q = q.eq('role', opts.role);
  if (opts.namePrefix) q = q.like('display_name_normalized', `${escapeLike(opts.namePrefix)}%`);
  const { data, error } = await q.limit(Math.min(opts.limit ?? 50, 200));
  if (error) throw new Error(error.message);
  return (data as Json[]).map(toProfileRow);
}

export async function countProfiles(opts: { status?: 'banned' } = {}): Promise<number> {
  let q = sb().from('profiles').select('id', { count: 'exact', head: true });
  if (opts.status) q = q.eq('status', opts.status);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** `%`/`_` are wildcards to LIKE; a search string is data, not pattern. */
function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, c => `\\${c}`);
}

/* ── Community rows (moderation) ──────────────────────────────────────────── */

export interface PostRow {
  id: string;
  authorId: string;
  status: string;
  mediaType: string;
  text: string;
  createdAt: string | null;
}

export async function getPostRow(postId: string): Promise<PostRow | null> {
  const { data, error } = await sb().from('posts').select('*').eq('id', postId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const d = data as Json;
  return {
    id: String(d.id),
    authorId: String(d.author_id ?? ''),
    status: typeof d.status === 'string' ? d.status : 'active',
    mediaType: typeof d.media_type === 'string' ? d.media_type : 'none',
    text: typeof d.text === 'string' ? d.text : '',
    createdAt: toIso(d.created_at),
  };
}

export async function setPostStatus(postId: string, status: string): Promise<void> {
  const { error, data } = await sb().from('posts').update({ status }).eq('id', postId).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('post not found');
}

export async function clearPostMedia(postId: string): Promise<void> {
  const { error } = await sb().from('posts').update({
    media_type: 'none', media_url: null, thumbnail_url: null,
    media_width: null, media_height: null, media_duration: null,
  }).eq('id', postId);
  if (error) throw new Error(error.message);
}

export async function listPostRows(opts: { status?: string; authorId?: string; limit?: number } = {}): Promise<PostRow[]> {
  let q = sb().from('posts').select('*').order('created_at', { ascending: false });
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.authorId) q = q.eq('author_id', opts.authorId);
  const { data, error } = await q.limit(Math.min(opts.limit ?? 50, 200));
  if (error) throw new Error(error.message);
  return (data as Json[]).map(d => ({
    id: String(d.id),
    authorId: String(d.author_id ?? ''),
    status: typeof d.status === 'string' ? d.status : 'active',
    mediaType: typeof d.media_type === 'string' ? d.media_type : 'none',
    text: typeof d.text === 'string' ? d.text : '',
    createdAt: toIso(d.created_at),
  }));
}

export interface CommentRow {
  id: string;
  postId: string;
  authorId: string;
  status: string;
  text: string;
}

export async function getCommentRow(commentId: string): Promise<CommentRow | null> {
  const { data, error } = await sb().from('comments').select('*').eq('id', commentId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const d = data as Json;
  return {
    id: String(d.id),
    postId: String(d.post_id ?? ''),
    authorId: String(d.author_id ?? ''),
    status: typeof d.status === 'string' ? d.status : 'active',
    text: typeof d.text === 'string' ? d.text : '',
  };
}

export async function setCommentStatus(commentId: string, status: string): Promise<void> {
  const { error, data } = await sb().from('comments').update({ status }).eq('id', commentId).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('comment not found');
}

/* ── Reports ──────────────────────────────────────────────────────────────── */

export interface ReportRowData {
  id: string;
  targetType: string;
  targetId: string;
  reporterId: string | null;
  reason: string;
  detail: string | null;
  state: string;
  handledBy: string | null;
  handledAt: string | null;
  resolutionNote: string | null;
  createdAt: string | null;
}

function toReportRow(d: Json): ReportRowData {
  return {
    id: String(d.id),
    targetType: String(d.target_type ?? ''),
    targetId: String(d.target_id ?? ''),
    reporterId: typeof d.reporter_id === 'string' ? d.reporter_id : null,
    reason: String(d.reason ?? ''),
    detail: typeof d.detail === 'string' ? d.detail : null,
    state: String(d.state ?? 'open'),
    handledBy: typeof d.handled_by === 'string' ? d.handled_by : null,
    handledAt: toIso(d.handled_at),
    resolutionNote: typeof d.resolution_note === 'string' ? d.resolution_note : null,
    createdAt: toIso(d.created_at),
  };
}

export async function getReportRow(reportId: string): Promise<ReportRowData | null> {
  const { data, error } = await sb().from('reports').select('*').eq('id', reportId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toReportRow(data as Json) : null;
}

export async function listReportRows(opts: {
  states?: string[]; targetIds?: string[]; limit?: number;
} = {}): Promise<ReportRowData[]> {
  let q = sb().from('reports').select('*').order('created_at', { ascending: false });
  if (opts.states?.length) q = q.in('state', opts.states);
  if (opts.targetIds?.length) q = q.in('target_id', opts.targetIds);
  const { data, error } = await q.limit(Math.min(opts.limit ?? 50, 500));
  if (error) throw new Error(error.message);
  return (data as Json[]).map(toReportRow);
}

export async function updateReportRow(
  reportId: string,
  patch: Partial<{ state: string; handled_by: string | null; handled_at: string; resolution_note: string | null }>,
): Promise<void> {
  const { error, data } = await sb().from('reports').update(patch).eq('id', reportId).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('report not found');
}

export async function countReports(states: string[]): Promise<number> {
  const { count, error } = await sb()
    .from('reports').select('id', { count: 'exact', head: true }).in('state', states);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countPosts(status: string): Promise<number> {
  const { count, error } = await sb()
    .from('posts').select('id', { count: 'exact', head: true }).eq('status', status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/* ── Audit ────────────────────────────────────────────────────────────────── */

/**
 * The relational half is what gets filtered (actor, target, action, time);
 * everything richer — capabilities snapshot, before/after, request id, result
 * — rides in `metadata`, because those are evidence to display, not axes to
 * query.
 */
export async function insertAuditRow(row: {
  actorId: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string | null;
  metadata: Json;
}): Promise<string> {
  const { data, error } = await sb().from('audit_log').insert({
    actor_id: row.actorId,
    actor_role: row.actorRole,
    action: row.action,
    target_type: row.targetType,
    target_id: row.targetId,
    summary: row.summary,
    metadata: row.metadata,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return String((data as Json).id);
}

/** Amend an entry's metadata (the result/error half). Append-only otherwise. */
export async function amendAuditMetadata(entryId: string, patch: Json): Promise<void> {
  const { data, error } = await sb()
    .from('audit_log').select('metadata').eq('id', entryId).maybeSingle();
  if (error) throw new Error(error.message);
  const merged = { ...((data as Json | null)?.metadata as Json ?? {}), ...patch };
  const { error: e2 } = await sb().from('audit_log').update({ metadata: merged }).eq('id', entryId);
  if (e2) throw new Error(e2.message);
}

export interface AuditRow {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string | null;
  metadata: Json;
  createdAt: string | null;
}

export async function listAuditRows(opts: {
  limit?: number; actorId?: string; targetId?: string; action?: string;
} = {}): Promise<AuditRow[]> {
  let q = sb().from('audit_log').select('*').order('created_at', { ascending: false });
  if (opts.actorId) q = q.eq('actor_id', opts.actorId);
  else if (opts.targetId) q = q.eq('target_id', opts.targetId);
  else if (opts.action) q = q.eq('action', opts.action);
  const { data, error } = await q.limit(Math.min(Math.max(opts.limit ?? 50, 1), 200));
  if (error) throw new Error(error.message);
  return (data as Json[]).map(d => ({
    id: String(d.id),
    actorId: typeof d.actor_id === 'string' ? d.actor_id : '',
    actorRole: typeof d.actor_role === 'string' ? d.actor_role : 'user',
    action: String(d.action ?? ''),
    targetType: String(d.target_type ?? ''),
    targetId: typeof d.target_id === 'string' ? d.target_id : '',
    summary: typeof d.summary === 'string' ? d.summary : null,
    metadata: (d.metadata ?? {}) as Json,
    createdAt: toIso(d.created_at),
  }));
}

/* ── Store documents ──────────────────────────────────────────────────────── */

export type StoreCollection =
  | 'storeProducts' | 'storeShippingZones' | 'storeSettings'
  | 'storeSupply' | 'storeDecisions';

export async function getStoreDoc(collection: StoreCollection, id: string): Promise<Json | null> {
  const { data, error } = await sb()
    .from('store_docs').select('doc').eq('collection', collection).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? ((data as Json).doc as Json) : null;
}

export async function listStoreDocs(collection: StoreCollection): Promise<Record<string, Json>> {
  const { data, error } = await sb()
    .from('store_docs').select('id, doc').eq('collection', collection);
  if (error) throw new Error(error.message);
  const out: Record<string, Json> = {};
  for (const row of data as Json[]) out[String(row.id)] = (row.doc ?? {}) as Json;
  return out;
}

/**
 * Merge-set, like Firestore's `set(..., {merge:true})` — the panel's idiom.
 *
 * The merge is DEEP, because Firestore's was and a caller depends on it: the
 * supply screen writes `variantState: { [oneVariant]: {...} }` and a shallow
 * spread would silently wipe every OTHER variant's stored price — the kind of
 * data loss nobody notices until a basket refuses a product that was priced
 * yesterday. Arrays replace wholesale, exactly as Firestore's merge does.
 */
function isPlainObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function deepMerge(base: Json, patch: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isPlainObject(v) && isPlainObject(base[k])
      ? deepMerge(base[k] as Json, v)
      : v;
  }
  return out;
}

export async function mergeStoreDoc(
  collection: StoreCollection, id: string, patch: Json, updatedBy: string | null,
): Promise<void> {
  const existing = await getStoreDoc(collection, id);
  const { error } = await sb().from('store_docs').upsert({
    collection, id, doc: deepMerge(existing ?? {}, patch), updated_by: updatedBy,
  });
  if (error) throw new Error(error.message);
}

export async function setStoreDoc(
  collection: StoreCollection, id: string, doc: Json, updatedBy: string | null,
): Promise<void> {
  const { error } = await sb().from('store_docs').upsert({ collection, id, doc, updated_by: updatedBy });
  if (error) throw new Error(error.message);
}

/* ── Project overrides ────────────────────────────────────────────────────── */

export async function listProjectOverrides(): Promise<Record<string, { published?: boolean; patch: Json }>> {
  const { data, error } = await sb().from('project_overrides').select('*');
  if (error) throw new Error(error.message);
  const out: Record<string, { published?: boolean; patch: Json }> = {};
  for (const row of data as Json[]) {
    out[String(row.id)] = {
      published: typeof row.published === 'boolean' ? row.published : undefined,
      patch: (row.patch ?? {}) as Json,
    };
  }
  return out;
}

/** Merge a partial edit over the stored project document, Firestore-style. */
export async function mergeProjectOverride(
  id: string,
  patch: Json,
  updatedBy: string | null,
): Promise<void> {
  const all = await listProjectOverrides();
  const existing = all[id];
  const mergedPatch = deepMerge(existing?.patch ?? {}, patch);
  // `published` rides inside the document AND mirrors into its own column so
  // policies and indexes can see it without opening the JSON.
  const published = typeof mergedPatch.published === 'boolean'
    ? mergedPatch.published
    : existing?.published;
  await setProjectOverride(id, { published, patch: mergedPatch }, updatedBy);
}

export async function setProjectOverride(
  id: string,
  value: { published?: boolean; patch: Json },
  updatedBy: string | null,
): Promise<void> {
  const { error } = await sb().from('project_overrides').upsert({
    id,
    published: value.published ?? null,
    patch: value.patch,
    updated_by: updatedBy,
  });
  if (error) throw new Error(error.message);
}

/* ── Orders ───────────────────────────────────────────────────────────────── */

/**
 * The relational spine is written FROM the document, in one statement, by this
 * one writer — which is what keeps the two halves from disagreeing.
 */
export async function insertOrderDoc(doc: Json & {
  customerUid: string;
  status: string;
  itemsTotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
}): Promise<string> {
  const { data, error } = await sb().from('orders').insert({
    reference: newOrderReference(),
    user_id: doc.customerUid,
    subtotal_minor: doc.itemsTotalMinor,
    shipping_minor: doc.shippingMinor,
    total_minor: doc.totalMinor,
    currency: doc.currency,
    payment_state: 'draft',
    fulfilment: doc.status,
    doc,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return String((data as Json).id);
}

/**
 * `FPV-<base36 time>-<4 random>`: short enough to read down a phone line, and
 * NOT sequential — a sequential reference tells every customer the shop's
 * volume. Collisions are caught by the column's `unique`, not by trusting the
 * entropy.
 */
function newOrderReference(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `FPV-${t}-${r}`;
}

export interface OrderDocRow {
  id: string;
  doc: Json;
  paymentState: string;
  fulfilment: string;
  reference: string;
  createdAt: string | null;
}

function toOrderDocRow(d: Json): OrderDocRow {
  return {
    id: String(d.id),
    doc: (d.doc ?? {}) as Json,
    paymentState: String(d.payment_state ?? 'draft'),
    fulfilment: String(d.fulfilment ?? 'received'),
    reference: String(d.reference ?? ''),
    createdAt: toIso(d.created_at),
  };
}

export async function getOrderDoc(orderId: string): Promise<OrderDocRow | null> {
  const { data, error } = await sb().from('orders').select('*').eq('id', orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toOrderDocRow(data as Json) : null;
}

export async function listOrderDocs(opts: { fulfilment?: string; userId?: string; limit?: number } = {}): Promise<OrderDocRow[]> {
  let q = sb().from('orders').select('*').order('created_at', { ascending: false });
  if (opts.fulfilment) q = q.eq('fulfilment', opts.fulfilment);
  if (opts.userId) q = q.eq('user_id', opts.userId);
  const { data, error } = await q.limit(Math.min(opts.limit ?? 50, 200));
  if (error) throw new Error(error.message);
  return (data as Json[]).map(toOrderDocRow);
}

/** Patch the document and keep the spine's columns in step, in one statement. */
export async function updateOrderDoc(
  orderId: string,
  docPatch: Json,
  spine: Partial<{ fulfilment: string; payment_state: string }> = {},
): Promise<void> {
  const current = await getOrderDoc(orderId);
  if (!current) throw new Error('order not found');
  const { error } = await sb().from('orders').update({
    doc: { ...current.doc, ...docPatch },
    ...spine,
  }).eq('id', orderId);
  if (error) throw new Error(error.message);
}

/* ── Payments ─────────────────────────────────────────────────────────────── */

export async function getPaymentDoc(providerRef: string): Promise<Json | null> {
  const { data, error } = await sb()
    .from('store_payments').select('doc').eq('id', providerRef).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? ((data as Json).doc as Json) : null;
}

export async function setPaymentDoc(
  providerRef: string, orderId: string, state: string, doc: Json,
): Promise<void> {
  const { error } = await sb().from('store_payments').upsert({
    id: providerRef, order_id: orderId, state, doc,
  });
  if (error) throw new Error(error.message);
}

export async function mergePaymentDoc(providerRef: string, patch: Json, state?: string): Promise<void> {
  const existing = await getPaymentDoc(providerRef);
  if (existing === null) throw new Error('payment not found');
  const { error } = await sb().from('store_payments')
    .update({ doc: { ...existing, ...patch }, ...(state ? { state } : {}) })
    .eq('id', providerRef);
  if (error) throw new Error(error.message);
}

export async function listPaymentDocsForOrder(orderId: string): Promise<Json[]> {
  const { data, error } = await sb()
    .from('store_payments').select('doc').eq('order_id', orderId);
  if (error) throw new Error(error.message);
  return (data as Json[]).map(d => (d.doc ?? {}) as Json);
}

export async function listOpenPaymentDocs(states: string[]): Promise<Json[]> {
  const { data, error } = await sb()
    .from('store_payments').select('doc').in('state', states);
  if (error) throw new Error(error.message);
  return (data as Json[]).map(d => (d.doc ?? {}) as Json);
}

/* ── Storage (service key) ────────────────────────────────────────────────── */

/**
 * Product and project photography — written by the SERVER because the panel's
 * authority is a verified session holding a capability, not a storage policy
 * re-deriving that as a role check.
 */
export async function uploadServiceObject(
  bucket: string, path: string, bytes: ArrayBuffer | Uint8Array, contentType: string,
): Promise<void> {
  const body = bytes instanceof Uint8Array
    ? bytes.slice().buffer as ArrayBuffer
    : bytes;
  const { error } = await sb().storage.from(bucket).upload(path, body, {
    contentType,
    // The panel re-uploads a product's photo under the same name on purpose.
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

export async function deleteServiceObjects(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await sb().storage.from(bucket).remove(paths);
  if (error) throw new Error(error.message);
}

/** Delete everything under a prefix. Returns how many objects went. */
export async function deleteServicePrefix(bucket: string, prefix: string): Promise<number> {
  const { data, error } = await sb().storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(error.message);
  const paths = (data ?? []).map(o => `${prefix}/${o.name}`);
  await deleteServiceObjects(bucket, paths);
  return paths.length;
}
