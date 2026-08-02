/**
 * Flight Controller — the first fully-authored KB module.
 *
 * This is the vertical slice the platform spec asks for: one system covered end
 * to end (concept → hardware → selection → wiring → firmware → setup → testing →
 * diagnosis), serving a complete beginner and a working professional from the
 * same articles through the layer system, and cross-linked into the lessons,
 * Betaflight, assembly and diagnostics subsystems that already exist.
 *
 * `requiredCoverage` lists all 28 axes because every one of them genuinely
 * applies to a flight controller. `scripts/testKbModel.ts` verifies each claimed
 * axis is backed by a real article with real content — the matrix is not a
 * self-report.
 */

import type { KbModule } from '../../types';

import { fcWhatIs, fcControlLoop } from './articles/foundations';
import { fcMcu, fcSensors, fcPorts } from './articles/hardware';
import { fcPower, fcOutputs } from './articles/powerAndIo';
import { fcStorage, fcUsbBootloader, fcFormFactors, fcPinout } from './articles/platform';
import { fcMounting, fcSelection, fcFirmwareTargets } from './articles/buildAndOps';
import { fcFirstSetup, fcTesting, fcFailures } from './articles/verification';

export const flightControllerModule: KbModule = {
  id: 'flight-controller',
  titleAr: 'متحكم الطيران',
  titleEn: 'Flight Controller',
  domain: 'flight-controller',
  icon: 'Cpu',
  summaryAr:
    'المنظومة التي تربط كل شيء في الطائرة: تقرأ الحساسات، تفهم أوامرك، وتقود المحركات. سبعة عشر مقالاً تغطي المفهوم والعتاد والاختيار والتوصيل والفيرموير والإعداد والاختبار والتشخيص.',
  levels: ['zero', 'beginner', 'basic', 'intermediate', 'advanced', 'pro'],
  lastReviewed: '2026-08',
  requiredCoverage: [
    'definition', 'principle', 'components', 'types', 'comparison', 'compatibility',
    'power', 'protocols', 'installation', 'wiring', 'configuration', 'testing',
    'performance', 'safety', 'failures', 'diagnostics', 'maintenance', 'applications',
    'beginner', 'intermediate', 'advanced', 'pro', 'terminology', 'sources',
    'internalLinks', 'search', 'assessment', 'updatability',
  ],
  articles: [
    fcWhatIs,
    fcControlLoop,
    fcMcu,
    fcSensors,
    fcPorts,
    fcPower,
    fcOutputs,
    fcStorage,
    fcUsbBootloader,
    fcFormFactors,
    fcPinout,
    fcMounting,
    fcSelection,
    fcFirmwareTargets,
    fcFirstSetup,
    fcTesting,
    fcFailures,
  ],
  paths: [
    {
      id: 'fc-path-beginner',
      titleAr: 'من الصفر إلى فهم اللوحة',
      audienceAr: 'لم تركّب متحكم طيران من قبل ولا تعرف ما الذي يفعله بالضبط.',
      level: 'beginner',
      articleIds: ['fc-what-is', 'fc-form-factors', 'fc-sensors', 'fc-mounting', 'fc-first-setup', 'fc-failures'],
      outcomeAr: 'تستطيع شرح ما يفعله متحكم الطيران، وتركيبه بشكل صحيح، وإجراء أول إعداد كامل بأمان.',
    },
    {
      id: 'fc-path-builder',
      titleAr: 'مسار البنّاء: من الاختيار إلى أول تشغيل',
      audienceAr: 'تبني طائرة الآن وتحتاج قرارات صحيحة قبل اللحام.',
      level: 'basic',
      articleIds: ['fc-selection', 'fc-pinout', 'fc-ports', 'fc-power', 'fc-outputs', 'fc-first-setup', 'fc-testing'],
      outcomeAr: 'تستطيع اختيار لوحة مناسبة لمشروعك، وقراءة مخططها، وتخطيط منافذها وطاقتها، وتشغيلها أول مرة بأمان.',
    },
    {
      id: 'fc-path-deep',
      titleAr: 'الفهم العميق: كيف تعمل اللوحة فعلاً',
      audienceAr: 'تطير بالفعل وتريد فهم النظام لا حفظ خطوات تشغيله.',
      level: 'advanced',
      articleIds: ['fc-control-loop', 'fc-mcu', 'fc-sensors', 'fc-ports', 'fc-storage', 'fc-firmware-targets'],
      outcomeAr: 'تستطيع تتبّع أي سلوك في الطيران إلى مرحلته في حلقة التحكم، وقراءة السجل، وإدارة الفيرموير بثقة.',
    },
    {
      id: 'fc-path-fix',
      titleAr: 'مسار العطل: شيء ما لا يعمل',
      audienceAr: 'لديك مشكلة الآن وتريد تشخيصها بالترتيب الصحيح.',
      level: 'intermediate',
      articleIds: ['fc-testing', 'fc-usb-bootloader', 'fc-power', 'fc-outputs', 'fc-failures'],
      outcomeAr: 'تستطيع تحديد أي منظومة فشلت في اللوحة، واستبعاد السليم، والوصول إلى السبب بدل استبدال قطع سليمة.',
    },
  ],
};
