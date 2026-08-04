/**
 * What the admin panel can change without a deployment.
 *
 * WHY A SEED PLUS AN OVERRIDE, AND NOT A DATABASE OF PRODUCTS
 * -----------------------------------------------------------
 * A shop whose catalogue lives only in a database is a shop that is empty until
 * somebody fills it, cannot be reviewed in a diff, and has no answer to «what
 * did this product say last month». A shop whose catalogue lives only in code
 * needs a deployment to mark something out of stock, which means it never gets
 * marked out of stock.
 *
 * So: the catalogue in `catalogue.ts` is the seed — reviewed, versioned,
 * present from the first minute — and `storeProducts/{id}` in Firestore holds
 * whatever the admin has since changed. The storefront renders the merge. A
 * product nobody has edited renders its seed exactly; a product edited this
 * morning renders this morning's edit.
 *
 * WHY THE MERGE IS A WHITELIST AND NOT A SPREAD
 * ---------------------------------------------
 * `{...seed, ...doc}` would let a Firestore document introduce any field at
 * all, including `id` and `categoryId` — which are what the routes and the
 * section pages are built from. A document that renamed its own id would
 * produce a product reachable at a URL that generates a different one. Only the
 * fields listed here can be overridden, and a document carrying anything else
 * has that part ignored rather than trusted.
 *
 * WHAT THE ADMIN CANNOT CHANGE HERE
 * ---------------------------------
 * The price. It is written by the supply screen as a CONSEQUENCE of cost and
 * margin, never typed directly, so that no price can exist that nobody can
 * explain. It arrives in this document, but it arrives from the server.
 */

import type {
  Availability, BuyerLevel, LinkProtocol, Minor, ProductImage, ProductSpec,
  StoreProduct, VideoSystem,
} from './types';

/** The Firestore document behind a product. Every field optional but the id. */
export interface ProductOverride {
  productId: string;

  /** Written by the supply screen from cost × margin — never typed by hand. */
  priceMinor?: Minor | null;
  compareAtMinor?: Minor | null;
  currency?: 'USD';

  published?: boolean;
  availability?: Availability;

  images?: ProductImage[];
  specs?: ProductSpec[];

  summaryAr?: string;
  highlightsAr?: string[];
  suitsAr?: string[];
  notForAr?: string[];
  inTheBoxAr?: string[];

  level?: BuyerLevel;
  linkProtocol?: LinkProtocol;
  videoSystem?: VideoSystem;

  weightGrams?: number | null;
  dimensionsMm?: { length: number; width: number; height: number } | null;

  updatedAt?: string;
  updatedBy?: string;
}

/**
 * The fields a document is allowed to replace.
 *
 * Exported so the tests can assert that the identity fields — `id`,
 * `categoryId`, `choicePosition`, and the relationship arrays the section pages
 * are built from — are absent from it. A whitelist that quietly grew a route
 * key would be a whitelist that stopped protecting anything.
 */
export const OVERRIDABLE_FIELDS = [
  'priceMinor', 'compareAtMinor', 'currency',
  'published', 'availability',
  'images', 'specs',
  'summaryAr', 'highlightsAr', 'suitsAr', 'notForAr', 'inTheBoxAr',
  'level', 'linkProtocol', 'videoSystem',
  'weightGrams', 'dimensionsMm',
] as const;

/** Fields no document may touch, because a route or a section is built from them. */
export const IMMUTABLE_FIELDS = [
  'id', 'categoryId', 'choicePosition', 'nameEn', 'brandAr',
  'alternativeProductIds', 'completesProductIds', 'relatedProductIds',
] as const;

/**
 * A seed and its override, rendered as one product.
 *
 * Values are taken from the document only when they are present AND of the
 * right shape. `undefined` means «not edited», so a missing field falls back to
 * the seed rather than blanking it — which is what makes a partial write safe.
 * `null` is a real value for the three nullable fields and is honoured: clearing
 * a weight is a thing an editor does on purpose.
 */
