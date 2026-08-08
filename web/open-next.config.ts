import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext's Cloudflare defaults — plus one deliberate override.
 *
 * WHY THE BUILD COMMAND PINS WEBPACK
 * ----------------------------------
 * Turbopack (Next 16's default) emits a PRIVATE COPY of the shared data
 * layer for every server entry: 32 copies of `src_data_*` chunks, 57.6 MB of
 * the same encyclopedia and catalogues, measured in `.next/server/chunks/ssr`.
 * Bundled into one worker that became an 82 MB `handler.mjs` — over
 * Cloudflare's 64 MiB uncompressed limit (upload error 10027) for an app
 * whose real server code is a fraction of that. The webpack pipeline shares
 * those modules the classical way: the same build measures 12 MB of server
 * chunks, one copy of the data.
 *
 * The pin lives HERE, not in `package.json`'s build script, because the
 * bloat only matters where everything is bundled into a single artifact
 * with a hard ceiling — this deploy path. CI and local development keep
 * Turbopack's speed; duplication across chunks is invisible there.
 *
 * The options this still leaves default — incremental cache on R2, tag
 * cache, queue — exist to speed up ISR revalidation at scale, and each adds
 * a Cloudflare resource that must exist before deploys succeed. The pages
 * revalidate on a timer measured in minutes; nothing needs them yet.
 */
const config = {
  ...defineCloudflareConfig(),
  buildCommand: 'npx next build --webpack',
};

export default config;
