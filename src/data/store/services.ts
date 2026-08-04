/**
 * Services, as products.
 *
 * WHY THEY ARE PRODUCTS AND NOT A CHECKBOX
 * ----------------------------------------
 * Because they are things being sold. A service modelled as a flag on an order
 * cannot be priced, cannot be listed, cannot be bought on its own, cannot be
 * reported on, and cannot be given away in a promotion without a special case
 * somewhere. Modelling it as a product means the cart, the totals, the order
 * record and the admin panel all handle it with the code they already have.
 *
 * THE FREE ONE IS THE COMMERCIAL ARGUMENT
 * ---------------------------------------
 * Setup and programming with any purchase is what this shop can offer that a
 * supplier cannot: the platform already documents how to configure the thing it
 * just sold you. It is priced at zero rather than hidden, so it appears on the
 * order as a line worth its real value struck through — a customer should see
 * what they received, not merely fail to be charged for it.
 *
 * `includedWithPurchase` is what makes that automatic: the cart adds it when
 * there is anything else in the basket, and removes it when the basket empties.
 * Nobody has to remember to offer it.
 *
 * NOT LESSONS
 * -----------
 * These are jobs done on the customer's hardware, not teaching. The
 * encyclopedia is free and always was; this is somebody's afternoon.
 */

import type { StoreProduct } from './types';

export interface StoreService {
  id: string;
  titleAr: string;
  /** What is actually done. Concrete, so «إعداد» is not an open-ended promise. */
  summaryAr: string;
  /** The steps performed, so the customer knows what they are buying. */
  includesAr: string[];
  /** What the customer must supply or agree to for it to be possible. */
  requiresAr: string[];
  /**
   * Free with any purchase.
   *
   * Exactly one service carries this. More than one and «مجاناً مع أي طلب»
   * stops being a single clear promise, which is what makes it work.
   */
  includedWithPurchase: boolean;
  /** Roughly how long it takes, so nobody expects it same-day. */
  turnaroundAr: string;
}

export const STORE_SERVICES: StoreService[] = [
  {
    id: 'svc-setup-free',
    titleAr: 'البرمجة والإعداد',
    summaryAr:
      'نستلم الطائرة أو المتحكّم مضبوطاً وجاهزاً للطيران: الفيرموير، والمنافذ، والمستقبل، '
      + 'والحماية عند فقد الإشارة، وطبقة المعلومات إن وُجدت.',
    includesAr: [
      'تحديث الفيرموير إلى إصدار مستقرّ ومناسب لعتادك.',
      'ضبط المنافذ وتفعيل المستقبل والتأكّد من حركة القنوات.',
      'ضبط الحماية عند فقد الإشارة واختبارها فعلياً قبل التسليم.',
      'ضبط طبقة المعلومات وقناة البثّ وقدرته حسب نظامك.',
    ],
    requiresAr: [
      'أن تخبرنا بجهاز التحكّم والنظارة اللذين تملكهما — بدونهما لا يمكن الربط.',
    ],
    includedWithPurchase: true,
    turnaroundAr: 'يُنجز قبل الشحن، ولا يؤخّر الطلب أكثر من يوم عمل.',
  },
  {
    id: 'svc-binding',
    titleAr: 'الربط مع جهازك',
    summaryAr: 'نربط المستقبل بجهاز التحكّم الذي تملكه ونسلّمه وهو يعمل معه فعلاً.',
    includesAr: [
      'مطابقة النظام والنطاق بين الطرفين.',
      'الربط والتأكّد من حركة كل القنوات.',
      'ضبط مطابقة النموذج إن كان نظامك يدعمها.',
    ],
    requiresAr: ['طراز جهازك ونظامه ونطاقه.'],
    includedWithPurchase: false,
    turnaroundAr: 'ضمن يوم عمل.',
  },
  {
    id: 'svc-edgetx',
    titleAr: 'إعداد جهاز التحكّم',
    summaryAr: 'نجهّز جهاز التحكّم: النماذج، والمفاتيح، والأوضاع، والقياس عن بُعد.',
    includesAr: [
      'إنشاء نموذج مرتّب لطائرتك بدل النموذج الافتراضي.',
      'ربط المفاتيح بالأوضاع التي ستستعملها فعلاً.',
      'تفعيل القياس عن بُعد وضبط التنبيهات المهمّة.',
    ],
    requiresAr: ['أن يصلنا الجهاز، أو أن تكون مشتريه من المتجر.'],
    includedWithPurchase: false,
    turnaroundAr: 'ضمن يوم عمل.',
  },
  {
    id: 'svc-video',
    titleAr: 'إعداد نظام الفيديو',
    summaryAr: 'نضبط البثّ والقناة والقدرة وطبقة المعلومات حسب نظامك ونظارتك.',
    includesAr: [
      'ضبط جدول القنوات والقدرة بما يوافق نظامك.',
      'ضبط طبقة المعلومات وما يظهر فيها.',
      'التأكّد من الصورة قبل التسليم.',
    ],
    requiresAr: ['طراز نظارتك ومنظومتها.'],
    includedWithPurchase: false,
    turnaroundAr: 'ضمن يوم عمل.',
  },
  {
    id: 'svc-assembly',
    titleAr: 'التجميع الكامل',
    summaryAr:
      'نجمّع البناء من قطعه: اللحام، والتركيب، والترتيب، والاختبار — وتصلك طائرة تطير.',
    includesAr: [
      'لحام وتركيب كل القطع.',
      'ترتيب الأسلاك وتثبيتها بما يتحمّل الاهتزاز.',
      'اختبار محركات بلا مراوح، ثم اختبار كامل قبل التسليم.',
    ],
    requiresAr: [
      'أن تكون القطع كلها متوفّرة — منّا أو منك.',
      'أن تكون قد اخترت قطعاً متوافقة فعلاً؛ نراجعها قبل البدء ونخبرك بأي مانع.',
    ],
    includedWithPurchase: false,
    turnaroundAr: 'من ثلاثة إلى سبعة أيام عمل حسب البناء.',
  },
  {
    id: 'svc-review',
    titleAr: 'مراجعة المشروع قبل الشراء',
    summaryAr:
      'ترسل لنا قائمة قطعك قبل أن تشتريها، ونخبرك بما لا يتوافق وبما ينقص — قبل أن تدفع.',
    includesAr: [
      'فحص التوافق بين القطع: الجهد، والتيار، والمنافذ، والمقاسات.',
      'تقرير مكتوب بما يمنع، وما يحتاج انتباهاً، وما ينقص.',
    ],
    requiresAr: ['قائمة القطع التي تنوي شراءها.'],
    includedWithPurchase: false,
    turnaroundAr: 'خلال يومين.',
  },
  {
    id: 'svc-test',
    titleAr: 'اختبار وفحص',
    summaryAr: 'نفحص طائرة تعمل بشكل غريب ونخبرك بما وجدناه — بلا تخمين.',
    includesAr: [
      'فحص بصري وكهربائي للتوصيلات.',
      'اختبار محركات بلا مراوح، ثم اختبار طيران قصير إن كان آمناً.',
      'تقرير بما وجدناه وما نوصي به.',
    ],
    requiresAr: ['وصف ما تلاحظه بالضبط، ومتى يحدث.'],
    includedWithPurchase: false,
    turnaroundAr: 'من يومين إلى أربعة.',
  },
];

