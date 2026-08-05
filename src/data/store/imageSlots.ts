import type { StoreProduct, ProductVariant } from './types';

/**
 * Which image files a product expects, and where they live.
 *
 * WHY THIS IS DERIVED AND NOT A LIST SOMEBODY MAINTAINS
 * -----------------------------------------------------
 * The owner supplies the photographs; the platform must tell them exactly what
 * to name each file, and must then find those files again with no further
 * editing. Both halves have to come from ONE rule, because the failure mode of
 * two lists is silent: a manifest that says `03-side.webp` and a resolver that
 * looks for `03_side.webp` produces a shop where nothing is wrong in any single
 * file and no image ever appears.
 *
 * So the path is computed from ids that already exist and never change:
 *
 *   assets/store/<productId>/<variantSuffix>/<NN>-<role>.webp
 *
 * `geprc-cinelog35:o4-pro` becomes `geprc-cinelog35/o4-pro`. Ids rather than
 * human names, exactly as the brief required — a product renamed in Arabic does
 * not orphan its photographs, and no filename ever contains a space, an Arabic
 * character or a capital letter.
 *
 * WHY PER VARIANT AND NOT PER PRODUCT
 * -----------------------------------
 * Because a variant is what you buy. The analogue and the DJI build of the same
 * airframe are different objects in the hand, and showing one photograph for
 * both is the kind of small dishonesty that produces a return.
 *
 * There is deliberately NO fallback from a variant to its product's default. A
 * missing photograph shows as missing — the publication gate holds the variant
 * back and the admin panel names it — rather than quietly borrowing a picture of
 * a different object. Borrowing would make the shop look complete while showing
 * customers the wrong thing, which is the failure this whole file exists to
 * prevent.
 */

/** The roles a photograph can play, in the order a gallery shows them. */
export const IMAGE_ROLES = ['main', 'front', 'side', 'box', 'accessories'] as const;
export type ImageRole = (typeof IMAGE_ROLES)[number];

/**
 * What each role is for, so the owner is photographing to a brief rather than
 * guessing. These strings are rendered into the manifest.
 */
export const IMAGE_ROLE_BRIEF_AR: Record<ImageRole, string> = {
  main: 'الصورة الرئيسية: المنتج كاملاً على خلفية بيضاء أو فاتحة، بلا قصّ لأي طرف. هذه التي تظهر في بطاقات المتجر.',
  front: 'من الأمام مباشرة: تُظهر الكاميرا والهوائيات وترتيب المراوح.',
  side: 'من الجانب: تُظهر الارتفاع وترتيب الطبقات والمنافذ.',
  box: 'محتويات الصندوق كما تصل فعلاً — لا صورة دعائية.',
  accessories: 'ما يُضاف أو يُستبدل: بطاريات، مراوح، هوائيات.',
};

/** The main image is required to publish; the rest are optional. */
export const REQUIRED_ROLES: readonly ImageRole[] = ['main'];

export interface ImageSlot {
  productId: string;
  variantId: string;
  /** The `o4-pro` half of `geprc-cinelog35:o4-pro`. */
  variantSlug: string;
  role: ImageRole;
  /** 1-based, matching the filename prefix. */
  index: number;
  /** `geprc-cinelog35/o4-pro/01-main.webp` — relative to the store root. */
  relPath: string;
  /** The URL the site requests: `/assets/store/<relPath>`. */
  url: string;
  required: boolean;
  altAr: string;
  briefAr: string;
}

/** The single public prefix. Everything else is computed from it. */
export const STORE_IMAGE_URL_PREFIX = '/assets/store';

/**
 * The variant half of a slot path.
 *
 * Variant ids are `productId:suffix`. Taking the suffix keeps the directory
 * short and keeps the product id from appearing twice in one path. A variant
 * whose id carries no colon (it should not) falls back to the whole id rather
 * than producing an empty directory segment.
 */
