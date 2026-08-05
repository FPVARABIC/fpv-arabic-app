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
 *   web/public/assets/store/<productId>/<variantSlug>/<NN>-<role>.webp
 *
 * `geprc-cinelog35:o4-pro` becomes `geprc-cinelog35/o4-pro`. Ids rather than
 * human names, exactly as the brief required — a product renamed in Arabic does
 * not orphan its photographs, and no filename ever contains a space, an Arabic
 * character or a capital letter.
 *
 * WHY THE NUMBER IS BOUND TO THE ROLE AND NOT TO POSITION
 * -------------------------------------------------------
 * `06-box.webp` is `06-box.webp` on every product in the shop, whether that
 * product asks for three photographs or seven. The alternative — numbering
 * sequentially per product — means the box shot is `03-box` on a camera and
 * `06-box` on a drone, so the owner has to consult the manifest for every
 * single file rather than learning seven names once. It also means adding a
 * role to one product silently renumbers the files already uploaded for it.
 *
 * WHY SOME PRODUCTS PHOTOGRAPH PER VARIANT AND OTHERS ONCE
 * --------------------------------------------------------
 * A variant is what you buy, and the analogue and the DJI build of one airframe
 * are different objects in the hand. But two capacities of one battery in the
 * same series are the same object in two sizes, and asking for a full set of
 * each is an afternoon spent photographing the same thing.
 *
 * So the scope is a DECLARED decision — `per-variant` or `shared` — computed
 * from whether the variants differ in something a camera can see. A `shared`
 * product photographs once into `_shared/`, and every variant resolves there.
 *
 * That is not the same as a silent fallback, and the difference matters. There
 * is deliberately NO fallback from a missing variant photograph to its
 * product's default: on a `per-variant` product a missing file shows as
 * missing, is named by the manifest, and holds the variant back — rather than
 * quietly borrowing a picture of a different object, which would make the shop
 * look complete while showing customers the wrong thing.
 */

/* ── The seven roles ──────────────────────────────────────────────────────── */

/**
 * Every role, with its permanent number.
 *
 * The order is the order a gallery shows them, and the number is part of the
 * filename forever. Adding a role means appending — never renumbering, because
 * a renumber orphans every file already uploaded.
 */
export const IMAGE_ROLES = [
  'main', 'front', 'side', 'back', 'top', 'box', 'accessories',
] as const;

export type ImageRole = (typeof IMAGE_ROLES)[number];

/** role → the `NN` in `NN-role.webp`. Fixed, and never recomputed from position. */
export const ROLE_INDEX: Record<ImageRole, number> = {
  main: 1, front: 2, side: 3, back: 4, top: 5, box: 6, accessories: 7,
};

/**
 * What each role is for, so the owner photographs to a brief rather than
 * guessing. These strings are rendered into the manifest.
 */
export const IMAGE_ROLE_BRIEF_AR: Record<ImageRole, string> = {
  main: 'الصورة الرئيسية: المنتج كاملاً على خلفية بيضاء أو فاتحة، بلا قصّ لأي طرف. هذه التي تظهر في بطاقة المتجر.',
  front: 'من الأمام مباشرة: تُظهر الكاميرا والهوائيات وترتيب المراوح.',
  side: 'من الجانب: تُظهر الارتفاع وترتيب الطبقات والمنافذ.',
  back: 'من الخلف: تُظهر المنافذ والمخارج وموضع البطارية.',
  top: 'من الأعلى: تُظهر التخطيط العام وأماكن التثبيت.',
  box: 'محتويات الصندوق كما تصل فعلاً — لا صورة دعائية.',
  accessories: 'ما يُضاف أو يُستبدل: بطاريات، مراوح، هوائيات، أسلاك.',
};

/**
 * The main image is required to publish; every other role is optional.
 *
 * One required file rather than five, deliberately. A shop can open with one
 * honest photograph per thing; it cannot open with none. Making `front`
 * required too would hold back a whole catalogue over a second angle.
 */
export const REQUIRED_ROLES: readonly ImageRole[] = ['main'];

/* ── The file specification ───────────────────────────────────────────────── */

export interface ImageSpec {
  /** `1:1`, `4:3`. Written into the manifest so a crop is never guessed. */
  aspect: string;
  /** The size to shoot for. */
  preferredPx: number;
  /** Below this, the gallery's zoom is useless — so it is refused. */
  minPx: number;
  /** Bytes. A shop page carrying six 2 MB photographs is a shop nobody waits for. */
  maxBytes: number;
  ext: 'webp';
}

export const DEFAULT_IMAGE_SPEC: ImageSpec = {
  aspect: '1:1',
  preferredPx: 1600,
  minPx: 1000,
  maxBytes: 400 * 1024,
  ext: 'webp',
};

