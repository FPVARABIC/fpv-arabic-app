import Link from 'next/link';
import type { PlatformRef } from '@core/data/projects/types';
import { refHref, type RefContext } from '@/lib/projectLinks';

/**
 * One «افتح هذا داخل المنصة» pointer, rendered honestly.
 *
 * THREE OUTCOMES, AND THE MIDDLE ONE IS THE POINT
 * -----------------------------------------------
 *   a live target      → a link chip naming the section it opens
 *   a known absence    → the same chip, not a link, saying «سيضاف لاحقاً في …»
 *                        or naming where the thing actually comes from
 *   a dangling target  → nothing at all
 *
 * This is the same shape as `ContentLink`, and for the same reason: a dead link
 * spends a click, while «this is in the app / this is coming / we do not sell
 * this» respects it. The difference is that this one sits BESIDE a name rather
 * than replacing it — a part is still listed when the shop does not stock it,
 * so the third outcome removes the chip and never the item.
 *
 * WHY THE CHIP NAMES THE SECTION
 * ------------------------------
 * Because «اقرأ المزيد» tells a reader nothing about where they are going, and
 * on this page they are going to five different places. «الموسوعة»، «المتجر»،
 * «مركز البرامج» is the whole navigational promise of the section: the project
 * is a starting point inside the platform, not a page that ends.
 */
export const PlatformRefLink: React.FC<{
  refTo: PlatformRef;
  ctx?: RefContext;
  /** Overrides the chip's text. Defaults to the section name. */
  labelAr?: string;
  testId?: string;
}> = ({ refTo, ctx, labelAr, testId }) => {
  const r = refHref(refTo, ctx);

  if (r.href) {
    return (
      <Link
        href={r.href}
        className="ref-chip ref-chip-live"
        data-testid={testId}
        data-ref-section={r.sectionAr}
      >
        {labelAr ?? r.sectionAr}
        <span aria-hidden> ←</span>
      </Link>
    );
  }

  if (r.noteAr) {
    return (
      <span
        className="ref-chip ref-chip-soon"
        data-testid={testId ? `${testId}-unavailable` : undefined}
        data-ref-section={r.sectionAr}
      >
        {r.noteAr}
      </span>
    );
  }

  // A target that no longer exists. The item it belongs to still renders; only
  // the promise disappears. `scripts/testProjects.ts` fails the build when this
  // branch is reachable from seed data, so in practice it only fires for a bad
  // id typed into the admin panel.
  return null;
};