export function variantSlug(variantId: string): string {
  const i = variantId.indexOf(':');
  return i === -1 ? variantId : variantId.slice(i + 1);
}

/** `01`, `02`, … so files sort correctly in any file manager. */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * How many photographs a variant is worth.
 *
 * An aircraft earns the full five: it is the most expensive thing in the shop
 * and the one where «what is actually in the box» decides a return. A cable
 * earns two. Asking for five photographs of an antenna wastes the owner's
 * afternoon, and an unfilled slot reads as a gap in the shop rather than as a
 * decision — so the number is deliberate per section.
 */
export function rolesFor(product: StoreProduct): ImageRole[] {
  // A service is work, not an object. «برمجة وإعداد مجاناً» has nothing to
  // photograph, and asking for a main image would either block it from
  // publishing forever or invite a decorative stock picture — which is exactly
  // the kind of image the sourcing rules forbid.
  if (product.categoryId === SERVICES_CATEGORY) return [];
  if (AIRCRAFT_CATEGORIES.has(product.categoryId)) {
    return ['main', 'front', 'side', 'box', 'accessories'];
  }
  if (BOXED_CATEGORIES.has(product.categoryId)) return ['main', 'front', 'box'];
  return ['main', 'front'];
}

const SERVICES_CATEGORY = 'services';

const AIRCRAFT_CATEGORIES = new Set([
  'tiny-whoop', 'size-2', 'size-2-5', 'size-3', 'size-3-5', 'size-5', 'size-7', 'rtf',
]);

/** Things that arrive as a kit, where the box contents matter. */
const BOXED_CATEGORIES = new Set([
  'radios', 'goggles', 'air-units', 'chargers', 'batteries',
]);

/**
 * The alt text.
 *
 * Written from the product's OWN fields rather than invented, so it stays true
 * when the catalogue changes, and so it never describes a photograph nobody has
 * taken yet. It names the thing and the variant, which is what a screen-reader
 * user needs to tell two builds of one airframe apart.
 */
export function altFor(product: StoreProduct, variant: ProductVariant, role: ImageRole): string {
  const base = `${product.titleAr} — ${variant.nameAr}`;
  switch (role) {
    case 'main': return base;
    case 'front': return `${base}، من الأمام`;
    case 'side': return `${base}، من الجانب`;
    case 'box': return `محتويات صندوق ${base}`;
    case 'accessories': return `ملحقات ${base}`;
  }
}

/** Every slot a single variant expects. */
export function slotsForVariant(product: StoreProduct, variant: ProductVariant): ImageSlot[] {
  const slug = variantSlug(variant.id);
  return rolesFor(product).map((role, i) => {
    const index = i + 1;
    const relPath = `${product.id}/${slug}/${pad(index)}-${role}.webp`;
    return {
      productId: product.id,
      variantId: variant.id,
      variantSlug: slug,
      role,
      index,
      relPath,
      url: `${STORE_IMAGE_URL_PREFIX}/${relPath}`,
      required: REQUIRED_ROLES.includes(role),
      altAr: altFor(product, variant, role),
      briefAr: IMAGE_ROLE_BRIEF_AR[role],
    };
  });
}

/** Every slot the whole catalogue expects. */
export function allImageSlots(products: readonly StoreProduct[]): ImageSlot[] {
  return products.flatMap(p => p.variants.flatMap(v => slotsForVariant(p, v)));
}

/**
 * Is this path one the catalogue asked for?
 *
 * The orphan check needs to answer this for a file on disk, which is why it
 * takes a path rather than a slot: a file the owner named `01-mian.webp` must
 * be reported, not ignored. Ignoring it is how a shop ends up with a directory
 * of photographs nobody can see.
 */
export function isKnownImagePath(
  relPath: string,
  products: readonly StoreProduct[],
): boolean {
  return allImageSlots(products).some(s => s.relPath === relPath);
}
