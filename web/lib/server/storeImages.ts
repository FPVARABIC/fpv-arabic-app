import 'server-only';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cache } from 'react';
import {
  slotsForProduct, slugForVariant, STORE_IMAGE_REPO_DIR,
  type ImageSlot,
} from '@core/data/store/imageSlots';
import type { StoreProduct } from '@core/data/store/types';

/**
 * The photographs that are actually on disk.
 *
 * WHY THE FILESYSTEM AND NOT A DATA FILE
 * --------------------------------------
 * The brief was «لا أحتاج إلى تعديل ملف بيانات لكل صورة». The owner drops a
 * file into a folder the manifest named and pushes it; nothing else should be
 * required of them. A generated index would work and would also be a second
 * thing to remember — and the one time it is forgotten, the shop shows a
 * placeholder over a photograph that is sitting right there in the repository.
 *
 * So existence is asked of the filesystem, at the only moment it can be asked
 * for free: these pages are static, built once and revalidated on a timer, so
 * the check runs at build time and never on a visitor's request.
 *
 * `cache()` collapses the repeated calls within one render — the card, the
 * gallery and the variant picker all ask about the same product.
 *
 * WHY THERE IS NO FALLBACK BETWEEN VARIANTS
 * -----------------------------------------
 * A `per-variant` product photographs each variant because they are different
 * objects; borrowing one variant's picture for another would make the shop look
 * complete while showing a customer the wrong thing. A product whose variants
 * genuinely look alike is declared `shared` in `imageSlots.ts` and photographs
 * once into `_shared` — an explicit decision recorded in the manifest, not a
 * silent substitution at render time.
 */

const ROOT = process.cwd().endsWith(`${'/'}web`)
  ? join(process.cwd(), '..')
  : process.cwd();

/** Whether one slot's file exists. */
function slotExists(slot: ImageSlot): boolean {
  return existsSync(join(ROOT, slot.repoPath));
}

export interface ResolvedImage {
  url: string;
  altAr: string;
  role: string;
  /** 1–7. The gallery renders in this order. */
  index: number;
}

/**
 * Every uploaded photograph for one variant, in role order.
 *
 * Empty when nothing has been uploaded yet — which is the state today, and the
 * caller renders a placeholder that says so rather than a grey box.
 */
export const uploadedImagesFor = cache((
  product: StoreProduct, variantId: string | null,
): ResolvedImage[] => {
  const slug = variantId
    ? slugForVariant(product, variantId)
    : slugForVariant(product, product.variants.find(v => v.isDefault)?.id
      ?? product.variants[0]?.id ?? '');

  return slotsForProduct(product)
    .filter(s => s.variantSlug === slug)
    .filter(slotExists)
    .sort((a, b) => a.index - b.index)
    .map(s => ({ url: s.url, altAr: s.altAr, role: s.role, index: s.index }));
});

/** The card's image: the default variant's `01-main.webp`, or null. */
export const mainImageFor = cache((product: StoreProduct): ResolvedImage | null =>
  uploadedImagesFor(product, null).find(i => i.role === 'main') ?? null);

/**
 * How complete a product's photography is. Used by the admin panel and the
 * suite, never by a customer-facing page.
 */
export function imageProgressFor(product: StoreProduct): {
  expected: number; uploaded: number; missingRequired: string[];
} {
  const slots = slotsForProduct(product);
  const present = slots.filter(slotExists);
  return {
    expected: slots.length,
    uploaded: present.length,
    missingRequired: slots.filter(s => s.required && !slotExists(s)).map(s => s.repoPath),
  };
}

export { STORE_IMAGE_REPO_DIR };
