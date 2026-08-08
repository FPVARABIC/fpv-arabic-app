import type { SearchDoc } from '@core/data/kb/search/buildIndex';
import { normalizeText } from '@core/data/kb/search/buildIndex';
import { PAYMENT_HELP_CASES } from '@core/data/store/paymentHelp';
import { SECTION_ROUTES } from '../webRoutes';

/**
 * The standing pages — «اتصل بنا», «حول المنصة», the shop's own front doors.
 *
 * WHY THEY ARE INDEXED AT ALL
 * ---------------------------
 * Because a person who types «اتصل بنا» into the platform's one search field is
 * asking a real question, and answering it with «لا نتائج» is the search saying
 * it does not know about a page it links to in its own footer. These are cheap:
 * a handful of documents with no body to speak of.
 *
 * WHY THEY RANK LAST BY CONSTRUCTION
 * ----------------------------------
 * They carry a title and almost nothing else. A page whose only tokens are its
 * own name cannot outrank an article that genuinely covers the subject — which
 * is the correct behaviour, and it falls out of the ranking rather than needing
 * a rule.
 *
 * WHY THE LIST IS WRITTEN OUT AND NOT WALKED
 * ------------------------------------------
 * Walking `web/app` would index the checkout, the payment result, the sign-in
 * screen and every admin page. Those are not content; several are private, and
 * one of them is somebody's order. A page belongs in search because a person
 * would search for it, which is a judgement, not a directory listing.
 */

interface StandingPage {
  id: string;
  titleAr: string;
  route: string;
  /** One line, the same one the page opens with. Never a second description. */
  summaryAr: string;
  /** The words somebody would actually type to look for it. */
  findByAr: string[];
  /**
   * The page's own content, for the few standing pages that HAVE content.
   *
   * Most of these are doors: a title and nothing else, which is why they rank
   * last by construction. «مشاكل الدفع» is different — it is eight written
   * cases — and indexing only its title would make it lose to any firmware
   * page that happens to contain the word «فشل».
   */
  bodyAr?: string[];
  /**
   * The phrasings somebody uses when something has GONE WRONG.
   *
   * Scored in their own tier, far above keywords, because a symptom is a
   * different kind of evidence from a word appearing in prose. Almost no
   * standing page has any — a door is not a fault report — but «مشاكل الدفع»
   * is nothing but fault reports, and without this it lost «فشل الدفع» to a
   * firmware page and to an article about propeller THRUST, which is what
   * «الدفع» also means in this vocabulary.
   */
  symptomsAr?: string[];
}

