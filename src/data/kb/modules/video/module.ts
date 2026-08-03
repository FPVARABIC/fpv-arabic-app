/**
 * VIDEO — the seventh KB module, and the first written after a full audit of
 * what the platform already said about the subject.
 *
 * WHY THIS MODULE, AND WHY IT LOOKS LIKE THIS
 * -------------------------------------------
 * Video was the largest hole in the platform, but not the way it looked from
 * outside. The catalogue already carried video units. The Betaflight reference
 * already described the OSD tab's 43 fields and the VTX tab's 29, reviewed
 * against a stated version. `pilotGear` already held goggles and cameras. The
 * domain matrix already declared a `video` element.
 *
 * What was missing was the thing that connects them: nothing explained what a
 * video system IS, nothing let a reader record which one they had, nothing
 * could judge whether their goggles and their air unit belonged to the same
 * world, and nothing diagnosed a black screen. Seventeen articles that only
 * explained would have added a seventh encyclopedia to a platform that already
 * had six. So this module was written last in its own vertical, after the
 * taxonomy, the per-build record and the verdict rules existed — and every
 * article links into them rather than describing them.
 *
 * THE SPLIT THAT SHAPES THE ARTICLE LIST
 * --------------------------------------
 * Four ideas are kept apart on purpose, because conflating them is the single
 * most expensive mistake in this subject:
 *
 *   the LINK CLASS   analog or digital — what physically travels
 *   the ECOSYSTEM    a closed family of devices that pair only with each other
 *   the DEVICE ROLE  camera, transmitter, air unit, goggles, receiver module
 *   the PROTOCOL     how the channel is changed, how the overlay is drawn
 *
 * A reader who thinks "digital" and "one company's name" are the same thing
 * will buy goggles that cannot ever see their air unit. `video-what-is` and
 * `video-analog-vs-digital` exist mainly to prevent that, and every ecosystem
 * article repeats the boundary rather than assuming it was understood.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT OWN
 * ------------------------------------------
 * The control link's antennas belong to `rc-link`; this module's antenna
 * article covers video antennas only, and says so. Lines that track the
 * throttle belong to `dx-power-noise`. A jello wobble belongs to
 * `dx-prop-vibration`. Every Betaflight field description stays in the
 * Betaflight reference. The procedures for the manufacturers' own tools live in
 * the video software centre, not here — an article explains, a centre page
 * walks you through.
 *
 * ON NOT INVENTING WHAT CANNOT BE KNOWN
 * -------------------------------------
 * Channel tables, output powers, generation compatibility, regulator ratings
 * and what is legal to transmit where: none of these appear as fixed facts.
 * They are per-model, per-generation, per-country, and a number that is right
 * for one reader and wrong for another is worse than no number. Every place a
 * reader would expect one says where the authoritative answer lives instead —
 * usually their own manufacturer's support page, which the verdict engine also
 * refuses to guess at.
 */

import type { KbModule } from '../../types';

import { videoWhatIs, videoAnalogVsDigital, videoQuality, videoRange } from './articles/fundamentals';
import { videoAnalog, videoBandsChannels } from './articles/analog';
import { videoDji, videoWalksnail, videoHdzero } from './articles/digital';
import { videoCameras, videoGoggles, videoAntennas } from './articles/components';
import { videoOsd } from './articles/osd';
import { videoChoose, videoWiring, videoTesting, videoFailures } from './articles/practice';

