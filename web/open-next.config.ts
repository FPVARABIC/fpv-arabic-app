import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext's Cloudflare defaults, taken as they are.
 *
 * The options this COULD set — incremental cache on R2, tag cache, queue —
 * all exist to speed up ISR revalidation at scale, and each one adds a
 * Cloudflare resource that has to exist before deploys succeed. Nothing on
 * the platform needs them yet: the pages revalidate on a timer measured in
 * minutes, and a cold regeneration is a database read. The day that stops
 * being true, this is the file where the decision gets made — deliberately,
 * not as a side effect of scaffolding.
 */
export default defineCloudflareConfig();
