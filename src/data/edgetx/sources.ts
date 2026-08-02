import type { KbSource } from '../kb/types';

/**
 * Sources shared across the EdgeTX centre — one edit point when a version moves.
 *
 * Every page cites at least one of these. The version string is part of the
 * claim: «هذا صحيح على EdgeTX 2.10» is a statement we can stand behind, while
 * «هذا صحيح في EdgeTX» is one we cannot.
 */

export const EDGETX_MANUAL: KbSource = {
  title: 'EdgeTX — الدليل الرسمي',
  url: 'https://manual.edgetx.org/',
  version: 'EdgeTX 2.10',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

export const EDGETX_REPO: KbSource = {
  title: 'EdgeTX — المستودع الرسمي',
  url: 'https://github.com/EdgeTX/edgetx',
  version: 'EdgeTX 2.10',
  reviewedAt: '2026-08',
  kind: 'repo',
};

export const ELRS_DOCS: KbSource = {
  title: 'ExpressLRS — التوثيق الرسمي',
  url: 'https://www.expresslrs.org/',
  version: 'ExpressLRS 3.x',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

export const ELRS_LUA: KbSource = {
  title: 'ExpressLRS — دليل Lua على جهاز الإرسال',
  url: 'https://www.expresslrs.org/quick-start/transmitters/lua-howto/',
  version: 'ExpressLRS 3.x',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

export const ELRS_MODEL_MATCH: KbSource = {
  title: 'ExpressLRS — Model Match',
  url: 'https://www.expresslrs.org/software/model-match/',
  version: 'ExpressLRS 3.x',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

export const BF_SERIAL_RX: KbSource = {
  title: 'Betaflight — دليل المستقبل التسلسلي',
  url: 'https://betaflight.com/docs/wiki/guides/current/scr-serial-receiver',
  version: 'Betaflight 4.5',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

export const BF_FAILSAFE: KbSource = {
  title: 'Betaflight — Failsafe',
  url: 'https://betaflight.com/docs/wiki/configurator/failsafe-tab',
  version: 'Betaflight 4.5',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

export const RADIO_VENDOR: KbSource = {
  title: 'دليل جهاز الإرسال من الشركة المصنّعة',
  version: 'يختلف حسب الطراز — اقرأ دليل جهازك',
  reviewedAt: '2026-08',
  kind: 'manufacturer',
};

export const RC_PRINCIPLE: KbSource = {
  title: 'مبادئ أنظمة التحكم الراديوي: المدخلات والمزج والقنوات',
  version: 'عام (غير مرتبط بإصدار)',
  reviewedAt: '2026-08',
  kind: 'engineering',
  generalPrinciple: true,
};

/**
 * The caveat reused on every page whose menu path can move between releases.
 *
 * EdgeTX reorganises menus between versions and between radio hardware. Stating
 * a path as if it were permanent would be the kind of invented specific this
 * platform forbids, so every page carries the principle plus this caveat.
 */
export const PATH_CAVEAT =
  'المسار أدناه مُراجَع على EdgeTX 2.10، وقد يختلف موضعه في إصدار آخر أو على راديو بواجهة مختلفة. المبدأ ثابت والموضع المرئي ليس كذلك — إن لم تجد العنصر في مكانه فابحث عنه بالاسم الإنجليزي في قوائم جهازك أو في دليل إصدارك.';

/** The version note every page carries, on top of anything specific to it. */
export const VERSION_NOTE_GENERIC =
  'كل ما هنا مُراجَع على EdgeTX 2.10. أسماء القوائم ومواضعها تغيّرت بين الإصدارات أكثر من مرة، فإن اختلف ما تراه على جهازك فالمرجع هو دليل إصدارك أنت لا هذا الشرح.';
