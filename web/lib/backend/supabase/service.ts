import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_URL } from './env';

/**
 * The ONE service-role client, shared by the two privileged modules.
 *
 * Split out of `admin.ts` when `adminData.ts` arrived, so the secret key is
 * still read in exactly one place per concern — `SUPABASE_SECRET_KEY` appears
 * here and nowhere else — and both consumers stay `server-only`. The
 * memoisation is safe for exactly the reason the cookie-bound client's would
 * not be: this client carries NO session, so there is nothing request-scoped
 * to leak between concurrent requests.
 */

const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? '';

/**
 * Are the server credentials present? Answers «is the variable set», not
 * «does it work» — a wrong key fails at the first call, which every caller
 * already handles.
 */
export function isServiceConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SECRET_KEY.length > 0;
}

let cached: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient | null {
  if (!isServiceConfigured()) return null;
  if (!cached) {
    cached = createClient(SUPABASE_URL, SECRET_KEY, {
      auth: {
        // This client is not a user: no session to persist, nothing to
        // refresh, no URL to parse. Leaving these on would have it write
        // tokens into a storage that does not exist on a server.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return cached;
}
