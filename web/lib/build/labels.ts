/**
 * Arabic-first part vocabulary — the WEB's presentation layer only.
 *
 * WHY THIS EXISTS BESIDE `PART_CATEGORY_LABEL_AR`
 * -----------------------------------------------
 * The shared core's labels («الـESC», «الـFlight Controller») lead with the
 * English term, and inside RTL sentences they wrap mid-name — the summary
 * panel rendered «الـFlight | Controller» split across lines. The owner's
 * rule for this surface is Arabic first, English as the small helper. But
 * the shared file is the PHONE's vocabulary too, and this batch must not
 * touch phone copy — so the web carries its own map, keyed identically, and
 * `scripts/testWebBuild.ts` asserts the keys stay in step with the
 * catalogue so a new category cannot ship unnamed.
 */

import { PART_CATEGORY_MAP } from '@core/data/project/store';

export interface PartVocab {
  /** The Arabic name a sentence uses. */
  ar: string;
  /** The technical term as software and shops spell it — the helper, not the name. */
  en: string;
}

export const PART_VOCAB: Record<string, PartVocab> = {
  frames: { ar: 'الإطار', en: 'Frame' },
  motors: { ar: 'المحركات', en: 'Motors' },
  propellers: { ar: 'المراوح', en: 'Props' },
  escs: { ar: 'منظّم سرعة المحركات', en: 'ESC' },
  flightControllers: { ar: 'متحكّم الطيران', en: 'FC' },
  receivers: { ar: 'المستقبل', en: 'Receiver' },
  videoUnits: { ar: 'نظام الفيديو', en: 'VTX' },
  batteries: { ar: 'البطارية', en: 'LiPo' },
  gps: { ar: 'وحدة تحديد الموقع', en: 'GPS' },
  buzzers: { ar: 'جرس التنبيه', en: 'Buzzer' },
  capacitors: { ar: 'مكثّف الطاقة', en: 'Capacitor' },
  tools: { ar: 'الأدوات', en: 'Tools' },
};

/** «الاسم العربي (EN)» — for headings and rows. */
export function partLabel(category: string): string {
  const v = PART_VOCAB[category];
  return v ? `${v.ar} (${v.en})` : category;
}

/** The Arabic name alone — for tight rows where the helper would wrap. */
export function partLabelAr(category: string): string {
  return PART_VOCAB[category]?.ar ?? category;
}

/** Every catalogue category must have a name here — asserted by the suite. */
export function vocabCoversCatalogue(): boolean {
  return Object.keys(PART_CATEGORY_MAP).every(c => !!PART_VOCAB[c]);
}

/**
 * What each SIZE means in practice — the decision, not the number.
 * Editorial use-case guidance (like the drone types' own descriptions),
 * never a specification.
 */
export const SIZE_MEANING_AR: Record<number, string> = {
  5: 'الخيار القياسي — قوة ومناورة، وأوسع تشكيلة قطع متاحة',
  7: 'أذرع أطول لمدى أبعد وثبات أعلى — بناءات الرحلات البعيدة',
};

/** What each battery voltage CHOICE means in practice. */
export const VOLTAGE_MEANING_AR: Record<number, string> = {
  4: 'أبسط وأقل كلفة — شائع في البناءات الصغيرة والبدايات',
  6: 'معيار بناءات 5 إنش الحديثة — كفاءة أعلى وتيار أقل لنفس القدرة',
};
