import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `web/` is the Next.js surface: a separate build with its own ESLint setup
  // (next/core-web-vitals rules that do not apply to a Vite SPA, and none of
  // the react-refresh/vite rules that do apply here). Linting it with this
  // config reports ~84 false positives about Next conventions and would bury
  // the phone app's real findings. `npm --prefix web run lint` is its gate.
  globalIgnores(['dist', 'web/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
