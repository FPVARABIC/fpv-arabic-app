import type { BfPage } from '../types';
import { makeConfiguratorSourceRef, BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * ARCHITECTURE-PREVIEW — not a complete page.
 *
 * Verified verbatim against the cloned Configurator source (tag 2025.12.2):
 * src/components/tabs/PortsTab.vue (structure — this tab has already
 * migrated to Vue) and locales/en/messages.json (exact English strings).
 * The real page renders one row per physical UART with these columns;
 * this fixture models the column set as fields once (not per-UART row),
 * which is enough to exercise the renderer honestly — a real Phase 2
 * implementation would render the per-UART table itself.
 */

const source = makeConfiguratorSourceRef({
  title: 'Betaflight App — Ports tab',
  repoPath: 'src/components/tabs/PortsTab.vue',
  applicability: 'universal',
  officialId: 'ports',
});

export const portsPage: BfPage = {
  id: 'ports',
  officialId: 'ports',
  officialTitle: 'Ports',
  titleAr: 'المنافذ',
  officialOrder: 18,
  summaryAr: 'تحديد وظيفة كل UART فعلي على لوحة التحكم — مستقبل، تليمتري، حساسات، أو أجهزة طرفية.',
  connectionState: 'connected',
  contentStatus: 'architecture-preview',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source,
  expertRequired: false,
  scope: 'universal',
  safetyLevel: 'warning',
  glossaryTermIds: ['ports', 'uart', 'msp', 'serial-rx', 'save-and-reboot'],
  relatedPageIds: ['setup', 'receiver', 'gps', 'vtx', 'blackbox'],
  groups: [
    {
      id: 'assignment',
      titleAr: 'تعيين وظيفة كل منفذ',
      level: 'basic',
      order: 1,
      fields: [
        {
          id: 'identifier',
          englishLabel: 'Identifier',
          arabicMeaning: 'معرّف المنفذ',
          arabicExplanation: 'اسم الـ UART الفعلي على اللوحة (مثل UART1)، حسب دليل لوحتك.',
          group: 'assignment',
          controlType: 'status',
          scope: 'universal',
          safetyLevel: 'informational',
          requiresSave: false,
          requiresReboot: false,
          source,
        },
        {
          id: 'configuration-msp',
          englishLabel: 'Configuration/MSP',
          arabicMeaning: 'تفعيل MSP على هذا المنفذ',
          arabicExplanation: 'i18n: portsMSPHelp — لا تعطّل MSP على أول منفذ تسلسلي إلا إذا كنت متأكدًا؛ قد تحتاج لإعادة فلاش ومسح إعداداتك إذا فعلت.',
          group: 'assignment',
          controlType: 'toggle',
          scope: 'universal',
          safetyLevel: 'critical',
          requiresSave: true,
          requiresReboot: true,
          source,
        },
        {
          id: 'serial-rx',
          englishLabel: 'Serial Rx',
          arabicMeaning: 'استقبال المستقبل عبر هذا المنفذ',
          arabicExplanation: 'i18n: portsSerialRxHelp — تفعيل أو تعطيل استقبال إشارة جهاز التحكم على UART محدد؛ مسموح بمنفذ واحد فقط.',
          group: 'assignment',
          controlType: 'toggle',
          scope: 'universal',
          safetyLevel: 'warning',
          beginnerGuidance: 'تفعيله على أكثر من منفذ في نفس الوقت يمنع المستقبل من العمل بشكل صحيح.',
          requiresSave: true,
          requiresReboot: true,
          source,
        },
        {
          id: 'telemetry-output',
          englishLabel: 'Telemetry Output',
          arabicMeaning: 'مخرج التليمتري',
          arabicExplanation: 'اختيار بروتوكول التليمتري (إن وجد) الذي يُرسَل على هذا المنفذ، مع معدل الباود الخاص به.',
          group: 'assignment',
          controlType: 'select',
          scope: 'universal',
          safetyLevel: 'caution',
          requiresSave: true,
          requiresReboot: true,
          source,
        },
        {
          id: 'sensor-input',
          englishLabel: 'Sensor Input',
          arabicMeaning: 'مدخل حساس خارجي',
          arabicExplanation: 'اختيار نوع الحساس المتصل (مثل GPS) على هذا المنفذ، مع معدل الباود الخاص به.',
          group: 'assignment',
          controlType: 'select',
          scope: 'universal',
          safetyLevel: 'caution',
          requiresSave: true,
          requiresReboot: true,
          source,
        },
        {
          id: 'peripherals',
          englishLabel: 'Peripherals',
          arabicMeaning: 'جهاز طرفي',
          arabicExplanation: 'اختيار وظيفة طرفية أخرى (مثل Blackbox عبر منفذ خارجي) على هذا المنفذ.',
          group: 'assignment',
          controlType: 'select',
          scope: 'universal',
          safetyLevel: 'informational',
          requiresSave: true,
          requiresReboot: true,
          source,
        },
      ],
    },
  ],
};
