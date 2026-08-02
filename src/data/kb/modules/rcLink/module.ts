/**
 * RC LINK — the sixth fully-authored KB module, and the first written after the
 * project spine existed.
 *
 * WHY THIS MODULE NEXT
 * --------------------
 * The receiver was already a part the user could put in a project, and the
 * UART-budget rule already counted it, but nothing in the encyclopedia
 * explained it. That is exactly the gap the platform vision forbids: a
 * component the build flow knows about and the knowledge side does not.
 *
 * It is also the module the software pillar depends on. The ExpressLRS and
 * binding pages that come later are *procedures*; they are only safe to follow
 * once the reader knows what a packet rate trades away and why a failsafe is
 * not optional. Writing the procedures first would have produced steps without
 * understanding.
 *
 * SCOPE SPLIT
 * -----------
 * `fc-ports` owns the flight-controller side of the serial port: which UART is
 * free, which supports inversion, what else is competing for it. This module
 * owns the receiver side: what language it speaks, what it needs on the wire,
 * and what comes back down. Neither repeats the other; both link.
 *
 * The antenna article covers antennas AS PART OF THE CONTROL LINK only. Video
 * antennas are a different polarisation problem with different hardware, and
 * they belong to the video module when it is written — this module does not
 * quietly annex them.
 *
 * ON NOT INVENTING NUMBERS
 * ------------------------
 * Packet-rate tables, sensitivity limits and baud rates deliberately do NOT
 * appear as fixed figures here. They differ between systems, bands and firmware
 * versions, and a number that is right for one reader and wrong for another is
 * worse than no number. Every place a reader would expect one says where the
 * authoritative value lives instead.
 */

import type { KbModule } from '../../types';

import { rcWhatIs, rcRadio, rcTxModules } from './articles/fundamentals';
import { rcReceivers, rcAntennas, rcLinkQuality } from './articles/hardware';
import { rcProtocols, rcSerialProtocols, rcElrs } from './articles/protocols';
import { rcBinding, rcFailsafe } from './articles/practice';
import { rcTesting, rcFailures } from './articles/verification';

export const rcLinkModule: KbModule = {
  id: 'rc-link',
  titleAr: 'رابط التحكم والمستقبلات',
  titleEn: 'Control Link & Receivers',
  domain: 'radio-control',
  icon: 'RadioTower',
  summaryAr:
    'الوصلة الوحيدة بينك وبين الطائرة التي لا يوجد لها سلك احتياطي. ثلاثة عشر مقالاً تغطي جهاز الإرسال ووحداته والمستقبلات والهوائيات والأنظمة الراديوية والبروتوكولات التسلسلية وExpressLRS والربط والـFailsafe واختبار المدى وأعطال الرابط.',
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
    rcWhatIs,
    rcRadio,
    rcTxModules,
    rcReceivers,
    rcAntennas,
    rcLinkQuality,
    rcProtocols,
    rcSerialProtocols,
    rcElrs,
    rcBinding,
    rcFailsafe,
    rcTesting,
    rcFailures,
  ],
  paths: [
    {
      id: 'rc-path-beginner',
      titleAr: 'من الصفر: كيف تصل أوامري إلى الطائرة؟',
      audienceAr: 'اشتريت جهازاً ومستقبلاً ولا تعرف ما الفرق بين النظام والبروتوكول ولا من أين تبدأ.',
      level: 'beginner',
      articleIds: ['rc-what-is', 'rc-radio', 'rc-receivers', 'rc-binding'],
      outcomeAr: 'تستطيع شرح مكوّنات الرابط، وتوصيل مستقبل بالجهد الصحيح، وربطه، والتحقق من ظهور القنوات قبل أي مروحة.',
    },
    {
      id: 'rc-path-safety',
      titleAr: 'مسار السلامة: ألّا تطير طائرتك بعيداً',
      audienceAr: 'تطير بالفعل ولم تختبر ما يحدث حين ينقطع الرابط.',
      level: 'basic',
      articleIds: ['rc-failsafe', 'rc-link-quality', 'rc-testing', 'rc-what-is'],
      outcomeAr: 'تستطيع ضبط سلوك فقد الإشارة واختباره فعلياً، وقراءة أرقام الرابط لتقرر متى تعود قبل أن تفقد السيطرة.',
    },
    {
      id: 'rc-path-range',
      titleAr: 'مسار المدى: كيف أطير أبعد بأمان',
      audienceAr: 'تريد مدى أطول ولا تعرف أين المشكلة: الهوائي أم الإعداد أم القدرة.',
      level: 'advanced',
      articleIds: ['rc-antennas', 'rc-link-quality', 'rc-elrs', 'rc-testing'],
      outcomeAr: 'تستطيع تشخيص ضعف المدى بالترتيب الصحيح، وضبط معدل الرزم والقدرة بوعي، وإثبات التحسن باختبار مُسجَّل.',
    },
    {
      id: 'rc-path-choose',
      titleAr: 'مسار الشراء: أي نظام ووحدة يناسبانني؟',
      audienceAr: 'تريد شراء جهاز أو وحدة أو نظام ولا تعرف على أي أساس تقارن.',
      level: 'basic',
      articleIds: ['rc-protocols', 'rc-tx-modules', 'rc-radio', 'rc-receivers'],
      outcomeAr: 'تستطيع اختيار نظام ووحدة على أساس نوع طيرانك ومسافتك وقدرتك على الصيانة، لا على أساس رقم في إعلان.',
    },
    {
      id: 'rc-path-fix',
      titleAr: 'مسار العطل: لا يربط، أو لا قنوات، أو يتقطع',
      audienceAr: 'لديك مشكلة الآن ولا تعرف أهي كهرباء أم راديو أم سلك.',
      level: 'intermediate',
      articleIds: ['rc-failures', 'rc-serial-protocols', 'rc-binding', 'rc-receivers'],
      outcomeAr: 'تستطيع تصنيف العطل في إحدى ثلاث مجموعات خلال دقيقة، ثم اتباع ترتيب فحص يبدأ من الأأمن والأرخص.',
    },
  ],
};
