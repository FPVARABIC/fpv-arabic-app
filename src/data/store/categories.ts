/**
 * The store's sections.
 *
 * ORGANISED BY THE DECISION, NOT BY THE WAREHOUSE
 * -----------------------------------------------
 * Every large FPV shop sorts by part type, because that is how a supplier's
 * spreadsheet is sorted. It leaves a beginner facing «Motors» with four hundred
 * entries and no way in. Here the aircraft come first and are split by the two
 * things a buyer actually decides between — how big, and what for — and the
 * component sections exist for people who already know which part they need.
 *
 * Someone who does not know what they need should be able to buy the right
 * aircraft without ever opening a component section. Someone who does should
 * not have to scroll past aircraft to reach a receiver.
 *
 * WHY EVERY SECTION NAMES SOMETHING TO READ
 * -----------------------------------------
 * This is the one thing no competitor can copy: the shop sits on top of an
 * encyclopedia that already explains the decision. A section that sells motors
 * without being able to say «اقرأ عن KV أولاً» is a section selling to someone
 * it has chosen not to help.
 */

import type { StoreCategory } from './types';

export const STORE_CATEGORIES: StoreCategory[] = [
  /* ── Aircraft ───────────────────────────────────────────────────────────── */
  {
    id: 'tiny-whoop',
    titleAr: 'تايني ووب',
    titleEn: 'Tiny Whoop',
    blurbAr: 'أصغر ما يُطار داخل البيت. مراوح محاطة بالكامل، فلا تجرح ولا تتلف الأثاث — وهي المكان الذي يتعلّم فيه أغلب الطيارين.',
    group: 'aircraft',
    choiceAxis: 'completeness',
    order: 1,
    learnLink: { kind: 'article', targetId: 'prop-damage-safety', label: 'لماذا الحماية حول المروحة تغيّر كل شيء' },
  },
  {
    id: 'size-2',
    titleAr: 'مقاس 2 إنش',
    titleEn: '2 inch',
    blurbAr: 'أكبر قليلاً من الووب وأسرع منه بوضوح. تصلح للفناء والمساحات الضيّقة في الخارج.',
    group: 'aircraft',
    choiceAxis: 'completeness',
    order: 2,
  },
  {
    id: 'size-2-5',
    titleAr: 'مقاس 2.5 إنش',
    titleEn: '2.5 inch',
    blurbAr: 'الحدّ الذي تبدأ عنده الطائرة تتحمّل الهواء الخفيف بدل أن ينحرف بها.',
    group: 'aircraft',
    choiceAxis: 'completeness',
    order: 3,
  },
  {
    id: 'size-3',
    titleAr: 'مقاس 3 إنش',
    titleEn: '3 inch',
    blurbAr: 'أصغر مقاس يُعطي إحساس الفريستايل الحقيقي، ويبقى قابلاً للطيران في حديقة.',
    group: 'aircraft',
    choiceAxis: 'completeness',
    order: 4,
    learnLink: { kind: 'article', targetId: 'prop-sizing', label: 'ما الذي يغيّره مقاس المروحة فعلاً' },
  },
  {
    id: 'size-3-5',
    titleAr: 'مقاس 3.5 إنش',
    titleEn: '3.5 inch',
    blurbAr: 'وسط بين خفّة الثلاثة وثبات الخمسة، ويحمل بطارية أكبر لزمن طيران أطول.',
    group: 'aircraft',
    choiceAxis: 'completeness',
    order: 5,
  },
  {
    id: 'size-5',
    titleAr: 'مقاس 5 إنش',
    titleEn: '5 inch',
    blurbAr: 'المقاس القياسي في الهواية: أوسع اختيار قطع، وأكثر ما تجد له شرحاً وقطع غيار.',
    group: 'aircraft',
    choiceAxis: 'completeness',
    order: 6,
    learnLink: { kind: 'article', targetId: 'motor-selection', label: 'كيف تُختار المحركات لهذا المقاس' },
  },
  {
    id: 'size-7',
    titleAr: 'مقاس 7 إنش',
    titleEn: '7 inch',
    blurbAr: 'مقاس المدى الطويل: كفاءة أعلى وزمن أطول، ومسؤولية أكبر — الطاقة المخزَّنة فيها ليست لعبة.',
    group: 'aircraft',
    choiceAxis: 'completeness',
    order: 7,
    learnLink: { kind: 'article', targetId: 'battery-safety', label: 'سلامة البطاريات الكبيرة' },
  },
  {
    id: 'cinematic',
    titleAr: 'تصوير سينمائي',
    titleEn: 'Cinematic',
    blurbAr: 'مبنية للصورة الناعمة لا للسرعة: ثبات، واحتمال كاميرا أثقل، وضبط يميل إلى الهدوء.',
    group: 'aircraft',
    choiceAxis: 'use-case',
    order: 8,
  },
  {
    id: 'freestyle',
    titleAr: 'فريستايل',
    titleEn: 'Freestyle',
    blurbAr: 'مبنية للمناورة الحادة وللنجاة من الارتطام: هياكل أمتن، وقطع يسهل استبدالها.',
    group: 'aircraft',
    choiceAxis: 'use-case',
    order: 9,
  },
  {
    id: 'long-range',
    titleAr: 'مدى طويل',
    titleEn: 'Long Range',
    blurbAr: 'رابط تحكم أقوى، وكفاءة أعلى، ونظام عودة عند فقد الإشارة — ولا شيء من ذلك ضمان.',
    group: 'aircraft',
    choiceAxis: 'use-case',
    order: 10,
    learnLink: { kind: 'article', targetId: 'rc-failsafe', label: 'ماذا يحدث فعلاً عند فقد الإشارة' },
  },
  {
    id: 'rtf',
    titleAr: 'جاهزة للطيران',
    titleEn: 'Ready To Fly',
    blurbAr: 'كل ما تحتاجه في صندوق واحد: الطائرة وجهاز التحكم والنظارة والبطاريات. الأسرع بدايةً، والأقل مرونة لاحقاً.',
    group: 'aircraft',
    choiceAxis: 'completeness',
    order: 11,
  },

  /* ── Components ─────────────────────────────────────────────────────────── */
  {
    id: 'radios',
    titleAr: 'أجهزة التحكم',
    titleEn: 'Radios',
    blurbAr: 'الجهاز الذي تمسكه. يعيش أطول من كل طائرة تشتريها، فاشترِ مرة واحدة جيداً.',
    group: 'components',
    choiceAxis: 'budget',
    order: 1,
    learnLink: { kind: 'edgetx', targetId: '', label: 'مركز EdgeTX — نظام تشغيل الجهاز' },
  },
  {
    id: 'goggles',
    titleAr: 'النظارات',
    titleEn: 'Goggles',
    blurbAr: 'عيناك في الجو. المنظومة التي تختارها هنا تقيّد وحدة الفيديو على كل طائرة تبنيها بعدها.',
    group: 'components',
    choiceAxis: 'ecosystem',
    order: 2,
    learnLink: { kind: 'article', targetId: 'video-analog-vs-digital', label: 'تناظري أم رقمي — الفرق الحقيقي' },
  },
  {
    id: 'motors',
    titleAr: 'المحركات',
    titleEn: 'Motors',
    blurbAr: 'ما يحوّل الطاقة إلى دفع. المقاس والـKV يقرّران السلوك أكثر من أي رقم آخر.',
    group: 'components',
    choiceAxis: 'budget',
    order: 3,
    learnLink: { kind: 'article', targetId: 'motor-kv', label: 'ما معنى KV ولماذا يهم' },
  },
  {
    id: 'flight-controllers',
    titleAr: 'متحكّمات الطيران',
    titleEn: 'Flight Controllers',
    blurbAr: 'دماغ الطائرة. عدد المنافذ ومقاس التثبيت يحدّدان ما يمكنك توصيله لاحقاً.',
    group: 'components',
    choiceAxis: 'budget',
    order: 4,
    learnLink: { kind: 'betaflight', targetId: 'ports', label: 'صفحة المنافذ — ما ستضبطه أول شيء' },
  },
  {
    id: 'escs',
    titleAr: 'وحدات ESC',
    titleEn: 'ESCs',
    blurbAr: 'ما يقود المحركات. التيار المستمر لا الذروة هو الرقم الذي يجب أن تقرأه.',
    group: 'components',
    choiceAxis: 'budget',
    order: 5,
    learnLink: { kind: 'article', targetId: 'esc-ratings', label: 'كيف تُقرأ تقييمات التيار' },
  },
  {
    id: 'frames',
    titleAr: 'الهياكل',
    titleEn: 'Frames',
    blurbAr: 'ما يبقى بعد الارتطام. سماكة الذراع وتوفّر قطع الغيار أهم من الوزن بكثير.',
    group: 'components',
    choiceAxis: 'budget',
    order: 6,
  },
  {
    id: 'batteries',
    titleAr: 'البطاريات',
    titleEn: 'Batteries',
    blurbAr: 'أخطر قطعة في الصندوق. الجهد والسعة والتيار يجب أن تطابق ما بنيته، لا ما توفّر.',
    group: 'components',
    choiceAxis: 'budget',
    order: 7,
    learnLink: { kind: 'article', targetId: 'battery-safety', label: 'التخزين والشحن والتلف — اقرأ قبل الشراء' },
  },
  {
    id: 'chargers',
    titleAr: 'الشواحن',
    titleEn: 'Chargers',
    blurbAr: 'شاحن رديء يُتلف بطاريات جيدة، وأحياناً يحرق ما حولها. هذه ليست القطعة التي توفّر فيها.',
    group: 'components',
    choiceAxis: 'budget',
    order: 8,
  },
  {
    id: 'cameras',
    titleAr: 'الكاميرات',
    titleEn: 'Cameras',
    blurbAr: 'ما تراه أثناء الطيران. الأداء في الضوء المتغيّر يهم أكثر من دقّة الصورة.',
    group: 'components',
    choiceAxis: 'ecosystem',
    order: 9,
  },
  {
    id: 'vtx',
    titleAr: 'وحدات البث',
    titleEn: 'VTX',
    blurbAr: 'ما يرسل الصورة إليك. يجب أن تطابق منظومة نظارتك، ولا تُشغَّل أبداً بلا هوائي.',
    group: 'components',
    choiceAxis: 'ecosystem',
    order: 10,
    learnLink: { kind: 'video', targetId: '', label: 'مركز أدوات الفيديو' },
  },
  {
    id: 'air-units',
    titleAr: 'وحدات الطائرة الرقمية',
    titleEn: 'Air Units',
    blurbAr: 'الكاميرا والبث في وحدة واحدة داخل المنظومات الرقمية. اختيارها يتبع نظارتك لا العكس.',
    group: 'components',
    choiceAxis: 'ecosystem',
    order: 11,
  },
  {
    id: 'gps',
    titleAr: 'وحدات GPS',
    titleEn: 'GPS',
    blurbAr: 'تعرف أين هي الطائرة. تفيد في العودة والبحث عنها — ولا تجعل أي وضع عودة ضماناً.',
    group: 'components',
    choiceAxis: 'budget',
    order: 12,
  },
  {
    id: 'receivers',
    titleAr: 'المستقبلات',
    titleEn: 'Receivers',
    blurbAr: 'الطرف الآخر من رابط التحكم. يجب أن يطابق نظام جهازك ونطاقه — وإلا لن يربط إطلاقاً.',
    group: 'components',
    choiceAxis: 'budget',
    order: 13,
    learnLink: { kind: 'elrs-setup', targetId: '', label: 'إعداد ExpressLRS خطوة بخطوة' },
  },
  {
    id: 'antennas',
    titleAr: 'الهوائيات',
    titleEn: 'Antennas',
    blurbAr: 'أرخص ترقية تُحسّن المدى فعلاً. الاستقطاب والموصّل يجب أن يطابقا ما لديك.',
    group: 'components',
    choiceAxis: 'budget',
    order: 14,
  },
  {
    id: 'services',
    titleAr: 'الخدمات',
    titleEn: 'Services',
    blurbAr: 'ما نفعله نحن بعتادك: البرمجة والربط والتجميع والفحص. الإعداد مجاني مع أي طلب.',
    group: 'components',
    choiceAxis: 'budget',
    order: 16,
  },
  {
    id: 'accessories',
    titleAr: 'الإكسسوارات',
    titleEn: 'Accessories',
    blurbAr: 'الأدوات والأحزمة والحقائب وما ينقذ جلسة طيران. صغيرة، ويُنسى شراؤها دائماً.',
    group: 'components',
    choiceAxis: 'budget',
    order: 15,
  },
];

const byId = new Map(STORE_CATEGORIES.map(c => [c.id, c]));

export function storeCategory(id: string): StoreCategory | undefined {
  return byId.get(id);
}

export function categoriesInGroup(group: StoreCategory['group']): StoreCategory[] {
  return STORE_CATEGORIES.filter(c => c.group === group).sort((a, b) => a.order - b.order);
}

export const STORE_GROUP_LABEL_AR: Record<StoreCategory['group'], string> = {
  aircraft: 'الطائرات',
  components: 'القطع',
};

export const STORE_GROUP_BLURB_AR: Record<StoreCategory['group'], string> = {
  aircraft: 'ابدأ من هنا إن كنت تشتري أول طائرة، أو تضيف مقاساً جديداً إلى ما عندك.',
  components: 'لمن يعرف أي قطعة يريد — أو يستبدل واحدة تعطّلت.',
};
