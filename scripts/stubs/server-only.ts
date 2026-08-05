/**
 * A no-op stand-in for the `server-only` package, for scripts run outside Next.
 *
 * The real package throws on import unless it is being bundled for a server
 * component. That guard is valuable — it is what stops a module holding secrets
 * from being pulled into a client bundle — so it is NOT removed from the source
 * files. It is simply satisfied here, where there is no client bundle to leak
 * into and the alternative is being unable to test server code at all.
 *
 * Mapped in the root `tsconfig.json`, which affects `tsx` only. The web build
 * reads `web/tsconfig.json` and continues to get the real package with its real
 * guarantee.
 */
export {};