export const videoModule: KbModule = {
  id: 'video',
  titleAr: 'نظام الفيديو',
  titleEn: 'FPV Video System',
  domain: 'video',
  icon: 'Video',
  summaryAr:
    'العين التي تطير بها. سبعة عشر مقالاً تغطي السلسلة كاملة من حسّاس الكاميرا إلى الشاشة: '
    + 'التماثلي والرقمي، والكاميرات والنظارات والهوائيات، والنطاقات والقنوات، وطبقة المعلومات، '
    + 'والتوصيل والتغذية، والاختيار والاختبار والأعطال.',
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
    videoWhatIs,
    videoAnalogVsDigital,
    videoQuality,
    videoRange,
    videoAnalog,
    videoBandsChannels,
    videoDji,
    videoWalksnail,
    videoHdzero,
    videoCameras,
    videoGoggles,
    videoAntennas,
    videoOsd,
    videoChoose,
    videoWiring,
    videoTesting,
    videoFailures,
  ],
  paths: [
    {
      id: 'video-path-beginner',
      titleAr: 'من الصفر: كيف تصل الصورة إليّ؟',
      audienceAr: 'لا تعرف الفرق بين الكاميرا والمرسل والنظارة، ولا لماذا يقال «تماثلي» و«رقمي».',
      level: 'beginner',
      articleIds: ['video-what-is', 'video-analog-vs-digital', 'video-cameras', 'video-goggles'],
      outcomeAr:
        'تستطيع تسمية كل حلقة في السلسلة، والتفريق بين نوع الرابط واسم الشركة ونوع الجهاز، '
        + 'ومعرفة أي سؤال تسأله قبل أن تشتري أي قطعة.',
    },
    {
      id: 'video-path-choose',
      titleAr: 'مسار الشراء: أي نظام يناسبني أنا؟',
      audienceAr: 'تريد اختيار نظام ولا تعرف على أي أساس تقارن بين التماثلي والرقمي وبين المنظومات.',
      level: 'basic',
      articleIds: ['video-choose', 'video-analog-vs-digital', 'video-quality', 'video-range'],
      outcomeAr:
        'تستطيع ربط القرار بأولويتك أنت — زمن التأخير، أم جودة الصورة، أم المدى، أم الميزانية، '
        + 'أم قابلية الإصلاح — بدل البحث عن نظام «أفضل» لا وجود له.',
    },
    {
      id: 'video-path-analog',
      titleAr: 'مسار النظام التماثلي: من الصفر إلى صورة تعمل',
      audienceAr: 'اشتريت كاميرا ووحدة إرسال ونظارة تماثلية وتريد تشغيلها بأمان.',
      level: 'basic',
      articleIds: ['video-analog', 'video-bands-channels', 'video-wiring', 'video-osd'],
      outcomeAr:
        'تستطيع توصيل النظام بجهد صحيح وأرضي مشترك، واختيار نطاق وقناة بوعي، وتشغيل طبقة '
        + 'المعلومات، والتحقق من كل خطوة قبل الطيران.',
    },
    {
      id: 'video-path-digital',
      titleAr: 'مسار الأنظمة الرقمية: المنظومة قبل الجهاز',
      audienceAr: 'تفكر في نظام رقمي أو تملك واحداً ولا تعرف حدود التوافق بين أجهزته.',
      level: 'intermediate',
      articleIds: ['video-dji', 'video-walksnail', 'video-hdzero', 'video-osd'],
      outcomeAr:
        'تستطيع التمييز بين المنظومة والشركة والجيل، ومعرفة أين تُقرأ إجابة سؤال التوافق، '
        + 'وضبط طبقة المعلومات حين تُرسَل نصاً بدل أن تُرسَم.',
    },
    {
      id: 'video-path-range',
      titleAr: 'مسار المدى والصورة: لماذا تتدهور ومتى',
      audienceAr: 'صورتك تتقطع أو تضعف قبل ما تتوقع ولا تعرف أين المشكلة.',
      level: 'advanced',
      articleIds: ['video-antennas', 'video-range', 'video-quality', 'video-testing'],
      outcomeAr:
        'تستطيع قراءة أثر الهوائي والاستقطاب والموضع والقدرة كلٍّ على حدة، وإثبات التحسن '
        + 'باختبار مشياً مُسجَّل بدل الانطباع.',
    },
    {
      id: 'video-path-fix',
      titleAr: 'مسار العطل: لا صورة، أو صورة سيئة، أو لا معلومات',
      audienceAr: 'لديك مشكلة الآن ولا تعرف أهي هوائي أم تغذية أم إعداد أم توافق.',
      level: 'intermediate',
      articleIds: ['video-failures', 'video-testing', 'video-wiring', 'video-osd'],
      outcomeAr:
        'تستطيع تصنيف العطل في دقيقة، ثم اتباع ترتيب فحص يبدأ من الأأمن والأرخص وينتهي عند ما '
        + 'يحتاج دليل الشركة فعلاً.',
    },
  ],
};
