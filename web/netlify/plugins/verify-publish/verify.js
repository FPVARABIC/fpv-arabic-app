import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

/**
 * Is the directory Netlify is about to deploy the FPVARABIC web app?
 *
 * WHY THIS CHECK EXISTS
 * ---------------------
 * A Netlify deploy of this repository went live showing a blank page, and the
 * browser said why:
 *
 *   Failed to load module script: Expected a JavaScript-or-Wasm module script
 *   but the server responded with a MIME type of "application/octet-stream".
 *
 * The script it was refusing to run was `/src/main.tsx` — a TypeScript SOURCE
 * file. It exists nowhere in any build output; it exists only in the
 * repository. So the deploy was not serving a broken build, it was serving the
 * repository itself: the raw `index.html` at the root, which asks for
 * `/src/main.tsx`, which no browser will execute and no CDN can compile.
 *
 * That happens when the build produces nothing usable and the publish
 * directory resolves to the repository root. Every individual setting looks
 * plausible while it happens, and the deploy is reported as a success.
 *
 * So the question is asked of the ARTEFACT, at the last moment before it ships,
 * and a wrong answer fails the build rather than publishing it.
 *
 * WHAT A CORRECT PUBLISH DIRECTORY LOOKS LIKE
 * -------------------------------------------
 * The Netlify Next.js runtime swaps the publish directory for `.netlify/static`
 * before deploying: client chunks under `_next/static`, plus whatever is in
 * `public/`. Pages are not files there — they come from the server function.
 * So `_next/static/` must be present, and no TypeScript, no `src/`, and no
 * HTML that reaches for a module the browser cannot run.
 */

/** Files a browser would be handed as source rather than as a built asset. */
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.jsx', '.vue', '.svelte']);

/** Never deployable, whatever else is true. */
const FORBIDDEN_NAMES = new Set([
  'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
  'next.config.ts', 'netlify.toml', '.env', '.env.local',
]);

function walk(dir, base = dir, out = [], depth = 0) {
  if (depth > 6) return out;
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) walk(full, base, out, depth + 1);
    else out.push(relative(base, full));
  }
  return out;
}

/**
 * @param {string} dir absolute path of the directory about to be deployed
 * @returns {{ errors: string[], stats: Record<string, number|boolean> }}
 */
export function verifyPublishDir(dir) {
  const errors = [];

  if (!dir || !existsSync(dir)) {
    return { errors: [`publish directory does not exist: ${dir}`], stats: {} };
  }

  const files = walk(dir);
  const stats = {
    files: files.length,
    nextStatic: 0,
    html: 0,
    sourceFiles: 0,
  };

  // 1. It must be a Next build at all. Without this everything below can pass
  //    trivially on an empty or wrong directory.
  const nextStatic = files.filter(f => f.replace(/\\/g, '/').startsWith('_next/static/'));
  stats.nextStatic = nextStatic.length;
  if (nextStatic.length === 0) {
    errors.push(
      'no _next/static/ in the publish directory — this is not a Next.js build. '
      + 'Netlify would serve whatever else is in it, which is how the repository '
      + 'root once went live and asked browsers to execute /src/main.tsx.',
    );
  }

  // 2. No TypeScript or component source. A browser cannot run it, and its
  //    presence means source was published instead of a build.
  const sources = files.filter(f => SOURCE_EXTENSIONS.has(extname(f)));
  stats.sourceFiles = sources.length;
  if (sources.length > 0) {
    errors.push(
      `${sources.length} source file(s) in the publish directory, e.g. `
      + `${sources.slice(0, 3).join(', ')} — a browser is served these verbatim, `
      + 'with a MIME type it refuses to execute.',
    );
  }

  // 3. The specific entry point of the phone app. Named on its own because it
  //    is the exact string the failing deploy asked for, and because a future
  //    reader searching that error should land here.
  if (files.some(f => f.replace(/\\/g, '/') === 'src/main.tsx')) {
    errors.push('src/main.tsx is in the publish directory — the Vite phone app '
      + 'is being deployed as the website');
  }

  // 4. No HTML may reference a module the browser cannot run. This is the
  //    check that would have caught the live failure by itself.
  const html = files.filter(f => extname(f) === '.html');
  stats.html = html.length;
  for (const rel of html) {
    let body = '';
    try { body = readFileSync(join(dir, rel), 'utf8'); } catch { continue; }
    const bad = /(src|href)\s*=\s*["'][^"']*\.(tsx|ts|jsx)["']/i.exec(body);
    if (bad) {
      errors.push(`${rel} references ${bad[0]} — that is source, not a built asset`);
    }
    if (/\/src\/main\.tsx/.test(body)) {
      errors.push(`${rel} loads /src/main.tsx — this is the Vite shell, not the Next app`);
    }
  }

  // 5. Repository plumbing that should never be downloadable.
  const leaked = files.filter(f => FORBIDDEN_NAMES.has(f));
  if (leaked.length > 0) {
    errors.push(`repository files in the publish directory: ${leaked.join(', ')}`);
  }

  return { errors, stats };
}
