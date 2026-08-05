import type { SearchDoc } from '@core/data/kb/search/buildIndex';
import { normalizeText } from '@core/data/kb/search/buildIndex';
import { STORE_PRODUCTS } from '@core/data/store/catalogue';
import { storeCategory } from '@core/data/store/categories';
import { STORE_SERVICES, SERVICES_CATEGORY_ID } from '@core/data/store/services';
import {
  BUYER_LEVEL_LABEL_AR, LINK_PROTOCOL_LABEL_AR, VIDEO_SYSTEM_LABEL_AR,
  AVAILABILITY_LABEL_AR,
} from '@core/data/store/types';
import type { StoreProduct } from '@core/data/store/types';
import { productHref } from '../store';

/**
 * The shop, made findable — through the ONE search, never a second engine.
 *
 * WHY THE STORE HAS NO SEARCH FIELD OF ITS OWN
 * --------------------------------------------
 * Because it would be a second engine. It would tokenise Arabic differently,
 * rank differently, know nothing about the encyclopedia, and split every query
 * into "did I type this in the right box?" — and somebody looking for a
 * receiver does not know in advance whether they want the product page or the
 * article about receivers. The shop navigates by SECTION, FILTER and COMPARISON;
 * finding by name is the platform search's job, and this file is how the shop
 * reaches it.
 *
 * WHAT CANNOT LEAK, AND WHY IT IS STRUCTURAL RATHER THAN CAREFUL
 * ---------------------------------------------------------------
 * A `StoreProduct` does not CARRY a supplier, a cost or a margin. Those live in
 * `storeSupply`, a staff-only collection, precisely because price ÷ margin =
 * cost and a public document that held any two of them would publish the third.
 * So this indexer cannot expose them by accident — there is nothing here to
 * expose. `scripts/testSearchSources.ts` asserts that no supply field name
 * appears in any indexed token, which is the check that would catch somebody
 * widening the model later.
 *
 * Two exclusions ARE decisions rather than consequences:
 *
 *   - `suspendedReasonAr` — an internal note explaining why something was
 *     pulled («المورد توقّف عن الردّ»). Never indexed, never rendered.
 *   - unpublished products — including every seed that has no price yet. A
 *     draft that is findable is a draft that is published.
 */

const norm = (...parts: (string | undefined)[]): string[] =>
  Array.from(new Set(
    parts.filter((p): p is string => !!p)
      .flatMap(p => normalizeText(p).split(' '))
      .filter(t => t.length > 1),
  ));

/**
 * The fields a shopper actually searches by, gathered once.
 *
 * Shared between products and services so a service is findable by exactly the
 * same words as a product — the reader does not know or care which of the two
 * things they are looking for is modelled how.
 */
function productTokens(p: StoreProduct) {
  const category = storeCategory(p.categoryId);
  const collections = p.collections.map(c => storeCategory(c)?.titleAr).filter(Boolean);

  return {
    // What it answers to by NAME. A shopper types «Matek M10» or «O3», never
    // the Arabic descriptive title, so the English name leads.
    exactNames: norm(p.nameEn, p.titleAr),
    titleTokens: norm(p.nameEn, p.titleAr, p.brandAr),
    keywordTokens: norm(
      p.brandAr,
      category?.titleAr,
      ...collections as string[],
      BUYER_LEVEL_LABEL_AR[p.level],
      // The two questions every buyer of an aircraft has: will it bind to my
      // radio, and will it show in my goggles. Indexed as words, so «ExpressLRS»
      // and «DJI» reach the products that carry them.
      p.linkProtocol === 'none' ? undefined : LINK_PROTOCOL_LABEL_AR[p.linkProtocol],
      p.linkProtocol === 'none' ? undefined : p.linkProtocol,
      p.videoSystem === 'none' ? undefined : VIDEO_SYSTEM_LABEL_AR[p.videoSystem],
      p.videoSystem === 'none' ? undefined : p.videoSystem,
      AVAILABILITY_LABEL_AR[p.availability],
      ...p.variants.map(v => v.nameAr),
      ...p.specs.map(s => s.labelAr),
      ...p.specs.map(s => s.valueAr),
    ),
    bodyTokens: norm(
      p.summaryAr,
      ...p.highlightsAr,
      ...p.suitsAr,
      // «لا يناسبك إن كنت» is indexed deliberately. It is the section that
      // earns the shop its credibility, and a shopper who types «ليس للمبتدئ»
      // should reach the product that says so about itself.
      ...p.notForAr,
      ...p.inTheBoxAr,
    ),
  };
}

