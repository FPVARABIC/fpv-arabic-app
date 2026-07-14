import type { BfGlossaryTerm } from './types';

/**
 * Phase 1 glossary — only the terms required to exercise the Setup and
 * Ports architecture-preview pages. Do not pre-fill speculative terms for
 * pages that don't exist yet; each future phase adds only what its own
 * pages actually use.
 */
export const bfGlossary: BfGlossaryTerm[] = [
  {
    id: 'setup',
    en: 'Setup',
    ar: 'الإعداد الأولي',
    explanation: 'أول تبويب تراه بعد الاتصال بالـ FC — يعرض حالة الحساسات، اتجاه الطائرة الحي، ومعلومات النظام.',
    relatedPageIds: ['setup'],
  },
  {
    id: 'ports',
    en: 'Ports',
    ar: 'المنافذ',
    explanation: 'التبويب الذي تحدد فيه وظيفة كل UART فعلي على لوحة التحكم (مستقبل، تليمتري، GPS، ...).',
    relatedPageIds: ['ports'],
  },
  {
    id: 'msp',
    en: 'MSP',
    ar: 'بروتوكول MultiWii التسلسلي',
    explanation: 'البروتوكول الذي يتواصل به Betaflight Configurator مع الـ FC عبر USB أو UART.',
    relatedTerms: ['UART'],
    relatedPageIds: ['ports', 'setup'],
  },
  {
    id: 'uart',
    en: 'UART',
    ar: 'منفذ تسلسلي',
    explanation: 'منفذ اتصال تسلسلي فعلي على لوحة التحكم؛ كل UART يمكن أن يخدم وظيفة واحدة فقط في نفس الوقت.',
    relatedTerms: ['MSP', 'Serial RX'],
    relatedPageIds: ['ports'],
  },
  {
    id: 'serial-rx',
    en: 'Serial Rx',
    ar: 'استقبال المستقبل عبر منفذ تسلسلي',
    explanation: 'تفعيل استقبال إشارة جهاز التحكم (Receiver) عبر UART محدد؛ يسمح بمستقبل واحد فقط في كل مرة.',
    relatedTerms: ['UART'],
    relatedPageIds: ['ports'],
  },
  {
    id: 'save-and-reboot',
    en: 'Save and Reboot',
    ar: 'حفظ وإعادة تشغيل',
    explanation: 'الزر الذي يحفظ التغييرات في ذاكرة الـ FC ويعيد تشغيله لتطبيقها؛ التغييرات غير المحفوظة تُفقد عند قطع الاتصال.',
    relatedPageIds: ['setup', 'ports'],
  },
  {
    id: 'arming-disable-flags',
    en: 'Arming Disable Flags',
    ar: 'أسباب منع التسليح',
    explanation: 'قائمة تُظهر لماذا لا يمكن تسليح (Arm) الطائرة حاليًا — مثل عدم معايرة الحساس أو ضعف جهد البطارية.',
    relatedPageIds: ['setup'],
  },
];
