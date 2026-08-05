#!/usr/bin/env tsx
/**
 * Staging data: enough to click the whole purchase journey, and impossible to
 * mistake for stock.
 *
 * WHY EVERY ID CARRIES THE `staging-` PREFIX
 * -------------------------------------------
 * Because the deletion has to be trivially correct. «Remove the test data» must
 * not be a judgement call made against a list of 77 real products at the end of
 * a long day — it has to be a prefix match that cannot take a real row with it.
 * The teardown below is that prefix match, and it refuses to touch anything
 * else.
 *
 * WHY IT REFUSES TO RUN ON PRODUCTION
 * -----------------------------------
 * Seeding a fake €1 product into the live shop is a small script away, and the
 * damage is a customer buying it. `isStagingEnvironment()` is checked first and
 * the script exits rather than asking for confirmation, because a confirmation
 * prompt is a thing people press through.
 *
 * WHAT IT DELIBERATELY DOES NOT CREATE
 * ------------------------------------
 * An admin account. Granting `owner` from an unattended script is how a
 * privilege-escalation path gets committed for convenience and stays. The
 * existing `scripts/grantOwner.ts` does it deliberately, for a named account,
 * with the operator present — that is the right shape and it already exists.
 */

import { isStagingEnvironment } from '../web/lib/staging';
import { SEED_SHIPPING_ZONES } from '../src/data/store/shipping';

const PREFIX = 'staging-';

/* ── The guard, before anything is read or written ────────────────────────── */
if (!isStagingEnvironment()) {
  console.error('\n❌ seedStaging: this is not a staging environment.');
  console.error('   NEXT_PUBLIC_SITE_URL names the canonical origin, so this would');
  console.error('   write test data into production. Refusing.\n');
  process.exit(1);
}

const teardown = process.argv.includes('--teardown');

/**
 * The one product. A single variant, a euro price, and a name that announces
 * itself in every list it appears in.
 */
const STAGING_PRODUCT = {
  id: `${PREFIX}demo-quad`,
  categoryId: 'size-5',
  nameEn: 'STAGING TEST PRODUCT — not for sale',
  titleAr: '🧪 منتج تجريبي — للاختبار فقط',
  brandAr: 'FPVARABIC (تجريبي)',
  summaryAr:
    'هذا منتج تجريبي موجود في نسخة الاختبار وحدها. لا يُشحن، ولا يُخصم مقابله '
    + 'مال، ولا يظهر في الموقع الرسمي. غرضه الوحيد أن تُجرَّب رحلة الشراء كاملة.',
  published: true,
  variants: [
    {
      id: `${PREFIX}demo-quad:standard`,
      nameAr: 'النسخة التجريبية',
      priceMinor: 1299,
      availability: 'in-stock' as const,
      freeSetupEligible: true,
    },
  ],
};

/** Test rates, marked as such in the note the admin screen shows. */
const STAGING_ZONE_RATES: Record<string, { costMinor: number; freeOverMinor: number | null }> = {
  nl: { costMinor: 495, freeOverMinor: 10000 },
  be: { costMinor: 695, freeOverMinor: null },
  de: { costMinor: 795, freeOverMinor: null },
  eu: { costMinor: 1295, freeOverMinor: null },
};

async function main() {
  // Imported lazily: the module needs credentials, and the guard above must run
  // before anything tries to connect.
  const { adminDb, isAdminConfigured } = await import('../web/lib/server/firebaseAdmin');

  if (!isAdminConfigured()) {
    console.error('\n❌ seedStaging: no Firebase admin credentials.');
    console.error('   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and');
    console.error('   FIREBASE_PRIVATE_KEY — see docs/store/PAYMENTS.md and web/.env.example.\n');
    process.exit(1);
  }

  const db = adminDb();

  if (teardown) {
    let removed = 0;

    const products = await db.collection('storeProducts').get();
    for (const d of products.docs) {
      // The prefix match, and nothing else. A row without the prefix is never
      // touched, whatever else it looks like.
      if (!d.id.startsWith(PREFIX)) continue;
      await d.ref.delete();
      removed += 1;
    }

    const supply = await db.collection('storeSupply').get();
    for (const d of supply.docs) {
      if (!d.id.startsWith(PREFIX)) continue;
      await d.ref.delete();
      removed += 1;
    }

    console.log(`\n✅ seedStaging --teardown: removed ${removed} staging rows.`);
    console.log('   Shipping zone rates were left alone — they are configuration,');
    console.log('   not test data, and the admin screen is where they belong.\n');
    return;
  }

  /* ── Product ──────────────────────────────────────────────────────────── */
  await db.collection('storeProducts').doc(STAGING_PRODUCT.id).set({
    ...STAGING_PRODUCT,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  /* ── Supply, so the price is not stale and the product can be sold ────── */
  await db.collection('storeSupply').doc(STAGING_PRODUCT.variants[0].id).set({
    variantId: STAGING_PRODUCT.variants[0].id,
    supplierId: 'staging',
    supplierUrl: 'https://example.invalid/staging',
    unitCostMinor: 1000,
    inboundShippingMinor: 100,
    costCurrency: 'EUR',
    notesAr: 'بيانات تجريبية — ليست تكلفة حقيقية',
    verified: true,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  /* ── Shipping rates ───────────────────────────────────────────────────── */
  for (const zone of SEED_SHIPPING_ZONES) {
    const rate = STAGING_ZONE_RATES[zone.id];
    if (!rate) continue;
    await db.collection('storeShippingZones').doc(zone.id).set({
      costMinor: rate.costMinor,
      freeOverMinor: rate.freeOverMinor,
      etaDaysMin: 2,
      etaDaysMax: 5,
      enabled: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  console.log('\n✅ seedStaging: staging data written.');
  console.log(`   product     ${STAGING_PRODUCT.id}  (€12.99)`);
  console.log(`   variant     ${STAGING_PRODUCT.variants[0].id}`);
  console.log(`   zones       ${Object.keys(STAGING_ZONE_RATES).join(', ')} — TEST RATES`);
  console.log('\n   No image: the product renders the typed placeholder, which is the');
  console.log('   honest state. Images are the owner\'s to supply — see');
  console.log('   docs/store/PRODUCT_IMAGE_MANIFEST.md.');
  console.log('\n   No admin account is created here. Use scripts/grantOwner.ts for a');
  console.log('   named account, deliberately.');
  console.log(`\n   Remove it all:  npx tsx scripts/seedStaging.ts --teardown\n`);
}

await main();
