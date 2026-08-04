/**
 * Suppliers, as a list rather than an assumption.
 *
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------
 * Because «AliExpress» was never the design — it is one row in this table. A
 * store that hard-codes where it buys from ends up with the supplier's URL
 * shape in its product pages, the supplier's shipping model in its checkout,
 * and the supplier's currency in its arithmetic. Changing supplier then means
 * changing the store.
 *
 * Here a supplier is data: an id, a name, how long it typically takes, and
 * whether it can be relied on for the thing being bought. A product's supply
 * record names one, and moving a product to a different supplier is one field.
 *
 * WHAT A SUPPLIER IS NOT
 * ----------------------
 * Visible. Nothing in this file reaches a customer — not the name, not the
 * link, not the lead time. It lives in `src/data/store/` beside the pricing
 * engine because it is commercial data, and `storeSupply` is the only
 * collection that references it, which no non-staff account may read.
 */

export type SupplierReliability = 'proven' | 'usable' | 'unverified';

export const SUPPLIER_RELIABILITY_LABEL_AR: Record<SupplierReliability, string> = {
  proven: 'مجرَّب',
  usable: 'صالح',
  unverified: 'لم يُجرَّب بعد',
};

export interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
  /** The supplier's own site. Staff-only — never rendered to a customer. */
  homeUrl: string;
  /**
   * Where they ship from. Decides the lead time a customer is quoted and
   * whether a customs charge is likely, so it is a commercial fact rather
   * than trivia.
   */
  shipsFromAr: string;
  /** Typical door-to-door time, in days, as a range. */
  leadTimeDays: { min: number; max: number };
  reliability: SupplierReliability;
  /**
   * What this supplier is actually good for.
   *
   * A general marketplace is fine for a battery strap and wrong for a flight
   * controller whose firmware version matters. Recording that stops the
   * cheapest source being chosen for the part where it costs the most.
   */
  bestForAr: string[];
  /** What NOT to buy here. The judgement that makes the list worth keeping. */
  avoidForAr: string[];
  /** Currency their prices are quoted in, before any conversion. */
  quotesIn: 'USD' | 'CNY' | 'EUR';
  notesAr?: string;
}

export const SUPPLIERS: Supplier[] = [
  {
    id: 'manufacturer-direct',
    nameAr: 'الشركة الصانعة مباشرة',
    nameEn: 'Manufacturer Direct',
    homeUrl: '',
    shipsFromAr: 'يختلف حسب الشركة',
    leadTimeDays: { min: 7, max: 21 },
    reliability: 'proven',
    bestForAr: [
      'ما يهمّ فيه الإصدار أو الفيرموير — متحكّمات الطيران والوحدات الرقمية.',
      'ما يحتاج ضماناً حقيقياً أو قطع غيار أصلية.',
    ],
    avoidForAr: ['الطلبات الصغيرة — الشحن وحده قد يتجاوز قيمة القطعة.'],
    quotesIn: 'USD',
    notesAr: 'الخيار الافتراضي لأي قطعة حسّاسة للإصدار.',
  },
  {
    id: 'getfpv',
    nameAr: 'GetFPV',
    nameEn: 'GetFPV',
    homeUrl: 'https://www.getfpv.com',
    shipsFromAr: 'الولايات المتحدة',
    leadTimeDays: { min: 5, max: 14 },
    reliability: 'proven',
    bestForAr: ['القطع التي يجب أن تكون أصلية', 'ما يُطلب بسرعة ولا يحتمل الانتظار'],
    avoidForAr: ['الطلبات الحسّاسة للسعر — أعلى تكلفةً من المصادر الآسيوية.'],
    quotesIn: 'USD',
  },
  {
    id: 'pyrodrone',
    nameAr: 'Pyrodrone',
    nameEn: 'Pyrodrone',
    homeUrl: 'https://pyrodrone.com',
    shipsFromAr: 'الولايات المتحدة',
    leadTimeDays: { min: 5, max: 14 },
    reliability: 'proven',
    bestForAr: ['الهياكل وقطع غيارها', 'القطع المتخصّصة'],
    avoidForAr: [],
    quotesIn: 'USD',
  },
  {
    id: 'racedayquads',
    nameAr: 'RaceDayQuads',
    nameEn: 'RaceDayQuads',
    homeUrl: 'https://www.racedayquads.com',
    shipsFromAr: 'الولايات المتحدة',
    leadTimeDays: { min: 5, max: 14 },
    reliability: 'proven',
    bestForAr: ['البطاريات والمراوح', 'ما يُشترى بكميات'],
    avoidForAr: [],
    quotesIn: 'USD',
  },
  {
    id: 'banggood',
    nameAr: 'Banggood',
    nameEn: 'Banggood',
    homeUrl: 'https://www.banggood.com',
    shipsFromAr: 'الصين',
    leadTimeDays: { min: 12, max: 35 },
    reliability: 'usable',
    bestForAr: ['الإكسسوارات', 'القطع التي لا يهمّ فيها الإصدار'],
    avoidForAr: [
      'متحكّمات الطيران والوحدات الرقمية — الإصدار المشحون قد لا يطابق المعروض.',
      'أي قطعة يعتمد عملها على فيرموير محدّد.',
    ],
    quotesIn: 'USD',
  },
  {
    id: 'aliexpress',
    nameAr: 'AliExpress',
    nameEn: 'AliExpress',
    homeUrl: 'https://www.aliexpress.com',
    shipsFromAr: 'الصين',
    leadTimeDays: { min: 14, max: 45 },
    reliability: 'usable',
    bestForAr: ['الإكسسوارات والقطع الرخيصة', 'ما يُشترى احتياطياً'],
    avoidForAr: [
      'كل ما يهمّ فيه الإصدار أو الأصالة.',
      'البطاريات — الشحن والتخزين لا يُوثق بهما من بائع غير معروف.',
    ],
    quotesIn: 'USD',
    notesAr: 'واحد من عدّة موردين، لا أساس المتجر. البائع يختلف داخل الموقع نفسه.',
  },
];

const byId = new Map(SUPPLIERS.map(s => [s.id, s]));

export function supplier(id: string): Supplier | undefined {
  return byId.get(id);
}

/** The lead time a customer can be told, as a range across the whole order. */
export function combinedLeadTime(
  supplierIds: readonly string[],
): { min: number; max: number } | null {
  const found = supplierIds.map(id => byId.get(id)).filter((s): s is Supplier => !!s);
  if (found.length === 0) return null;
  // The slowest supplier decides: an order ships when its last item arrives,
  // and quoting the fastest would be a promise the order cannot keep.
  return {
    min: Math.max(...found.map(s => s.leadTimeDays.min)),
    max: Math.max(...found.map(s => s.leadTimeDays.max)),
  };
}
