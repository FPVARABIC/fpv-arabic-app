import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * ESLint for the web surface.
 *
 * WHY IT IS SEPARATE FROM THE ROOT CONFIG
 * ---------------------------------------
 * The root `eslint.config.js` ignores `web/**` because the two surfaces need
 * genuinely different rule sets: the phone app is a Vite SPA and is linted for
 * react-refresh boundaries, while this one is a Next.js App Router project and
 * needs the rules that catch server/client mistakes the phone app cannot make
 * (`no-img-element`, `no-html-link-for-pages`, `no-sync-scripts`). Running one
 * config over both would mean every rule is either wrong for one surface or
 * disabled for both.
 *
 * `npm --prefix web run lint` is therefore a real gate, not a placeholder — the
 * root config's claim that "web has its own lint" is now true.
 *
 * eslint-config-next 16 ships FLAT config arrays directly, so they are spread
 * here rather than bridged through `FlatCompat` (which fails on this package:
 * its plugin objects are self-referential and the eslintrc validator cannot
 * JSON-serialise them).
 *
 * WHAT IS NOT LINTED
 * ------------------
 * `../src` — the shared core. It belongs to the phone app's lint run, and
 * linting the same file twice under two different configs would produce
 * contradictory verdicts on it.
 */

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // The codebase deliberately uses `catch { /* … */ }` where the failure
      // mode IS "carry on without it" — storage being unavailable, a draft
      // failing to save. Those are not unused variables to be reported.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
    },
  },
];

export default config;