export function storeSearchDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const p of STORE_PRODUCTS) {
    // THE GATE. A draft is not findable, whatever else is true about it.
    if (!p.published) continue;
    if (p.suspendedReasonAr) continue;

    /*
     * A service is a product, and it is indexed once — below, from its own
     * record.
     *
     * `STORE_PRODUCTS` already contains every service, projected through
     * `serviceAsProduct` so the storefront needs no special case. Indexing that
     * projection here as well put «البرمجة والإعداد» in the results TWICE under
     * two keys and two type badges. Caught by running the query, not by a
     * typecheck: both rows were correct, and there were two of them.
     */
    if (p.categoryId === SERVICES_CATEGORY_ID) continue;

    const t = productTokens(p);
    docs.push({
      key: `product:${p.id}`,
      type: 'product',
      sourceId: p.id,
      titleAr: p.titleAr,
      titleEn: p.nameEn,
      subtitle: p.summaryAr.slice(0, 160),
      route: productHref(p.id),
      contentClass: 'reference',
      level: undefined,
      ...t,
      // A product is not a fault report. A shopper describing a symptom must
      // reach the diagnosis, not the thing we would like to sell them — this is
      // the single most important line in the file.
      symptomTokens: [],
      reviewedAt: p.reviewedAt,
    });

    // ── Variants ──────────────────────────────────────────────────────────
    //
    // Indexed separately only where they are genuinely different things to buy:
    // a 4S and a 6S battery, an ELRS and a Crossfire version. A product sold one
    // way has one variant that adds nothing, and indexing it would put the same
    // row in the results twice under two names.
    if (p.variants.length > 1) {
      for (const v of p.variants) {
        docs.push({
          key: `product-variant:${v.id}`,
          type: 'product-variant',
          sourceId: v.id,
          titleAr: `${p.titleAr} — ${v.nameAr}`,
          titleEn: p.nameEn,
          subtitle: v.inTheBoxAr[0],
          // The variant opens its product's page. There is no per-variant page
          // and there should not be: the choice between variants is made by
          // comparing them, which needs them side by side.
          route: productHref(p.id),
          contentClass: 'reference',
          exactNames: norm(`${p.nameEn} ${v.nameAr}`),
          titleTokens: norm(p.nameEn, v.nameAr, p.titleAr),
          keywordTokens: norm(
            v.nameAr,
            v.linkProtocol === 'none' ? undefined : v.linkProtocol,
            v.videoSystem === 'none' ? undefined : v.videoSystem,
            AVAILABILITY_LABEL_AR[v.availability],
            ...v.inTheBoxAr,
          ),
          bodyTokens: norm(...v.inTheBoxAr, p.summaryAr),
          symptomTokens: [],
          reviewedAt: p.reviewedAt,
        });
      }
    }
  }

  // ── Services ────────────────────────────────────────────────────────────
  //
  // Ours rather than a manufacturer's, and published from the first minute:
  // there is no supplier to pay and no photograph to license, so the gate that
  // holds a drone back has nothing to hold here. A shop whose own services
  // cannot be found cannot offer them.
  for (const svc of STORE_SERVICES) {
    docs.push({
      key: `service:${svc.id}`,
      type: 'service',
      sourceId: svc.id,
      titleAr: svc.titleAr,
      subtitle: svc.summaryAr.slice(0, 160),
      route: productHref(svc.id),
      contentClass: 'reference',
      exactNames: norm(svc.titleAr),
      titleTokens: norm(svc.titleAr),
      keywordTokens: norm(
        ...svc.includesAr, svc.turnaroundAr,
        storeCategory(SERVICES_CATEGORY_ID)?.titleAr,
        svc.includedWithPurchase ? 'مجاناً مع أي طلب' : undefined,
      ),
      bodyTokens: norm(svc.summaryAr, ...svc.includesAr, ...svc.requiresAr),
      symptomTokens: [],
    });
  }

  return docs;
}