export function applyOverride(seed: StoreProduct, doc: ProductOverride | undefined): StoreProduct {
  if (!doc) return seed;

  const str = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
  const strList = (v: unknown, max: number) =>
    Array.isArray(v) && v.every(x => typeof x === 'string')
      ? (v as string[]).map(s => s.trim()).filter(Boolean).slice(0, max)
      : undefined;

  const out: StoreProduct = { ...seed };

  if (typeof doc.priceMinor === 'number' && Number.isInteger(doc.priceMinor) && doc.priceMinor >= 0) {
    out.priceMinor = doc.priceMinor;
  } else if (doc.priceMinor === null) {
    out.priceMinor = null;
  }
  if (typeof doc.compareAtMinor === 'number' && Number.isInteger(doc.compareAtMinor) && doc.compareAtMinor > 0) {
    out.compareAtMinor = doc.compareAtMinor;
  } else if (doc.compareAtMinor === null) {
    out.compareAtMinor = null;
  }

  if (typeof doc.published === 'boolean') out.published = doc.published;
  if (isAvailability(doc.availability)) out.availability = doc.availability;
  if (isLevel(doc.level)) out.level = doc.level;
  if (isProtocol(doc.linkProtocol)) out.linkProtocol = doc.linkProtocol;
  if (isVideoSystem(doc.videoSystem)) out.videoSystem = doc.videoSystem;

  const images = validImages(doc.images);
  if (images) out.images = images;
  const specs = validSpecs(doc.specs);
  if (specs) out.specs = specs;

  const summary = str(doc.summaryAr, 600);
  if (summary) out.summaryAr = summary;
  const highlights = strList(doc.highlightsAr, 8);
  if (highlights) out.highlightsAr = highlights;
  const suits = strList(doc.suitsAr, 8);
  if (suits) out.suitsAr = suits;
  const notFor = strList(doc.notForAr, 8);
  if (notFor) out.notForAr = notFor;
  const inBox = strList(doc.inTheBoxAr, 20);
  if (inBox) out.inTheBoxAr = inBox;

  if (typeof doc.weightGrams === 'number' && doc.weightGrams > 0) out.weightGrams = doc.weightGrams;
  else if (doc.weightGrams === null) delete out.weightGrams;

  if (doc.dimensionsMm && [doc.dimensionsMm.length, doc.dimensionsMm.width, doc.dimensionsMm.height]
    .every(n => typeof n === 'number' && n > 0)) {
    out.dimensionsMm = doc.dimensionsMm;
  } else if (doc.dimensionsMm === null) {
    delete out.dimensionsMm;
  }

  return out;
}

/** Every seed with its override applied, keyed by id, in seed order. */
export function mergeCatalogue(
  seeds: readonly StoreProduct[],
  docs: Record<string, ProductOverride>,
): StoreProduct[] {
  return seeds.map(s => applyOverride(s, docs[s.id]));
}

function isAvailability(v: unknown): v is Availability {
  return v === 'in-stock' || v === 'made-to-order' || v === 'out-of-stock' || v === 'coming-soon';
}
function isLevel(v: unknown): v is BuyerLevel {
  return v === 'beginner' || v === 'intermediate' || v === 'advanced';
}
function isProtocol(v: unknown): v is LinkProtocol {
  return ['elrs', 'crossfire', 'tracer', 'ghost', 'frsky', 'dji', 'none'].includes(v as string);
}
function isVideoSystem(v: unknown): v is VideoSystem {
  return ['analog', 'dji', 'walksnail', 'hdzero', 'none'].includes(v as string);
}

/**
 * Images, kept only if each one carries its provenance.
 *
 * An image without a source and a review date is an image nobody can defend if
 * a manufacturer asks where it came from. The editor makes those fields
 * required; this makes the requirement true of whatever is actually stored,
 * including documents written before the editor existed.
 */
function validImages(v: unknown): ProductImage[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((img): img is ProductImage => {
    if (!img || typeof img !== 'object') return false;
    const i = img as ProductImage;
    if (typeof i.url !== 'string' || !i.url) return false;
    if (typeof i.altAr !== 'string' || !i.altAr) return false;
    // No credit, no publication. The model treats provenance as part of the
    // image, so an entry that lost it on the way into the database is dropped
    // rather than rendered.
    const c = i.credit;
    return !!c
      && typeof c.ownerAr === 'string' && !!c.ownerAr
      && typeof c.permissionAr === 'string' && !!c.permissionAr
      && typeof c.official === 'boolean'
      && typeof c.reviewedAt === 'string' && !!c.reviewedAt;
  }).slice(0, 8);
  // An empty result from a non-empty write means every image failed the credit
  // check — falling back to the seed's images is the safe reading, because the
  // alternative is a product page that silently lost its photography.
  return out.length > 0 ? out : undefined;
}

/**
 * Specs, with an empty array honoured.
 *
 * Unlike images, `[]` here is a real edit an editor makes on purpose — «we
 * could not confirm any of these, so show none» — and the product page renders
 * no spec table at all rather than the seed's unverified ones. That is the
 * whole point of the rule that nothing unconfirmed gets written.
 */
function validSpecs(v: unknown): ProductSpec[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter((s): s is ProductSpec =>
    !!s && typeof s === 'object'
    && typeof (s as ProductSpec).labelAr === 'string' && !!(s as ProductSpec).labelAr
    && typeof (s as ProductSpec).valueAr === 'string' && !!(s as ProductSpec).valueAr
    && typeof (s as ProductSpec).verified === 'boolean',
  ).slice(0, 24);
}