const byId = new Map(STORE_SERVICES.map(s => [s.id, s]));

export function storeService(id: string): StoreService | undefined {
  return byId.get(id);
}

/** The one service given away with any purchase, or nothing. */
export function freeWithPurchaseService(): StoreService | undefined {
  return STORE_SERVICES.find(s => s.includedWithPurchase);
}

export const SERVICES_CATEGORY_ID = 'services';

/**
 * A service, expressed as a product so the cart and the order handle it with
 * the code they already have.
 *
 * The price is `null` for the same reason every other product's is: it is set
 * from a supply record by whoever runs the shop. The free one is the exception
 * and is priced at zero, which is a real price rather than an absent one.
 */
export function serviceAsProduct(svc: StoreService, reviewedAt: string): StoreProduct {
  return {
    id: svc.id,
    categoryId: SERVICES_CATEGORY_ID,
    collections: [],
    nameEn: svc.id.replace(/^svc-/, '').replace(/-/g, ' '),
    titleAr: svc.titleAr,
    brandAr: 'FPV بالعربي',
    choicePosition: svc.includedWithPurchase ? 'entry' : 'middle',
    level: 'beginner',
    linkProtocol: 'none',
    videoSystem: 'none',
    summaryAr: svc.summaryAr,
    suitsAr: [`${svc.turnaroundAr}`],
    notForAr: svc.requiresAr,
    highlightsAr: svc.includesAr,
    inTheBoxAr: ['خدمة تُنفَّذ على عتادك — لا يُشحن معها شيء.'],
    specs: [],
    images: [],
    // One variant, like everything else, so no surface needs a special case.
    // A service is never itself «eligible for free setup» — it IS the setup,
    // and a service that qualified for its own free version would add itself to
    // every basket forever.
    variants: [{
      id: `${svc.id}:standard`,
      nameAr: 'الخدمة',
      packageKind: 'single',
      linkProtocol: 'none',
      videoSystem: 'none',
      inTheBoxAr: ['خدمة تُنفَّذ على عتادك — لا يُشحن معها شيء.'],
      availability: 'made-to-order',
      priceMinor: svc.includedWithPurchase ? 0 : null,
      isDefault: true,
      freeSetupEligible: false,
    }],
    priceMinor: svc.includedWithPurchase ? 0 : null,
    currency: 'USD',
    compareAtMinor: null,
    availability: 'made-to-order',
    // Services are ours. There is no manufacturer page to source, no licensed
    // photograph to obtain and no supplier to pay, so the publication gate that
    // holds a drone back has nothing to hold here — and a shop whose own
    // services are invisible cannot offer them.
    published: true,
    relatedProductIds: [],
    alternativeProductIds: [],
    completesProductIds: [],
    learnLinks: [],
    reviewedAt,
  };
}
