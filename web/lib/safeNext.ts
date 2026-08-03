/**
 * Validates a post-sign-in redirect target.
 *
 * WHY THIS EXISTS
 * ---------------
 * The sign-in flow carries `?next=` so a user sent to sign in from `/admin`
 * lands back on `/admin` rather than the home page. That parameter is
 * attacker-controllable: a crafted link like
 * `/signin?next=https://evil.example/login` would, if used naively, bounce the
 * user to a convincing fake login page immediately after a real one — the
 * classic open-redirect phishing chain.
 *
 * So only a same-origin ABSOLUTE PATH is ever accepted. Anything else — a full
 * URL, a protocol-relative `//evil.com`, a backslash variant that some parsers
 * normalise to a slash, or a `javascript:` scheme — falls back to the home page.
 *
 * Shared by the sign-in page and the middleware so the rule cannot be enforced
 * in one place and forgotten in the other.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;

  const value = raw.trim();
  if (!value.startsWith('/')) return fallback;
  // `//host` and `/\host` are both read as protocol-relative by some browsers.
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  // Control characters are used to smuggle schemes past naive prefix checks.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  // Never bounce back into an API route — that is not a page.
  if (value.startsWith('/api/')) return fallback;

  return value;
}
