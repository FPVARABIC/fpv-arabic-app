import 'server-only';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSession, ForbiddenError, type Session } from './session';
import { newRequestId, logDenied, logAudit, actorFromSession } from './audit';
import { can } from '@core/data/auth/roles';
import { AdminError } from './admin';
import type { Capability } from '@core/data/auth/roles';

/**
 * The shape every administrative endpoint has, in one place.
 *
 * WHY A WRAPPER RATHER THAN A CONVENTION
 * --------------------------------------
 * Because "remember to check the capability first" is not a security control —
 * it is a hope. Every route below is written as `POST = adminRoute('users.ban',
 * schema, handler)`, and the handler is not called at all until the session is
 * verified, the capability is held, the method and content type are right, and
 * the body has passed a field allow-list. A route physically cannot skip a step
 * that it does not perform itself.
 *
 * WHAT IS ENFORCED HERE
 * ---------------------
 *   - POST only. State-changing work never happens on GET, so a prefetch, an
 *     image tag or a link cannot trigger it.
 *   - `Content-Type: application/json`. A form-encoded or text/plain body is
 *     exactly what a cross-site form submission can send, and refusing it is a
 *     large part of why CSRF cannot reach these endpoints.
 *   - Same-origin. The session cookie is SameSite=Lax, which already prevents a
 *     cross-site POST from carrying it; the Origin check is the second lock, so
 *     the protection does not rest on one browser behaviour alone.
 *   - A field allow-list. Unknown keys are a hard error rather than being
 *     ignored, because a silently-dropped `role` field is how a caller comes to
 *     believe it did something it did not.
 *   - A request id on every response and in every audit entry it produces.
 *   - No internal error ever reaches the caller. A stack trace or a Firestore
 *     message describes the system to someone probing it.
 */

export interface FieldSpec {
  type: 'string' | 'boolean';
  required?: boolean;
  maxLength?: number;
  /** Exact set of permitted values, for enums. */
  oneOf?: readonly string[];
}

export type BodySchema = Record<string, FieldSpec>;

export class BadRequestError extends Error {
  readonly status = 400;
  readonly code = 'invalid_input';
}

/**
 * Parse and validate a JSON body against an explicit field list.
 *
 * Rejects unknown keys outright. That is stricter than ignoring them and it is
 * the point: an endpoint that accepts `{uid, role, isOwner: true}` and silently
 * drops the third field looks, to whoever wrote the caller, exactly like an
 * endpoint that honoured it.
 */
export function parseBody<T extends Record<string, unknown>>(
  raw: unknown, schema: BodySchema,
): T {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BadRequestError('صيغة الطلب غير صحيحة');
  }
  const body = raw as Record<string, unknown>;

  for (const key of Object.keys(body)) {
    if (!(key in schema)) {
      throw new BadRequestError(`حقل غير مسموح: ${key}`);
    }
  }

  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema)) {
    const v = body[key];
    if (v === undefined || v === null) {
      if (spec.required) throw new BadRequestError(`حقل مطلوب ناقص: ${key}`);
      out[key] = null;
      continue;
    }
    if (spec.type === 'string') {
      if (typeof v !== 'string') throw new BadRequestError(`نوع غير صحيح للحقل: ${key}`);
      const trimmed = v.trim();
      if (spec.required && !trimmed) throw new BadRequestError(`حقل مطلوب فارغ: ${key}`);
      if (spec.maxLength && trimmed.length > spec.maxLength) {
        throw new BadRequestError(`الحقل أطول من المسموح: ${key}`);
      }
      if (spec.oneOf && !spec.oneOf.includes(trimmed)) {
        throw new BadRequestError(`قيمة غير مسموحة للحقل: ${key}`);
      }
      out[key] = trimmed;
    } else {
      if (typeof v !== 'boolean') throw new BadRequestError(`نوع غير صحيح للحقل: ${key}`);
      out[key] = v;
    }
  }
  return out as T;
}

/**
 * Confirm the request came from this site.
 *
 * Compares Origin (or Referer, which some browsers send instead on same-origin
 * POSTs) against the Host the request actually arrived on, rather than against
 * a configured URL — a configured value goes stale across environments and then
 * gets disabled by whoever is debugging it at 2am.
 */
async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const host = h.get('host');
  const origin = h.get('origin') ?? h.get('referer');
  if (!host) throw new ForbiddenError('طلب غير صالح', 400);
  // No Origin at all: not a browser form post, and not something a cross-site
  // page can produce with credentials. Non-browser callers (curl, tests) land
  // here, and they are already gated by the session cookie.
  if (!origin) return;
  try {
    if (new URL(origin).host !== host) {
      throw new ForbiddenError('مصدر الطلب غير مطابق', 403);
    }
  } catch (e) {
    if (e instanceof ForbiddenError) throw e;
    throw new ForbiddenError('مصدر الطلب غير صالح', 403);
  }
}