/**
 * Products whose shape makes a square crop dishonest.
 *
 * Empty today, and it is a real extension point rather than decoration: a
 * radio is much taller than it is wide, and forcing 1:1 on one either pads it
 * with white or crops the sticks off. When the owner reports that, the override
 * goes here and the manifest, the folders and the tests all follow — there is
 * no second place to change.
 */
export const IMAGE_SPEC_OVERRIDES: Record<string, Partial<ImageSpec>> = {};

export function specFor(productId: string): ImageSpec {
  return { ...DEFAULT_IMAGE_SPEC, ...(IMAGE_SPEC_OVERRIDES[productId] ?? {}) };
}

/* ── Scope: per variant, or one set for the product ───────────────────────── */

export type ImageScope = 'per-variant' | 'shared';

/** The directory used when a product's variants share one set of photographs. */
export const SHARED_VARIANT_SLUG = '_shared';

/**
 * Whether the variants of this product look different enough to need their own
 * photographs.
 *
 * The test is «can a camera see the difference»:
 *
 *   - a different video system  — a DJI air unit and an analogue camera are
 *                                 different hardware in a different place
 *   - a different control link  — a receiver with a different antenna
 *   - a different package kind  — RTF ships with a radio in the box, BNF does
 *                                 not, and the box shot is the whole point
 *
 * A product whose variants differ only in a number — 1100 mAh against 1500 mAh,
 * 1700 KV against 2400 KV — is one object in two sizes, and one set of
 * photographs is honest for both.
 */
export function imageScopeFor(product: StoreProduct): ImageScope {
  if (product.variants.length <= 1) return 'shared';
  const visible = new Set(
    product.variants.map(v => `${v.packageKind}|${v.linkProtocol}|${v.videoSystem}`),
  );
  return visible.size > 1 ? 'per-variant' : 'shared';
}

/* ── Which roles a product earns ──────────────────────────────────────────── */

const SERVICES_CATEGORY = 'services';

/** A complete aircraft: the most expensive thing here, and the most returned. */
const AIRCRAFT_CATEGORIES = new Set([
  'tiny-whoop', 'size-2', 'size-2-5', 'size-3', 'size-3-5', 'size-5', 'size-7',
  'rtf', 'cinematic', 'freestyle', 'long-range',
]);

/** Things that arrive as a kit, where the box contents decide satisfaction. */
const BOXED_CATEGORIES = new Set([
  'radios', 'goggles', 'air-units', 'chargers', 'batteries',
]);

/** Small hardware whose mounting face matters — you have to see both sides. */
const TWO_SIDED_CATEGORIES = new Set([
  'flight-controllers', 'escs', 'cameras', 'vtx', 'gps', 'receivers',
]);

/**
 * How many photographs a variant is worth.
 *
 * Asking for seven photographs of an antenna wastes the owner's afternoon, and
 * an unfilled slot reads as a gap in the shop rather than as a decision — so
 * the set is deliberate per section rather than uniform.
 */
export function rolesFor(product: StoreProduct): ImageRole[] {
  // A service is work, not an object. «برمجة وإعداد مجاناً» has nothing to
  // photograph, and asking for a main image would either block it from
  // publishing forever or invite a decorative stock picture — which is exactly
  // the kind of image the sourcing rules forbid.
  if (product.categoryId === SERVICES_CATEGORY) return [];

  if (AIRCRAFT_CATEGORIES.has(product.categoryId)) {
    return ['main', 'front', 'side', 'top', 'box'];
  }
  if (BOXED_CATEGORIES.has(product.categoryId)) return ['main', 'front', 'box'];
  if (TWO_SIDED_CATEGORIES.has(product.categoryId)) return ['main', 'front', 'back'];
  if (product.categoryId === 'frames') return ['main', 'top', 'side', 'accessories'];
  if (product.categoryId === 'motors') return ['main', 'side'];
  // Antennas, accessories and anything new: one honest photograph and an angle.
  return ['main', 'front'];
}

/* ── Slots ────────────────────────────────────────────────────────────────── */

export interface ImageSlot {
  productId: string;
  /** `*` when the product's variants share one set. */
  variantId: string;
  /** The directory segment: `o4-pro`, or `_shared`. */
  variantSlug: string;
  role: ImageRole;
  /** The permanent number in the filename. */
  index: number;
  /** `01-main.webp`. */
  fileName: string;
  /** `geprc-cinelog35/o4-pro/01-main.webp` — relative to the store root. */
  relPath: string;
  /** Where the owner puts the file, from the repository root. */
  repoPath: string;
  /** The URL the site requests. */
  url: string;
  required: boolean;
  altAr: string;
  briefAr: string;
  spec: ImageSpec;
  scope: ImageScope;
}

