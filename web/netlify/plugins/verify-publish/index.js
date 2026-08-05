import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { verifyPublishDir } from './verify.js';

/**
 * The last gate before a deploy goes live.
 *
 * Netlify reports a deploy as successful when the build command exits zero.
 * That is not the same as «the site works»: the deploy that prompted this
 * plugin exited zero, published the repository root, and served browsers a
 * `.tsx` file they refused to execute. Nothing in the build log said so.
 *
 * This runs after the Next.js runtime has assembled what will actually ship,
 * looks at that directory, and fails the build rather than publishing a site
 * that cannot work. A failed build keeps the previous deploy online, which is
 * the right outcome: a blank page that reports success is worse than a red
 * build that says what is wrong.
 *
 * WHY IT LOOKS IN TWO PLACES
 * --------------------------
 * `@netlify/plugin-nextjs` swaps the publish directory for `.netlify/static`
 * during its own `onPostBuild`. Plugin order decides whether that has happened
 * when this runs, and a check whose meaning depends on declaration order is a
 * check that will eventually be wrong. So it resolves the directory that
 * genuinely holds the deployable output, whichever of the two that is.
 */
export const onPostBuild = async ({ constants, utils }) => {
  const candidates = [
    constants.PUBLISH_DIR,
    join(constants.PUBLISH_DIR ?? '.', '..', '.netlify', 'static'),
    join(process.cwd(), '.netlify', 'static'),
  ].filter(Boolean);

  // The deployable directory is the one that looks like a Next static output.
  // Falling back to PUBLISH_DIR means a genuinely broken build still gets
  // reported, rather than silently skipped for having no candidate.
  const dir = candidates.find(c => existsSync(join(c, '_next', 'static')))
    ?? constants.PUBLISH_DIR;

  const { errors, stats } = verifyPublishDir(dir);

  console.log(`[verify-publish] checking ${dir}`);
  console.log(`[verify-publish] ${stats.files} file(s), `
    + `${stats.nextStatic} under _next/static, ${stats.html} html, `
    + `${stats.sourceFiles} source file(s)`);

  if (errors.length > 0) {
    utils.build.failBuild(
      'The directory about to be deployed is not the FPVARABIC Next.js app:\n\n'
      + errors.map(e => `  · ${e}`).join('\n')
      + '\n\nNothing was published; the previous deploy stays online.\n'
      + 'Check the site\'s base directory and build command against '
      + 'web/netlify.toml, which is the file a base=web site reads.',
    );
    return;
  }

  console.log('[verify-publish] OK — this is the Next.js app, with no source files');
};
