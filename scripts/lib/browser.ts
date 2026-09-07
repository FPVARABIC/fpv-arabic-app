import { existsSync } from 'node:fs';
import type { LaunchOptions } from 'playwright';

/**
 * Where Chromium is — asked, not assumed.
 *
 * WHY THIS EXISTS
 * ---------------
 * The suites that drive a real browser were written inside a development
 * container that ships Chromium at a fixed path and sets
 * `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`, so `executablePath` was hard-coded to
 * that path. It is correct there and nowhere else: on a GitHub runner the file
 * does not exist, and the suite dies before its first assertion with
 *
 *     browserType.launch: Failed to launch chromium because executable
 *     doesn't exist at /opt/pw-browsers/chromium
 *
 * which reads like a broken test rather than a machine that was never told
 * where its browser is. `testNavigationRegression` is in the CI list, so this
 * one path kept the whole workflow red no matter what the code did.
 *
 * WHY THE CHECK IS `existsSync` AND NOT AN ENV VAR
 * ------------------------------------------------
 * The question is literally «is there a browser at the container's path», and
 * the filesystem answers it without anything having to be exported, documented
 * or remembered. When the file is there we use it — that container must not
 * download a second copy, and its egress policy would refuse anyway. When it is
 * not, we pass nothing and let Playwright resolve the browser it installed
 * itself, which is what every other machine expects.
 */
const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium';

/** Launch options for `chromium.launch`, with the executable resolved. */
export function chromiumLaunchOptions(extra: LaunchOptions = {}): LaunchOptions {
  return existsSync(CONTAINER_CHROMIUM)
    ? { executablePath: CONTAINER_CHROMIUM, ...extra }
    : extra;
}