const PAGES: StandingPage[] = [
  {
    id: 'contact',
    titleAr: 'اتصل بنا',
    route: '/contact',
    summaryAr: 'كيف تصل إلينا، وما الذي نحتاج معرفته لنساعدك بسرعة.',
    findByAr: ['اتصل بنا', 'تواصل', 'دعم', 'مساعدة', 'شكوى', 'استفسار', 'بريد', 'راسلنا'],
  },
  {
    id: 'about',
    titleAr: 'حول المنصّة',
    route: '/about',
    summaryAr: 'ما هي FPVARABIC، وما الذي تغطّيه وما الذي لا تغطّيه.',
    findByAr: ['حول', 'من نحن', 'عن المنصة', 'ما هي', 'التغطية', 'الهدف'],
  },
  {
    id: 'store-front',
    titleAr: 'المتجر',
    route: SECTION_ROUTES.store,
    summaryAr: 'الأقسام والمقارنات — تتصفّح بالقسم لا بخانة بحث منفصلة.',
    findByAr: ['المتجر', 'شراء', 'أسعار', 'بيع', 'طلب'],
  },
  {
    id: 'store-shipping',
    titleAr: 'الشحن والتوصيل',
    // The shipping estimate lives inside the basket, because it depends on the
    // destination and on what is in the order. Pointing anywhere else would be
    // pointing at a page that cannot answer.
    route: `${SECTION_ROUTES.store}/cart`,
    summaryAr: 'تكلفة الشحن تُحسب في السلة بعد اختيار بلد التوصيل.',
    findByAr: ['الشحن', 'تكلفة الشحن', 'التوصيل', 'كم الشحن', 'هولندا', 'بلجيكا', 'ألمانيا', 'أوروبا'],
  },
  {
    id: 'payment-help',
    titleAr: 'مشاكل الدفع — ماذا أفعل',
    route: `${SECTION_ROUTES.store}/payment-help`,
    summaryAr: 'ماذا يعني ما حدث، وهل خُصم المبلغ، وما الخطوة التالية.',
    // Written out rather than derived, because these are the words a customer
    // TYPES — «انخصم المبلغ» is not a phrase that appears in our own copy, and
    // the page would be unfindable by the exact query that motivated it.
    findByAr: [
      'فشل الدفع', 'الدفع فشل', 'الدفع لم ينجح', 'مشكلة في الدفع', 'مشاكل الدفع',
      'الدفع معلق', 'إلغاء الدفع', 'انتهت المهلة', 'خصم المبلغ', 'انخصم المبلغ',
      'دفعت ولم يتأكد الطلب', 'استرجاع', 'إعادة المحاولة', 'الدفع',
    ],
    bodyAr: PAYMENT_HELP_CASES.flatMap(c => [c.titleAr, c.meaningAr, c.moneyAr, c.nextStepAr]),
    symptomsAr: [
      'فشل الدفع', 'الدفع فشل', 'ما نجح الدفع', 'الدفع لم يكتمل',
      'خصم المبلغ ولم يتأكد الطلب', 'انخصم المبلغ ولم يصل الطلب',
      'دفعت ولم يتأكد الطلب', 'دفعت مرتين', 'خصم مرتين',
      'الدفع معلق', 'الدفع ما زال مفتوحا', 'انتهت مهلة الدفع',
      'ألغيت العملية', 'رفض المصرف', 'رفضت البطاقة',
    ],
  },
  {
    id: 'build-front',
    titleAr: 'البناء — ابنِ درونك',
    route: SECTION_ROUTES.build,
    summaryAr: 'مسار تفاعلي من اختيار القطع وفحص التوافق إلى بوابات السلامة وأول طيران.',
    findByAr: [
      'البناء', 'بناء درون', 'ابني درون', 'تجميع', 'تجميع درون', 'اختيار القطع',
      'توافق القطع', 'قائمة القطع', 'BOM', 'أول طيران',
    ],
  },
  {
    id: 'programming-front',
    titleAr: 'مركز البرامج',
    route: SECTION_ROUTES.programming,
    summaryAr: 'كل برنامج يحتاجه البنّاء، وما تغطّيه المنصّة منه وما لا تغطّيه.',
    findByAr: ['البرامج', 'مركز البرامج', 'تطبيقات', 'برمجة', 'إعداد'],
  },
  {
    id: 'projects-front',
    titleAr: 'المشاريع',
    route: '/projects',
    summaryAr: 'مكتبة مشاريع مبنيّة ومراجَعة — من ESP32 إلى الطيران الذاتي.',
    findByAr: ['المشاريع', 'مشروع', 'أفكار', 'بناء'],
  },
];

const norm = (...parts: string[]): string[] =>
  Array.from(new Set(
    parts.flatMap(p => normalizeText(p).split(' ')).filter(t => t.length > 1),
  ));

export function pageSearchDocs(): SearchDoc[] {
  return PAGES.map(p => ({
    key: `page:${p.id}`,
    type: 'page' as const,
    sourceId: p.id,
    titleAr: p.titleAr,
    subtitle: p.summaryAr,
    route: p.route,
    contentClass: 'reference' as const,
    exactNames: norm(p.titleAr),
    titleTokens: norm(p.titleAr, ...p.findByAr),
    keywordTokens: norm(...p.findByAr, ...(p.bodyAr ?? [])),
    bodyTokens: norm(p.summaryAr, ...(p.bodyAr ?? [])),
    symptomTokens: norm(...(p.symptomsAr ?? [])),
  }));
}