export interface AdminContext {
  session: Session;
  requestId: string;
}

export function adminRoute<T extends Record<string, unknown>>(
  capability: Capability,
  schema: BodySchema,
  handler: (input: T, ctx: AdminContext) => Promise<unknown>,
) {
  return async function POST(request: Request): Promise<NextResponse> {
    const requestId = newRequestId();
    try {
      // 1. Origin, before anything reads the body.
      await assertSameOrigin();

      // 2. Content type. A cross-site form cannot send application/json.
      const ct = request.headers.get('content-type') ?? '';
      if (!ct.toLowerCase().startsWith('application/json')) {
        throw new BadRequestError('Content-Type يجب أن يكون application/json');
      }

      // 3. Session AND capability, before a single document is read.
      //
      // Done here rather than through `requireCapability` so that a SIGNED-IN
      // caller who lacks the capability leaves an audit trail. That is the
      // "someone tried" signal an audit log is most often opened to find, and
      // it is available only at this point — the operation layer below never
      // runs for a caller the route turns away.
      //
      // An UNAUTHENTICATED caller is deliberately not logged: it needs no
      // credential, so anyone could fill the log with noise from a script.
      const session = await getSession();
      if (!session) throw new ForbiddenError('يلزم تسجيل الدخول', 401);
      if (session.status === 'banned') {
        throw new ForbiddenError('الحساب موقوف', 403);
      }
      if (!can(session.role, capability)) {
        await logDenied(actorFromSession(session), requestId, {
          action: 'user.role.assign',
          targetType: 'user',
          targetId: session.uid,
          error: `missing_capability:${capability}`,
          meta: { capability, path: new URL(request.url).pathname },
        });
        throw new ForbiddenError('لا تملك صلاحية هذا الإجراء', 403);
      }

      // 4. Shape.
      const raw = await request.json().catch(() => {
        throw new BadRequestError('تعذّر قراءة محتوى الطلب');
      });
      const input = parseBody<T>(raw, schema);

      // 5. Only now, the work.
      const result = await handler(input, { session, requestId });
      return NextResponse.json({ ok: true, requestId, result }, {
        headers: { 'x-request-id': requestId },
      });
    } catch (e) {
      return errorResponse(e, requestId);
    }
  };
}

export function errorResponse(e: unknown, requestId: string): NextResponse {
  if (e instanceof AdminError) {
    return NextResponse.json({ ok: false, requestId, code: e.code, error: e.message },
      { status: e.status, headers: { 'x-request-id': requestId } });
  }
  if (e instanceof BadRequestError) {
    return NextResponse.json({ ok: false, requestId, code: e.code, error: e.message },
      { status: e.status, headers: { 'x-request-id': requestId } });
  }
  if (e instanceof ForbiddenError) {
    return NextResponse.json({ ok: false, requestId, code: 'forbidden', error: e.message },
      { status: e.status, headers: { 'x-request-id': requestId } });
  }
  // Anything unrecognised: log it where operators can see it, and tell the
  // caller nothing about it.
  console.error(`[admin ${requestId}]`, e);
  return NextResponse.json({ ok: false, requestId, code: 'internal', error: 'تعذّر تنفيذ الطلب' },
    { status: 500, headers: { 'x-request-id': requestId } });
}

/* ── Server-action gating ─────────────────────────────────────────────────── */

/**
 * The gate every privileged server action starts with.
 *
 * WHY THIS EXISTS RATHER THAN TWO LINES PER ACTION
 * ------------------------------------------------
 * Because the two lines are `getSession()` and `sessionCan(...)`, and the
 * failure mode of writing them by hand is not writing them at all. A server
 * action is a POST endpoint with a friendly signature: anything exported from a
 * `'use server'` file is callable by anyone who can reach the site, whatever
 * the button that normally calls it renders as. An action that forgets its
 * check is not a hidden button — it is an open endpoint.
 *
 * It also AUDITS the refusal. A denied attempt to refund is exactly the event
 * somebody wants to find later, and an action that simply returns an error
 * leaves no trace that anyone tried.
 */
export type CapabilityGate =
  | { ok: true; session: Session }
  | { ok: false; errorAr: string };

export async function requireCapability(
  capability: Capability,
): Promise<CapabilityGate> {
  const session = await getSession();
  if (!session) return { ok: false, errorAr: 'سجّل الدخول أولاً.' };

  if (!can(session.role, capability)) {
    await logAudit(actorFromSession(session), newRequestId(), {
      action: 'store.settings',
      targetType: 'product',
      targetId: `capability:${capability}`,
      result: 'denied',
      error: `attempted an action requiring ${capability}`,
    });
    // The same sentence for «not signed in» and «not allowed» would be kinder
    // to an attacker than to a user; this one is honest without enumerating
    // what the capability is called.
    return { ok: false, errorAr: 'ليست لديك صلاحية تنفيذ هذا الإجراء.' };
  }

  return { ok: true, session };
}
