import type { SupabaseClient } from '@supabase/supabase-js';

import { NOT_CONFIGURED_AR, isSupabaseConfigured } from './env';
import { toRole, type Row } from './rows';
import type { AuthPort, SessionUser } from '../ports';

/**
 * The auth adapter — «who is asking», on either side of the wire.
 *
 * ONE IMPLEMENTATION, TWO CLIENTS
 * ===============================
 * This is a factory over a `SupabaseClient`, not a module that builds one. The
 * browser hands it a `createBrowserClient`, the server hands it a
 * `createServerClient` bound to the request's cookies, and the logic below is
 * identical because it is the same question either way. Writing it twice is
 * how the two surfaces come to disagree about who someone is — which is the
 * failure `lib/server/session.ts` documents having already survived once.
 *
 * WHERE THE ROLE COMES FROM, AND WHY NOT THE JWT
 * ==============================================
 * `public.profiles.role`, re-read on every call. Never a custom claim.
 *
 * This is the same decision the Firebase session made, kept deliberately:
 *
 *   • A claim is minted when a token is issued and is then FROZEN until it
 *     expires. Demoting a moderator would take effect whenever their token
 *     happened to refresh — up to an hour of a revoked moderator still being
 *     one, on the only surface where it matters.
 *   • The profile row is what `0002`'s `is_admin()` and `is_staff()` read when
 *     they decide what the database will permit. Reading anything ELSE here
 *     would give the UI a second opinion about the caller's powers, and two
 *     authorities that can disagree is precisely the bug.
 *
 * So the database and the interface answer from one field, and a role revoked a
 * second ago is gone a second ago.
 *
 * A BANNED ACCOUNT HAS NO ROLE
 * ============================
 * `status = 'banned'` collapses the effective role to `user` before the value
 * leaves this function. Banning a staff account therefore removes its powers in
 * the same write that stops it posting, with no second field to keep in step —
 * and `0002` enforces the same collapse independently, in SQL.
 *
 * NOTHING HERE THROWS
 * ===================
 * Every failure — no session, expired session, unreachable project, missing
 * configuration — becomes `null`, which is the safe reading of all of them.
 * `currentUser()` is called during server rendering of pages that are perfectly
 * happy to be anonymous; a throw there takes the page down.
 */

export function makeAuth(sb: SupabaseClient | null): AuthPort {
  return {
    async currentUser(): Promise<SessionUser | null> {
      if (!sb) return null;
      try {
        // `getUser()`, NOT `getSession()`. `getSession()` reads the cookie and
        // believes it; `getUser()` asks the Auth server whether the token is
        // still valid, which is the difference between a session that has been
        // revoked and one that merely looks unexpired. On the server that
        // distinction is the whole point of checking at all.
        const { data, error } = await sb.auth.getUser();
        if (error || !data.user) return null;

        const { data: profile } = await sb
          .from('profiles')
          .select('role, status, display_name, photo_url')
          .eq('id', data.user.id)
          .maybeSingle();

        const p = (profile ?? {}) as Row;
        const status = p.status === 'banned' ? 'banned' : 'active';
        const role = toRole(p.role);

        return {
          id: data.user.id,
          email: data.user.email ?? null,
          emailVerified: Boolean(data.user.email_confirmed_at),
          role: status === 'banned' ? 'user' : role,
          status,
          displayName: typeof p.display_name === 'string' ? p.display_name : null,
          photoURL: typeof p.photo_url === 'string' ? p.photo_url : null,
        };
      } catch {
        return null;
      }
    },

    async signInWithPassword(email, password) {
      if (!sb || !isSupabaseConfigured()) return { ok: false, errorAr: NOT_CONFIGURED_AR };
      const { error } = await sb.auth.signInWithPassword({ email, password });
      // ONE SENTENCE FOR BOTH FAILURES, ON PURPOSE. Distinguishing «no such
      // account» from «wrong password» turns the sign-in form into a tool for
      // discovering which addresses are registered here.
      return error
        ? { ok: false, errorAr: 'البريد أو كلمة المرور غير صحيحة.' }
        : { ok: true };
    },

    async signUpWithPassword(email, password, displayName) {
      if (!sb || !isSupabaseConfigured()) return { ok: false, errorAr: NOT_CONFIGURED_AR };
      const { error } = await sb.auth.signUp({
        email,
        password,
        // `data` lands in `raw_user_meta_data`. The profile row itself is
        // created by a database trigger on `auth.users`, not from here: a
        // client that had to insert its own profile could choose not to, and
        // an account with no profile row has no role, which `0002` reads as no
        // permissions and the UI reads as a broken account.
        options: { data: { display_name: displayName } },
      });
      if (!error) return { ok: true };
      // A duplicate address is the one signup failure worth naming, because the
      // fix is «sign in instead» and the address is already known to whoever is
      // typing it.
      const dup = /already|registered|exists/i.test(error.message);
      return {
        ok: false,
        errorAr: dup
          ? 'هذا البريد مسجَّل بالفعل. سجّل الدخول بدلاً من إنشاء حساب.'
          : 'تعذّر إنشاء الحساب. تحقّق من البريد وكلمة المرور وحاول مرة أخرى.',
      };
    },

    async resetPassword(email, redirectTo) {
      if (!sb || !isSupabaseConfigured()) return { ok: false, errorAr: NOT_CONFIGURED_AR };
      try {
        // The error is NOT surfaced as «no such account». Supabase itself
        // answers success for unknown addresses for the same reason; only a
        // transport failure is worth telling the user about.
        await sb.auth.resetPasswordForEmail(email, { redirectTo });
        return { ok: true };
      } catch {
        return { ok: false, errorAr: 'تعذّر الإرسال. تحقّق من اتصالك وحاول مرة أخرى.' };
      }
    },

    async signInWithProvider(provider, redirectTo) {
      if (!sb || !isSupabaseConfigured()) return { ok: false, errorAr: NOT_CONFIGURED_AR };
      const { data, error } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      return error
        ? { ok: false, errorAr: 'تعذّر تسجيل الدخول عبر جوجل. حاول مرة أخرى.' }
        : { ok: true, url: data?.url ?? undefined };
    },

    async signOut() {
      if (!sb) return;
      // Swallowed deliberately: signing out must always LOOK like it worked.
      // A user who is told «تعذّر تسجيل الخروج» on a shared machine is a user
      // who walks away from a session they believe is closed.
      try { await sb.auth.signOut(); } catch { /* nothing to recover from */ }
    },
  };
}