/** The single public prefix. Everything else is computed from it. */
export const STORE_IMAGE_URL_PREFIX = '/assets/store';

/** Where the files live in the repository. The owner's upload target. */
export const STORE_IMAGE_REPO_DIR = 'web/public/assets/store';

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

export function fileNameFor(role: ImageRole): string {
  return `${pad(ROLE_INDEX[role])}-${role}.webp`;
}

/**
 * The alt text.
 *
 * Written from the product's OWN fields rather than invented, so it stays true
 * when the catalogue changes, and so it never describes a photograph nobody has
 * taken yet. It names the thing and the variant, which is what a screen-reader
 * user needs to tell two builds of one airframe apart.
 */
export function altFor(
  product: StoreProduct, variant: ProductVariant | null, role: ImageRole,
): string {
  const base = variant ? `${product.titleAr} — ${variant.nameAr}` : product.titleAr;
  switch (role) {
    case 'main': return base;
    case 'front': return `${base}، من الأمام`;
    case 'side': return `${base}، من الجانب`;
    case 'back': return `${base}، من الخلف`;
    case 'top': return `${base}، من الأعلى`;
    case 'box': return `محتويات صندوق ${base}`;
    case 'accessories': return `ملحقات ${base}`;
  }
}

function buildSlot(
  product: StoreProduct,
  variant: ProductVariant | null,
  slug: string,
  role: ImageRole,
  scope: ImageScope,
): ImageSlot {
  const fileName = fileNameFor(role);
  const relPath = `${product.id}/${slug}/${fileName}`;
  return {
    productId: product.id,
    variantId: variant ? variant.id : '*',
    variantSlug: slug,
    role,
    index: ROLE_INDEX[role],
    fileName,
    relPath,
    repoPath: `${STORE_IMAGE_REPO_DIR}/${relPath}`,
    url: `${STORE_IMAGE_URL_PREFIX}/${relPath}`,
    required: REQUIRED_ROLES.includes(role),
    altAr: altFor(product, variant, role),
    briefAr: IMAGE_ROLE_BRIEF_AR[role],
    spec: specFor(product.id),
    scope,
  };
}

/**
 * Every slot ONE product expects.
 *
 * A `shared` product yields one set under `_shared`; a `per-variant` product
 * yields a set per variant. Callers never need to know which — they ask for the
 * product's slots and get the right answer.
 */
export function slotsForProduct(product: StoreProduct): ImageSlot[] {
  const roles = rolesFor(product);
  if (roles.length === 0) return [];

  const scope = imageScopeFor(product);
  if (scope === 'shared') {
    // The default variant names the alt text — it is the one a reader sees
    // first — but the directory is `_shared` because the files serve all of them.
    const v = product.variants.find(x => x.isDefault) ?? product.variants[0] ?? null;
    return roles.map(r => buildSlot(product, v, SHARED_VARIANT_SLUG, r, scope));
  }
  return product.variants.flatMap(v =>
    roles.map(r => buildSlot(product, v, variantSlug(v.id), r, scope)));
}

/** The directory a given variant's images resolve from. */
export function slugForVariant(product: StoreProduct, variantId: string): string {
  return imageScopeFor(product) === 'shared'
    ? SHARED_VARIANT_SLUG
    : variantSlug(variantId);
}

/** The URL of one role's file for one variant. Never checks that it exists. */
export function imageUrlFor(
  product: StoreProduct, variantId: string, role: ImageRole,
): string {
  return `${STORE_IMAGE_URL_PREFIX}/${product.id}/${slugForVariant(product, variantId)}/${fileNameFor(role)}`;
}

/** Every slot a single variant expects. Kept for callers that think per variant. */
export function slotsForVariant(product: StoreProduct, variant: ProductVariant): ImageSlot[] {
  const slug = slugForVariant(product, variant.id);
  return slotsForProduct(product).filter(s => s.variantSlug === slug);
}

/** Every slot the whole catalogue expects. */
export function allImageSlots(products: readonly StoreProduct[]): ImageSlot[] {
  return products.flatMap(slotsForProduct);
}

/** Every directory the owner should find already created. */
export function allImageDirs(products: readonly StoreProduct[]): string[] {
  return [...new Set(allImageSlots(products).map(s => `${s.productId}/${s.variantSlug}`))].sort();
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

/** The filename pattern a file must match to be one of ours at all. */
export const IMAGE_FILE_PATTERN = /^(0[1-7])-(main|front|side|back|top|box|accessories)\.webp$/;
