/**
 * ESC — the fourth fully-authored KB module, and the first to require ALL 28
 * coverage axes.
 *
 * WHY ALL 28
 * ----------
 * Motors and propellers legitimately omitted `protocols`, `wiring` and
 * `updatability`: a motor speaks no protocol, a propeller has no wires, neither
 * carries firmware. The ESC is the opposite — it is the only component in the
 * propulsion chain that does all three. It speaks DShot, it carries the densest
 * wiring in the aircraft, and it runs its own firmware that can be reflashed.
 * The boundary the motors module declared ("`protocols` belongs to the ESC
 * module") is honoured here rather than quietly forgotten.
 *
 * SCOPE SPLIT WITH THE FLIGHT CONTROLLER MODULE
 * ---------------------------------------------
 * `fc-outputs` owns the flight-controller SIDE of the motor output: which timer
 * and DMA channel an output sits on, and why an output cannot be remapped
 * freely. This module owns the ESC side: what the protocol carries, what the
 * ESC does with it, and what comes back. Neither repeats the other; both link.
 */

import type { KbModule } from '../../types';

import { escWhatIs, escAnatomy, escCommutation } from './articles/fundamentals';
import { escFormFactors, escRatings } from './articles/hardware';
import { escProtocols, escFirmware, escSettings } from './articles/software';
import { escSelection, escInstallation } from './articles/practice';
import { escTesting, escFailures } from './articles/verification';

export const escModule: KbModule = {
  id: 'esc',
  titleAr: 'منظّم السرعة (ESC)',
  titleEn: 'Electronic Speed Controller',
  domain: 'esc',
  icon: 'CircuitBoard',
  summaryAr:
    'الجسر بين أمر متحكم الطيران وتيار المحرك الحقيقي، والقطعة الوحيدة التي تمرّ فيها الطاقة الكاملة والإشارة الدقيقة معاً. اثنا عشر مقالاً تغطي البنية والتبديل وفقد التزامن والتصنيفات والبروتوكولات والـFirmware والإعدادات والاختيار والتركيب والاختبار والأعطال.',
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
    escWhatIs,
    escAnatomy,
    escCommutation,
    escFormFactors,
    escRatings,
    escProtocols,
    escFirmware,
    escSettings,
    escSelection,
    escInstallation,
    escTesting,
    escFailures,
  ],
  paths: [
    {
      id: 'esc-path-beginner',
      titleAr: 'من الصفر: ما هذه اللوحة التي تحت متحكم الطيران؟',
      audienceAr: 'تعرف أن هناك قطعة اسمها ESC ولا تعرف ما تفعله ولا لماذا توجد.',
      level: 'beginner',
      articleIds: ['esc-what-is', 'esc-form-factors', 'esc-installation', 'esc-testing'],
      outcomeAr: 'تستطيع شرح دور الـESC، والتمييز بين البنى، وتوصيله بأمان، واختباره بالترتيب الصحيح قبل أي مروحة.',
    },
    {
      id: 'esc-path-choose',
      titleAr: 'مسار الشراء: أي ESC يناسب مشروعي؟',
      audienceAr: 'تبني الآن وتحتاج قراراً صحيحاً قبل الدفع.',
      level: 'basic',
      articleIds: ['esc-ratings', 'esc-form-factors', 'esc-protocols', 'esc-selection'],
      outcomeAr: 'تستطيع قراءة أي مواصفة، والتمييز بين التيار المستمر والذروة، واختيار وحدة تترك هامشاً وتدعم ما تحتاجه فعلاً.',
    },
    {
      id: 'esc-path-software',
      titleAr: 'المسار البرمجي: البروتوكول والـFirmware والإعدادات',
      audienceAr: 'طائرتك تطير وتريد إتقان الجانب البرمجي بدل نسخ إعدادات الآخرين.',
      level: 'advanced',
      articleIds: ['esc-protocols', 'esc-firmware', 'esc-settings', 'esc-commutation'],
      outcomeAr: 'تستطيع اختيار البروتوكول بوعي، وتحديث الـFirmware بأمان مع نسخة وخطة استعادة، وتغيير إعداد لعرَض محدد لا بالتخمين.',
    },
    {
      id: 'esc-path-fix',
      titleAr: 'مسار العطل: محرك يتقطع أو ESC يسخن أو لا يظهر في البرنامج',
      audienceAr: 'لديك مشكلة الآن وتشك أن مصدرها الـESC.',
      level: 'intermediate',
      articleIds: ['esc-testing', 'esc-commutation', 'esc-anatomy', 'esc-failures'],
      outcomeAr: 'تستطيع عزل العطل بين اللحام والحمل والإعداد والعتاد، وتقرر بثقة: أعد اللحام، أو خفّض الحمل، أو استبدل الوحدة.',
    },
  ],
};
