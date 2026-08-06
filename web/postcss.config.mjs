/**
 * The web app's OWN PostCSS pipeline — its existence is the point.
 *
 * Without a config here, Turbopack walks up to the repository root (which it
 * treats as the workspace root: two lockfiles, and `outputFileTracingRoot`
 * points there) and finds `/postcss.config.js` — the PHONE app's pipeline,
 * which requires `tailwindcss`. Locally that resolved from the root
 * `node_modules` and silently no-op'd over this app's CSS (nothing here uses
 * Tailwind); on Vercel, where Root Directory is `web/` and only this
 * directory's dependencies are installed, it failed the build with
 * `Cannot find module 'tailwindcss'`.
 *
 * Autoprefixer is the one plugin the root pipeline was actually contributing
 * to this app's output, so it is the one plugin kept. Both it and `postcss`
 * are declared in THIS directory's package.json — the build must never again
 * depend on what happens to be installed a directory above it.
 */
const config = {
  plugins: {
    autoprefixer: {},
  },
};

export default config;
