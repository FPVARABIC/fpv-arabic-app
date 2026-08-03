import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb, isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { SESSION_COOKIE } from '@/lib/server/session';

/**
 * The session exchange — where a browser's ID token becomes an httpOnly cookie.
 *
 * WHY THIS ENDPOINT EXISTS AT ALL
 * -------------------------------
 * Firebase Auth in the browser produces an ID token that lives in JavaScript.
 * That is fine for talking to Firestore from the client, and useless for
 * everything this platform needs: server-rendered pages cannot read it, the
 * middleware cannot see it, `/admin` cannot be refused before it renders, and
 * any XSS can read it straight out of storage.
 *
 * So the client hands its freshly-minted ID token here exactly once, and gets
 * back a cookie it cannot read. From then on the server knows who is asking on
 * every request, and a script on the page does not.
 *
 * THE COOKIE'S SETTINGS ARE THE SECURITY MODEL
 * --------------------------------------------
 *   httpOnly  — script cannot read it, so an XSS cannot steal the session
 *   secure    — never sent over plain HTTP in production
 *   sameSite  — 'lax', so a cross-site form POST cannot ride the session (CSRF)
 *               while an ordinary top-level navigation still arrives signed in
 *   maxAge    — bounded; a session cookie that never expires is a permanent key
 *   path '/'  — the whole site, because server rendering needs it everywhere
 *
 * WHAT IS VERIFIED BEFORE A COOKIE IS ISSUED
 * ------------------------------------------
 * The ID token's signature, its expiry, AND its freshness. The freshness check
 * matters: `createSessionCookie` will happily mint a long-lived cookie from an
 * hour-old token, which would let someone who captured a stale token turn it
 * into a fortnight of access. Requiring the token to be minutes old means the
 * user genuinely just authenticated.
 *
 * WHAT IS DELIBERATELY NOT DONE HERE
 * ----------------------------------
 * No role is read, granted or written. Roles come from `users/{uid}` and from
 * custom claims set by server-side tooling — never from anything the browser
 * sent. A client that POSTs `{role: 'owner'}` to this endpoint achieves exactly
 * nothing, because the body is never consulted for anything but the token.
 */

/** Five minutes. A token older than this means "not a fresh sign-in". */
const MAX_TOKEN_AGE_MS = 5 * 60 * 1000;

/** Fourteen days, matching Firebase's maximum for a session cookie. */
const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'المصادقة غير مهيّأة في هذه البيئة' },
      { status: 503 },
    );
  }

  let idToken: string;
  try {
    const body = await request.json();
    idToken = typeof body?.idToken === 'string' ? body.idToken : '';
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  if (!idToken) {
    return NextResponse.json({ error: 'رمز الدخول مفقود' }, { status: 400 });
  }

  try {
    // `true` also rejects tokens whose user has been disabled or whose refresh
    // tokens were revoked — so a banned or signed-out-everywhere account cannot
    // mint a new session from a token it still holds.
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    const authAgeMs = Date.now() - decoded.auth_time * 1000;
    if (authAgeMs > MAX_TOKEN_AGE_MS) {
      return NextResponse.json(
        { error: 'انتهت صلاحية الجلسة — سجّل الدخول من جديد' },
        { status: 401 },
      );
    }

    // A banned account may authenticate — Firebase does not know about our ban
    // — but must not receive a session. Checked here as well as in getSession()
    // so a ban takes effect at the door rather than only on each read.
    const profile = await adminDb().collection('users').doc(decoded.uid).get();
    if (profile.exists && profile.data()?.status === 'banned') {
      return NextResponse.json({ error: 'الحساب موقوف' }, { status: 403 });
    }

    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    return NextResponse.json({ ok: true, uid: decoded.uid });
  } catch (e) {
    // Deliberately one generic message for every failure mode. Distinguishing
    // "no such user" from "wrong token" from "expired" tells an attacker which
    // half of their guess was right.
    console.error('[auth/session] verification failed', e);
    return NextResponse.json({ error: 'تعذّر التحقّق من الدخول' }, { status: 401 });
  }
}

/**
 * Sign out.
 *
 * Clears the cookie AND revokes the user's refresh tokens, so every other
 * session that account holds — including ones on other devices — dies too. A
 * sign-out that only drops the local cookie leaves a stolen session alive,
 * which is exactly the case where signing out matters most.
 */
export async function DELETE() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;

  jar.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  if (raw && isAdminConfigured()) {
    try {
      const decoded = await adminAuth().verifySessionCookie(raw, false);
      await adminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      // An unverifiable cookie is already useless; clearing it was the point.
    }
  }

  return NextResponse.json({ ok: true });
}
