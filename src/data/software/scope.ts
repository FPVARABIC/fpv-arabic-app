/**
 * What this platform does NOT cover, stated as data.
 *
 * WHY A GAP NEEDS A RECORD AT ALL
 * -------------------------------
 * A builder needs BLHeliSuite. They will look for it here. Two dishonest
 * answers were available and both were rejected:
 *
 *   omit it     — the reader concludes the platform has never heard of BLHeli,
 *                 goes looking for a page that does not exist, and eventually
 *                 stops trusting the index they were reading.
 *   thin page   — three paragraphs that LOOK like coverage, teach nothing, and
 *                 are worse than nothing because they end the search.
 *
 * The third answer is this: say exactly what exists elsewhere in the platform,
 * exactly what does not exist at all, and where the official documentation is.
 * That is a complete answer to "do you cover this?" even though the answer is
 * no.
 *
 * WHY IT LIVES IN THE CORE RATHER THAN IN THE WEB APP
 * ---------------------------------------------------
 * «هل تدعمون INAV؟» is a question, and questions get answered by the retrieval
 * layer, not by whichever surface the reader happens to be on. Putting the
 * answer in `web/` would mean the phone could not give it and a future
 * assistant would have to be taught it separately — which is precisely the
 * duplication this platform is organised to avoid. `bot` metadata is carried
 * here for the same reason: the page is usable by the answering layer the day
 * it is built, with nothing rewritten.
 *
 * WHAT MAY NOT BE WRITTEN HERE
 * ----------------------------
 * No settings, no menu paths, no pinouts, no procedures. The moment an entry
 * here starts explaining HOW to use a program, it has become the thin page this
 * file exists to refuse. Entries state coverage, not content —
 * `scripts/testWebSoftware.ts` enforces the length ceiling that keeps it so.
 */

import type { KbBotMeta, KbLink, KbSource } from '../kb/types';

export interface SoftwareScopeEntry {
  /** Matches the `scopeId` on the software hub entry that points here. */
  id: string;
  nameEn: string;
  titleAr: string;
  /** What the program IS — one line, so the reader knows they found the right gap. */
  whatItIsAr: string;
  /** Who genuinely needs it. Stops a Freestyle builder worrying about ArduPilot. */
  whoNeedsItAr: string;
  /**
   * What this platform DOES have that is relevant. Never empty without reason:
   * an entry with nothing to offer says so in `nothingRelatedAr` instead.
   */
  weHaveAr: string[];
  /** What is genuinely absent. Named specifically, not as «قيد الإنشاء». */
  weDoNotHaveAr: string[];
  /** Why it is out of scope right now. An honest reason, not an apology. */
  whyAr: string;
  /** Where the reader should actually go. Official documentation only. */
  goInsteadAr: string;
  /** Destinations inside the platform that ARE relevant, resolved by the adapter. */
  links: KbLink[];
  /** Official sources for the «go instead» claim. */
  sources: KbSource[];
  reviewedAt: string;
  bot?: KbBotMeta;
}

const REVIEWED = '2026-08-04';

/** Marks a source as the program's own documentation, checked on the date above. */
function officialDocs(title: string, url: string): KbSource {
  return { title, url, version: 'الأحدث المنشور', reviewedAt: REVIEWED, kind: 'official-docs' };
}

