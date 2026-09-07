/**
 * The safety gates — the four checkpoints the wizard refuses to skip.
 *
 * WHERE THE ITEMS COME FROM
 * -------------------------
 * The pre-battery and pre-flight gates read `checklistsData` from the shared
 * core VERBATIM — those lists already exist, are already reviewed, and are
 * already shown in «مشروعي»; retyping them here would fork them. The motor
 * test and failsafe gates cover ground the shared checklists state as single
 * items («Motor direction صحيح», «Failsafe مضبوط ومختبر») — here each is
 * expanded into the confirmations that make the single item TRUE, in the
 * order they are performed. No item invents a spec; every one is a procedure.
 *
 * WHY A GATE IS ITEMS AND NOT PROSE
 * ---------------------------------
 * «لا تسمح للـWizard بالقفز مباشرة من تركيب القطع إلى أول طيران» — a
 * paragraph can be scrolled past, a required checklist cannot. The wizard
 * disables «التالي» until every item of the current gate is confirmed, and
 * stores confirmations in the draft so revisiting a gate keeps them.
 */

import { checklistsData } from '@core/data/checklistsData';

export interface SafetyGate {
  /** Matches the BUILD_PATH step id. */
  stepId: string;
  headlineAr: string;
  /** The one sentence explaining what this gate protects against. */
  stakesAr: string;
  items: readonly string[];
}

function checklistItems(groupId: string): string[] {
  const group = checklistsData.find(g => g.id === groupId);
  if (!group) throw new Error(`[build] shared checklist group missing: ${groupId}`);
  return group.items.map(i => i.text);
}

export const SAFETY_GATES: readonly SafetyGate[] = [
  {
    stepId: 'prebattery',
    headlineAr: 'قبل توصيل البطارية — كل بند إلزامي',
    stakesAr:
      'قطبية معكوسة أو جسر لحام واحد يكفي لإتلاف كل الإلكترونيات في أول ثانية. '
      + 'هذه القائمة هي نفسها قائمة «قبل البطارية» الموثقة في المنصة.',
    items: checklistItems('pre-battery'),
  },
  {
    stepId: 'motortest',
    headlineAr: 'اختبار المحركات — المراوح منزوعة أولاً',
    stakesAr:
      'محرك يدور بمروحة مركبة أثناء الإعداد هو أكثر إصابات البناء شيوعاً. '
      + 'النزع ليس احتياطاً زائداً — إنه شرط البدء.',
    items: [
      'المراوح منزوعة تماماً عن المحركات الأربعة',
      'اختبرت كل محرك منفرداً من تبويب Motors في برنامج الإعداد',
      'ترتيب المحركات مطابق لمخطط البرنامج (Motor order)',
      'اتجاه دوران كل محرك صحيح حسب المخطط',
      'لا صوت احتكاك أو اهتزاز غير طبيعي عند الدوران البطيء',
    ],
  },
  {
    stepId: 'failsafe',
    headlineAr: 'الريسيفر وFailsafe والأوضاع — يُختبر قبل أن يُحتاج',
    stakesAr:
      'Failsafe هو ما يفعله الدرون حين تنقطع الإشارة. ضبطه بعد أول طيران '
      + 'يعني أن أول انقطاع يحسم النتيجة بدلاً منك.',
    items: [
      'الريسيفر مربوط بجهاز التحكم وكل القنوات تستجيب في تبويب Receiver',
      'حركة كل عصا تطابق اتجاهها على الشاشة (لا قنوات معكوسة)',
      'وضع Arm على مفتاح واضح ويعمل، وDisarm فوري',
      'ضبطت سلوك Failsafe واختبرته فعلياً بإطفاء جهاز التحكم',
      'وضع Angle مفعّل ومربوط بمفتاح لأول طيران',
    ],
  },
  {
    stepId: 'preflight',
    headlineAr: 'قبل أول طيران — القائمة الكاملة',
    stakesAr:
      'نفس قائمة «قبل أول طيران» الموثقة في المنصة — بنداً بنداً، '
      + 'ولا يفتح الوضع الأخير قبل اكتمالها.',
    items: checklistItems('pre-flight'),
  },
];

export function gateFor(stepId: string): SafetyGate | undefined {
  return SAFETY_GATES.find(g => g.stepId === stepId);
}
