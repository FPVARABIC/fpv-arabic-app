/**
 * Batteries and power systems — the fifth module, closing batch one.
 *
 * SCOPE BOUNDARY WITH THE FLIGHT CONTROLLER MODULE
 * ------------------------------------------------
 * `fc-power` owns the flight-controller SIDE of on-board power: which rail
 * exists on that board, what its current limit is, how the voltage divider and
 * ADC turn a raw number into a reading. This module owns the SYSTEM side: where
 * the energy comes from, how it is distributed across the whole aircraft, where
 * the grounds meet, and what the battery itself does under load. The two link
 * to each other rather than repeating each other.
 *
 * `requiredCoverage` omits two of the 28 axes:
 *   protocols    — a battery speaks none; ESC telemetry belongs to the ESC module
 *   updatability — batteries and passive power components carry no firmware
 *
 * SAFETY POSTURE
 * --------------
 * This is the most dangerous subsystem on the aircraft, and the only one whose
 * failure mode is fire. The safety article deliberately declines to give any
 * home disposal procedure: the requirements differ by country, several widely
 * circulated methods turned out to be unsafe, and the correct answer is always
 * the local collection point. Saying "ask them" is more useful than inventing a
 * procedure that sounds authoritative.
 */

import type { KbModule } from '../../types';

import { batteryWhatIs, batteryTypes, batterySpecs } from './articles/battery';
import { batteryVoltage, batterySelection, batteryConnectors } from './articles/usage';
import { batteryCharging, batterySafety } from './articles/charging';
import { powerRails, powerNoise, powerProtection } from './articles/system';
import { powerMath } from './articles/math';

export const powerModule: KbModule = {
  id: 'power-battery',
  titleAr: 'البطاريات وأنظمة الطاقة',
  titleEn: 'Batteries and power systems',
  domain: 'power-battery',
  icon: 'BatteryCharging',
  summaryAr:
    'مصدر الطاقة كله، وأكثر أنظمة الطائرة خطراً. اثنا عشر مقالاً تغطي الخلية والأنواع والمواصفات والجهد وهبوطه، والاختيار والموصلات والشحن والسلامة، وتوزيع الطاقة والضجيج والحماية وحسابات زمن الطيران.',
  levels: ['zero', 'beginner', 'basic', 'intermediate', 'advanced', 'pro'],
  lastReviewed: '2026-08',
  requiredCoverage: [
    'definition', 'principle', 'components', 'types', 'comparison', 'compatibility',
    'power', 'installation', 'wiring', 'configuration', 'testing', 'performance',
    'safety', 'failures', 'diagnostics', 'maintenance', 'applications',
    'beginner', 'intermediate', 'advanced', 'pro', 'terminology', 'sources',
    'internalLinks', 'search', 'assessment',
  ],
  articles: [
    batteryWhatIs,
    batteryTypes,
    batterySpecs,
    batteryVoltage,
    batterySelection,
    batteryConnectors,
    batteryCharging,
    batterySafety,
    powerRails,
    powerNoise,
    powerProtection,
    powerMath,
  ],
  paths: [
    {
      id: 'power-path-beginner',
      titleAr: 'من الصفر: تعامل مع البطارية بأمان',
      audienceAr: 'اشتريت أول بطارية ولا تعرف كيف تشحنها ولا تخزّنها ولا متى تتوقف عن استعمالها.',
      level: 'beginner',
      articleIds: ['battery-what-is', 'battery-connectors', 'battery-charging', 'battery-safety'],
      outcomeAr: 'تستطيع شحن بطاريتك بأمان، وتخزينها بشكل صحيح، والتعرف على علامات الخطر قبل أن تتحول إلى حادث.',
    },
    {
      id: 'power-path-choose',
      titleAr: 'مسار الشراء: أي بطارية تناسب مشروعي؟',
      audienceAr: 'تبني الآن أو تريد ترقية بطارياتك وتحتاج قراراً صحيحاً قبل الدفع.',
      level: 'basic',
      articleIds: ['battery-types', 'battery-specs', 'battery-selection', 'power-math'],
      outcomeAr: 'تستطيع قراءة أي مواصفة بطارية، والمقارنة بينها مقارنةً عادلة، واختيار ما يناسب نمط سحبك ووزن طائرتك.',
    },
    {
      id: 'power-path-system',
      titleAr: 'المسار الهندسي: الطاقة في كل الطائرة',
      audienceAr: 'تبني بنفسك وتريد فهم مسار الطاقة كاملاً قبل أن تلحم.',
      level: 'advanced',
      articleIds: ['power-rails', 'power-noise', 'power-protection', 'battery-voltage'],
      outcomeAr: 'تستطيع رسم خريطة طاقة كاملة لطائرتك، وحساب حمل كل خط، وتفسير الضجيج وإعادة التشغيل، وفحص القصر قبل أول توصيل.',
    },
    {
      id: 'power-path-fix',
      titleAr: 'مسار العطل: هبوط جهد أو ضجيج أو بطارية تسخن',
      audienceAr: 'لديك مشكلة الآن وتشك أن مصدرها البطارية أو نظام الطاقة.',
      level: 'intermediate',
      articleIds: ['battery-voltage', 'power-noise', 'battery-safety', 'power-protection'],
      outcomeAr: 'تستطيع التمييز بين هبوط الجهد والتموّج وإعادة التشغيل، وعزل السبب بين البطارية والأسلاك والضجيج، والتوقف في الوقت الصحيح.',
    },
  ],
};