export const SOFTWARE_SCOPE: SoftwareScopeEntry[] = [
  {
    id: 'inav',
    nameEn: 'INAV',
    titleAr: 'INAV — غير مغطّى في المنصة',
    whatItIsAr:
      'فيرموير متحكم طيران موجّه للملاحة: نقاط مسار، وعودة تلقائية، وتثبيت ارتفاع وموقع، '
      + 'على العتاد نفسه الذي يشغّل Betaflight غالباً.',
    whoNeedsItAr:
      'من يبني جناحاً ثابتاً أو كوادكوبتر ملاحياً طويل المدى. من يبني كوادكوبتر '
      + 'Freestyle أو سباق لا يحتاجه.',
    weHaveAr: [
      'شرح متحكم الطيران نفسه — ما هو، وكيف يعمل، وحساساته ومنافذه وتغذيته — وهو مشترك بين كل الفيرموير.',
      'شرح مفهوم الـFirmware والـTarget وما يعنيه الانتقال من فيرموير إلى آخر، بما فيه أن الإعدادات لا تنتقل معه.',
      'مركز Betaflight كاملاً، وهو الفيرموير الذي تغطّيه المنصة فعلاً.',
    ],
    weDoNotHaveAr: [
      'لا صفحات لشاشات INAV Configurator ولا لحقوله.',
      'لا شرح لأوضاع الملاحة ولا لتخطيط نقاط المسار.',
      'لا إجراءات معايرة البوصلة ولا ضبط GPS الخاص بـINAV.',
    ],
    whyAr:
      'الطيران الملاحي منظومة سلامة مختلفة، لا مجرد قائمة إعدادات أخرى: أوضاعه '
      + 'تسلّم التحكم للطائرة، وتوثيقها ناقصاً أخطر من عدم توثيقها.',
    goInsteadAr: 'التوثيق الرسمي لـINAV هو المرجع، وهو محدَّث ومفصّل.',
    links: [
      { kind: 'article', targetId: 'fc-what-is', label: 'ما هو متحكم الطيران', reason: 'المفاهيم المشتركة بين كل الفيرموير' },
      { kind: 'article', targetId: 'fc-firmware-targets', label: 'الفيرموير والـTarget', reason: 'ما يعنيه الانتقال بين فيرموير وآخر' },
      { kind: 'betaflight', targetId: '', label: 'مركز Betaflight', reason: 'الفيرموير المغطّى فعلاً' },
      { kind: 'external', targetId: 'inav-docs', label: 'INAV — التوثيق الرسمي', url: 'https://github.com/iNavFlight/inav/wiki' },
    ],
    sources: [officialDocs('INAV — Wiki', 'https://github.com/iNavFlight/inav/wiki')],
    reviewedAt: REVIEWED,
    bot: {
      intents: ['explain', 'navigate', 'missing_data'],
      symptomsAr: ['هل تدعمون اناف', 'أين شرح INAV', 'أريد نقاط مسار'],
      misspellingsAr: ['اي ناف', 'inav', 'اينوف'],
      actions: [
        { kind: 'betaflight', targetId: '', label: 'افتح مركز Betaflight' },
        { kind: 'article', targetId: 'fc-firmware-targets', label: 'اقرأ عن الفيرموير والـTarget' },
      ],
      systems: ['flight-controller'],
      software: ['inav'],
      parts: ['flight-controllers'],
      requiresBeforeVerdict: [],
      safetyPrerequisitesAr: ['لا تعتمد على أي وضع ملاحي بوصفه ضماناً — اختبره في مساحة مفتوحة وبمخرج يدوي جاهز'],
    },
  },

  {
    id: 'ardupilot',
    nameEn: 'ArduPilot',
    titleAr: 'ArduPilot — خارج نطاق المنصة',
    whatItIsAr:
      'منظومة طيران ذاتي كاملة لطائرات ومركبات متعددة الأنواع، بأوضاع ملاحة ومهام '
      + 'ومسارات ومحطة أرضية.',
    whoNeedsItAr:
      'من يبني طائرة مهام أو مركبة ذاتية القيادة. لا يخصّ بناء كوادكوبتر FPV '
      + 'يدوي القيادة إطلاقاً.',
    weHaveAr: [
      'ذكر ArduPilot كأحد بدائل الفيرموير في شرح متحكم الطيران، وهذا حدّ ما تقوله المنصة عنه.',
    ],
    weDoNotHaveAr: [
      'لا صفحات إعداد، ولا شرح أوضاع، ولا تخطيط مهام.',
      'لا تغطية للمحطات الأرضية التي تُدار بها.',
    ],
    whyAr:
      'المنصة موجّهة لبناء وتشغيل طائرات FPV يدوية القيادة. ArduPilot منظومة أخرى '
      + 'بمجتمع وتوثيق ومنطق سلامة خاصة بها، وادّعاء تغطيتها جزئياً أسوأ من تركها.',
    goInsteadAr: 'التوثيق الرسمي لـArduPilot شامل ومنظّم حسب نوع المركبة.',
    links: [
      { kind: 'article', targetId: 'fc-what-is', label: 'ما هو متحكم الطيران', reason: 'حيث يُذكر ArduPilot كأحد البدائل' },
      { kind: 'external', targetId: 'ardupilot-docs', label: 'ArduPilot — التوثيق الرسمي', url: 'https://ardupilot.org/ardupilot/' },
    ],
    sources: [officialDocs('ArduPilot — Documentation', 'https://ardupilot.org/ardupilot/')],
    reviewedAt: REVIEWED,
    bot: {
      intents: ['explain', 'navigate'],
      symptomsAr: ['هل تدعمون اردوبايلوت', 'طيران ذاتي', 'مهام ونقاط مسار'],
      misspellingsAr: ['اردو بايلوت', 'ardupilot', 'اردوپايلوت'],
      actions: [{ kind: 'article', targetId: 'fc-what-is', label: 'اقرأ عن متحكم الطيران' }],
      systems: ['flight-controller'],
      software: ['ardupilot'],
      parts: ['flight-controllers'],
      requiresBeforeVerdict: [],
      safetyPrerequisitesAr: [],
    },
  },

  {
    id: 'ground-stations',
    nameEn: 'Mission Planner / QGroundControl',
    titleAr: 'المحطات الأرضية — خارج نطاق المنصة',
    whatItIsAr:
      'برامج حاسوب تُخطَّط بها المهام وتُتابَع بها الطائرة أثناء الطيران، وتُستخدم '
      + 'مع منظومات الطيران الذاتي.',
    whoNeedsItAr: 'من يشغّل ArduPilot أو PX4. لا تُستخدم في بناء FPV يدوي القيادة.',
    weHaveAr: [],
    weDoNotHaveAr: [
      'لا تغطية لأي محطة أرضية.',
      'لا تخطيط مهام ولا متابعة طيران عبر رابط تليمتري.',
    ],
    whyAr:
      'هذه أدوات تتبع منظومات لا تغطّيها المنصة أصلاً. تغطيتها تعني تغطية '
      + 'ArduPilot وPX4 أولاً، وهو ما لم يحدث.',
    goInsteadAr: 'لكل محطة توثيقها الرسمي الخاص، وهو المرجع الوحيد لإصداراتها.',
    links: [
      { kind: 'external', targetId: 'qgc-docs', label: 'QGroundControl — التوثيق الرسمي', url: 'https://docs.qgroundcontrol.com/' },
      { kind: 'external', targetId: 'mp-docs', label: 'Mission Planner — التوثيق الرسمي', url: 'https://ardupilot.org/planner/' },
    ],
    sources: [
      officialDocs('QGroundControl — User Guide', 'https://docs.qgroundcontrol.com/'),
      officialDocs('Mission Planner — Documentation', 'https://ardupilot.org/planner/'),
    ],
    reviewedAt: REVIEWED,
    bot: {
      intents: ['explain', 'navigate'],
      symptomsAr: ['محطة أرضية', 'ميشن بلانر', 'كيو جراوند كنترول'],
      misspellingsAr: ['mission planner', 'qgroundcontrol', 'gcs'],
      actions: [],
      systems: ['flight-controller'],
      software: ['ground-stations'],
      parts: [],
      requiresBeforeVerdict: [],
      safetyPrerequisitesAr: [],
    },
  },

  {
    id: 'esc',
    nameEn: 'BLHeliSuite / ESC Configurator / AM32',
    titleAr: 'أدوات الـESC — الأدوات غير مغطّاة، والمفاهيم مغطّاة',
    whatItIsAr:
      'برامج تقرأ وحدات التحكم بسرعة المحركات وتغيّر إعداداتها واتجاه دورانها '
      + 'وتحدّث فيرموريها، عبر متحكم الطيران غالباً.',
    whoNeedsItAr:
      'كل من يبني كوادكوبتر: تغيير اتجاه محرك أو تحديث فيرموير ESC أمر شائع، لا نادر.',
    weHaveAr: [
      'شرح فيرموير الـESC نفسه: BLHeli_S وBLHeli_32 وAM32، والفرق بينها وأيها يعمل على أي عتاد.',
      'شرح بروتوكولات المحركات وما يشترطه كل منها من الفيرموير والعتاد.',
      'شرح إعدادات الـESC ومعناها، مستقلاً عن البرنامج الذي تُكتب به.',
      'ترتيب المحركات واتجاه دورانها وبروتوكولها في مركز Betaflight.',
    ],
    weDoNotHaveAr: [
      'لا صفحات لواجهات BLHeliSuite أو ESC Configurator أو AM32 Configurator.',
      'لا إجراء موثّق للتحديث عبر Passthrough خطوة بخطوة.',
      'لا شرح لرسائل الخطأ الخاصة بهذه الأدوات.',
    ],
    whyAr:
      'تحديث فيرموير الـESC عملية تُتلف الوحدة إن انقطعت في منتصفها، وتوثيقها '
      + 'يتطلّب تثبّتاً من كل أداة على عتاد حقيقي. لم يتم ذلك بعد، وكتابة إجراء '
      + 'غير متثبَّت منه هنا خطر مباشر على عتاد القارئ.',
    goInsteadAr:
      'مستودعات المشاريع الرسمية هي المرجع لإصداراتها وأدواتها، ودليل الشركة '
      + 'الصانعة للوحدتك هو المرجع لما يخصّها وحدها.',
    links: [
      { kind: 'article', targetId: 'esc-firmware', label: 'فيرموير الـESC وأدواته', reason: 'الفرق بين العائلات وأيها على عتادك' },
      { kind: 'article', targetId: 'esc-protocols', label: 'بروتوكولات المحركات', reason: 'ما يشترطه كل بروتوكول' },
      { kind: 'article', targetId: 'esc-settings', label: 'إعدادات الـESC ومعناها', reason: 'المعنى، مستقلاً عن الأداة' },
      { kind: 'betaflight', targetId: 'motors', label: 'صفحة Motors في Betaflight', reason: 'الترتيب والاتجاه والبروتوكول' },
      { kind: 'external', targetId: 'am32-repo', label: 'AM32 — المستودع الرسمي', url: 'https://github.com/am32-firmware/AM32' },
      { kind: 'external', targetId: 'blheli-repo', label: 'BLHeli — المستودع الرسمي', url: 'https://github.com/bitdump/BLHeli' },
    ],
    sources: [
      officialDocs('AM32 — Repository', 'https://github.com/am32-firmware/AM32'),
      officialDocs('BLHeli — Repository', 'https://github.com/bitdump/BLHeli'),
    ],
    reviewedAt: REVIEWED,
    bot: {
      intents: ['explain', 'navigate', 'safety_warning'],
      symptomsAr: ['كيف أعكس اتجاه محرك', 'تحديث فيرموير ESC', 'بي ال هيلي'],
      misspellingsAr: ['blheli', 'am32', 'بلهيلي', 'esc configurator'],
      actions: [
        { kind: 'article', targetId: 'esc-firmware', label: 'اقرأ عن فيرموير الـESC' },
        { kind: 'betaflight', targetId: 'motors', label: 'افتح صفحة Motors' },
      ],
      systems: ['esc'],
      software: ['blheli', 'am32'],
      parts: ['escs'],
      requiresBeforeVerdict: ['فيرموير الـESC الموجود فعلاً على وحدتك'],
      safetyPrerequisitesAr: ['انزع المراوح قبل أي اختبار محرك، بلا استثناء'],
    },
  },

  {
    id: 'blackbox',
    nameEn: 'Blackbox Explorer',
    titleAr: 'أداة تحليل Blackbox — غير مغطّاة',
    whatItIsAr:
      'برنامج يفتح سجلّ الرحلة المسجَّل على متحكم الطيران ويعرضه كرسوم، لفهم '
      + 'الاهتزاز والاستجابة بعد الطيران بدل التخمين.',
    whoNeedsItAr:
      'من تجاوز الضبط المبدئي وصار يريد معرفة سبب سلوك معيّن. ليست خطوة بناء.',
    weHaveAr: [
      'شرح التخزين وBlackbox في منظومة متحكم الطيران: ما الذي يُسجَّل، وأين، ولماذا يفيد.',
    ],
    weDoNotHaveAr: [
      'لا صفحة لواجهة Blackbox Explorer ولا لقراءة رسومها.',
      'لا تفسير للمحاور ولا للمرشّحات ولا لأنماط الاهتزاز في السجلّ.',
      'صفحة Blackbox داخل مركز Betaflight مسجَّلة في الفهرس بلا محتوى بعد، وهي معلَّمة كذلك هناك.',
    ],
    whyAr:
      'قراءة السجلّ مهارة تحليل لا قائمة خطوات، وصفحة سطحية عنها تنتج استنتاجات '
      + 'خاطئة يبني عليها القارئ تغييرات في ضبط طائرته.',
    goInsteadAr: 'توثيق Betaflight الرسمي هو المرجع لتسجيل السجلّ وقراءته.',
    links: [
      { kind: 'article', targetId: 'fc-storage', label: 'التخزين وBlackbox', reason: 'ما الذي يُسجَّل وأين' },
      { kind: 'external', targetId: 'bf-blackbox-docs', label: 'Betaflight — توثيق Blackbox', url: 'https://betaflight.com/docs/wiki/guides/current/Blackbox' },
    ],
    sources: [officialDocs('Betaflight — Blackbox', 'https://betaflight.com/docs/wiki/guides/current/Blackbox')],
    reviewedAt: REVIEWED,
    bot: {
      intents: ['explain', 'navigate'],
      symptomsAr: ['كيف أقرأ البلاك بوكس', 'تحليل السجل', 'الاهتزاز في السجل'],
      misspellingsAr: ['blackbox', 'بلاك بوكس', 'الصندوق الأسود'],
      actions: [{ kind: 'article', targetId: 'fc-storage', label: 'اقرأ عن التخزين وBlackbox' }],
      systems: ['flight-controller'],
      software: ['betaflight'],
      parts: ['flight-controllers'],
      requiresBeforeVerdict: [],
      safetyPrerequisitesAr: [],
    },
  },
];

export function softwareScope(id: string): SoftwareScopeEntry | undefined {
  return SOFTWARE_SCOPE.find(s => s.id === id);
}

export const SOFTWARE_SCOPE_IDS: string[] = SOFTWARE_SCOPE.map(s => s.id);
