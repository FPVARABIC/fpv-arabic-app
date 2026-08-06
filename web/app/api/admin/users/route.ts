import { NextResponse } from 'next/server';
import { requireCapability, ForbiddenError } from '@/lib/server/session';
import { listProfileRows } from '@/lib/backend/supabase/adminData';
import { toRole, ROLE_LABEL_AR } from '@core/data/auth/roles';

/**
 * GET /api/admin/users — the user list, for the admin surface.
 *
 * THE SHAPE OF EVERY PRIVILEGED ROUTE IN THIS APP
 * -----------------------------------------------
 * `requireCapability()` is the FIRST statement. It verifies the session with
 * the Auth server, re-reads the role from the profiles table, and throws
 * before a single row is read if the caller lacks the capability. Calling it first is not
 * a style preference: a check placed after the query has already leaked the
 * data it was meant to protect.
 *
 * This route is reachable directly with curl. That is precisely why the guard
 * lives here and not in the page component — hiding the UI would leave this
 * endpoint wide open, which is the exact failure the requirement named.
 *
 * WHAT IS RETURNED
 * ----------------
 * Only what the admin surface needs to render a row. Deliberately NOT returned:
 * the whole user document, tokens, device ids, or anything about the user's
 * private project. An admin list is not a licence to read everything.
 */
export async function GET(request: Request) {
  try {
    await requireCapability('users.list');

    const url = new URL(request.url);
    const rawQ = (url.searchParams.get('q') ?? '').trim().slice(0, 60);
    // Bounded, and bounded again at the top: an unbounded limit is a cost and
    // memory amplifier a caller should not control.
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 25), 1), 100);

    // Prefix match on the normalised name the community layer already
    // maintains — reusing that field rather than adding a second one.
    const rows = await listProfileRows({
      namePrefix: rawQ ? rawQ.toLowerCase() : undefined,
      limit,
    });
    const users = rows.map(r => {
      const role = toRole(r.role);
      return {
        uid: r.uid,
        displayName: r.displayName,
        photoURL: r.photoURL,
        role,
        roleLabelAr: ROLE_LABEL_AR[role],
        status: r.status === 'banned' ? 'banned' : 'active',
        // Counted on the detail screen where it matters; a list row does not
        // pay one count query per user.
        postsCount: 0,
      };
    });

    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    // Never echo an internal error to the caller: stack traces and database
    // messages disclose structure that helps an attacker.
    console.error('[admin/users]', e);
    return NextResponse.json({ error: 'تعذّر تنفيذ الطلب' }, { status: 500 });
  }
}
