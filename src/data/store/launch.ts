/**
 * The launch set's specifications, and where every figure came from.
 *
 * HOW THESE WERE OBTAINED
 * -----------------------
 * Each one was read off the manufacturer's own page or manual during the
 * review dated in `CHECKED`. Nothing here is remembered, inferred, converted or
 * rounded. Where a manufacturer states a figure two ways — «33 g» for the
 * aircraft and «45.5 g» with a battery — both are recorded as separate rows,
 * because collapsing them into one number is how a shop tells somebody a drone
 * weighs less than it does.
 *
 * WHAT IS DELIBERATELY ABSENT
 * ---------------------------
 * Flight time, unless the manufacturer states it and it is labelled as their
 * estimate. Range, unless the manufacturer states the regulatory domain it
 * applies to — «10 km» is meaningless without «FCC», and quoting it without is
 * how a customer in a CE country plans a flight they cannot make.
 *
 * Prices are absent too, and always will be from this file. They are computed
 * from a recorded cost by the pricing engine. A price in a source file is a
 * price nobody can explain and nobody can update without a deployment.
 *
 * WHEN A SOURCE MOVES
 * -------------------
 * The URL rots, the figure does not. `titleAr` says what the page was, so a
 * dead link is still traceable, and `checkedAt` says when somebody last saw it
 * — which is what tells a reader in two years whether to trust it.
 */

import type { ProductSpec } from './types';

/** The date this review was carried out. Every source below was read on it. */
export const CHECKED = '2026-08-04';

/** Shorthand: a figure read off the manufacturer's own page. */
function official(
  labelAr: string, valueAr: string, unitAr: string, titleAr: string, url: string,
): ProductSpec {
  return {
    labelAr, valueAr,
    ...(unitAr ? { unitAr } : {}),
    status: 'verified',
    source: { kind: 'manufacturer-page', titleAr, url, checkedAt: CHECKED },
  };
}

/** Shorthand: a figure read off the manufacturer's manual or datasheet. */
function manual(
  labelAr: string, valueAr: string, unitAr: string, titleAr: string, url: string,
): ProductSpec {
  return {
    labelAr, valueAr,
    ...(unitAr ? { unitAr } : {}),
    status: 'verified',
    source: { kind: 'manufacturer-manual', titleAr, url, checkedAt: CHECKED },
  };
}

const BETAFPV_CETUS_PRO = 'https://betafpv.com/products/cetus-pro-fpv-kit';
const BETAFPV_METEOR75 = 'https://betafpv.com/products/meteor75-pro-brushless-whoop-quadcopter';
const HAPPYMODEL_MOBULA7 =
  'https://www.happymodel.cn/index.php/2022/01/20/happymodel-mobula7-1s-micro-fpv-whoop-drone/';
const RM_POCKET = 'https://radiomasterrc.com/products/pocket-radio-controller-m2';
const RM_BOXER = 'https://radiomasterrc.com/products/boxer-radio-controller-m2';
const RM_TX16S = 'https://radiomasterrc.com/products/tx16s-mark-ii-radio-controller';
const IFLIGHT_NAZGUL5 = 'https://shop.iflight.com/Nazgul5-Analog-V3-6S-BNF-Pro1966';
const GEPRC_MARK5 = 'https://geprc.com/product/geprc-mark5-analog-freestyle-fpv-drone/';
const GEPRC_MARK5_MANUAL = 'https://geprc.com/wp-content/uploads/2022/03/MARK5-USER-MANUALV1.1.pdf';
const DJI_O3 = 'https://www.dji.com/o3-air-unit/specs';
const DJI_N3 = 'https://www.dji.com/goggles-n3/specs';
const SPEEDYBEE_F405V4 = 'https://www.speedybee.com/speedybee-f405-v4-bls-55a-30x30-fc-esc-stack/';
const GEPRC_CINELOG25 = 'https://geprc.com/product/cinelog25-v2-analog-quadcopter/';
const MATEK_M10Q = 'https://www.mateksys.com/?portfolio=m10q-5883';
const BETAFPV_PAVO_PICO = 'https://betafpv.com/products/pavo-pico-brushless-whoop-quadcopter';
const BETAFPV_PAVO_PICO_II = 'https://betafpv.com/products/pavo-pico-ii-brushless-whoop-quadcopter';
const BETAFPV_CETUS_X = 'https://betafpv.com/products/cetus-x-fpv-kit';
const CADDX_RATEL2 =
  'https://www.caddxfpv.com/products/ratel-2-1-1-8inch-starlight-sensor-freestyle-fpv-camera';

/**
 * Specifications by product id.
 *
 * Only the launch set appears here. Every other product carries an empty array,
 * which is the honest state and the one the publication gate reads: three
 * sourced figures or it does not publish.
 */
export const LAUNCH_SPECS: Record<string, ProductSpec[]> = {
  'betafpv-cetus-pro': [
    official('المحرّكات', '1102 18000KV', '', 'صفحة Cetus Pro FPV Kit', BETAFPV_CETUS_PRO),
    official('المراوح', '40mm ثلاثية الشفرات', '', 'صفحة Cetus Pro FPV Kit', BETAFPV_CETUS_PRO),
    official('متحكّم الطيران', 'Lite 1-2S Pro بمسرّع 12A', '', 'صفحة Cetus Pro FPV Kit', BETAFPV_CETUS_PRO),
    official('وزن الطائرة وحدها', '33', 'غرام', 'صفحة Cetus Pro FPV Kit', BETAFPV_CETUS_PRO),
    official('الوزن مع بطارية 1S 450mAh', '45.5', 'غرام', 'صفحة Cetus Pro FPV Kit', BETAFPV_CETUS_PRO),
    official('طاقة مرسل الفيديو', '25', 'ميلي واط', 'صفحة Cetus Pro FPV Kit', BETAFPV_CETUS_PRO),
    official('تسجيل النظّارة', '720p', '', 'صفحة Cetus Pro FPV Kit', BETAFPV_CETUS_PRO),
  ],

  'betafpv-meteor75-pro': [
    official('المحرّكات', '1102 22000KV', '', 'صفحة Meteor75 Pro', BETAFPV_METEOR75),
    official('قطر الهيكل بين المحرّكات', '80.8', 'مم', 'صفحة Meteor75 Pro', BETAFPV_METEOR75),
    official('المراوح', '45mm ثلاثية الشفرات', '', 'صفحة Meteor75 Pro', BETAFPV_METEOR75),
    official('طاقة مرسل الفيديو المدمج', '400', 'ميلي واط', 'صفحة Meteor75 Pro', BETAFPV_METEOR75),
    official('الكاميرا', 'C03 بدقّة 1200TVL ومستشعر 1/3" وعدسة 2.1mm', '', 'صفحة Meteor75 Pro', BETAFPV_METEOR75),
    official('زاوية رؤية الكاميرا', '160', 'درجة', 'صفحة Meteor75 Pro', BETAFPV_METEOR75),
    official('البطارية المرفقة', 'LAVA II 1S 580mAh', '', 'صفحة Meteor75 Pro', BETAFPV_METEOR75),
  ],

  'happymodel-mobula7': [
    official('المحرّكات', 'RS0802 20000KV', '', 'صفحة Mobula7 1S', HAPPYMODEL_MOBULA7),
    official('قطر الهيكل بين المحرّكات', '75', 'مم', 'صفحة Mobula7 1S', HAPPYMODEL_MOBULA7),
    official('أقصى طاقة لمرسل الفيديو', '400', 'ميلي واط', 'صفحة Mobula7 1S', HAPPYMODEL_MOBULA7),
    official(
      'المتحكّم', 'لوحة مدمجة تجمع المتحكّم والمسرّع ومرسل الفيديو والمستقبِل وشاشة المعلومات',
      '', 'صفحة Mobula7 1S', HAPPYMODEL_MOBULA7,
    ),
    {
      labelAr: 'الوزن',
      valueAr: '24.5',
      unitAr: 'غرام',
      status: 'disputed',
      disagreementAr:
        'صفحة الشركة تذكر 24.5 غراماً للنسخة التماثلية و33 غراماً لنسخة الفيديو الرقمي. '
        + 'الرقم المعروض للنسخة التماثلية، ويختلف باختلاف النسخة.',
    },
  ],

  'radiomaster-pocket': [
    official('نطاق التردّد', '2.400 – 2.480', 'غيغاهرتز', 'صفحة Pocket Radio Controller', RM_POCKET),
    official('أقصى عدد قنوات', '16', 'قناة (يعتمد على المستقبِل)', 'صفحة Pocket Radio Controller', RM_POCKET),
    official('الشاشة', '128 × 64 أحادية اللون', '', 'صفحة Pocket Radio Controller', RM_POCKET),
    official('العصي', 'حسّاسات هول', '', 'صفحة Pocket Radio Controller', RM_POCKET),
    official('البطارية', 'خليّتا 18650 — غير مرفقتين', '', 'صفحة Pocket Radio Controller', RM_POCKET),
    official('فتحة الوحدة الخارجية', 'مقاس Nano', '', 'صفحة Pocket Radio Controller', RM_POCKET),
    official('النظام', 'EdgeTX مثبَّت مسبقاً', '', 'صفحة Pocket Radio Controller', RM_POCKET),
  ],

  'radiomaster-boxer': [
    official('أقصى عدد قنوات', '16', 'قناة (يعتمد على المستقبِل)', 'صفحة Boxer Radio Controller', RM_BOXER),
    official('العصي', 'حسّاسات هول كاملة الحجم', '', 'صفحة Boxer Radio Controller', RM_BOXER),
    official('البطارية', 'حامل لخليّتَي 18650 — غير مرفقتين', '', 'صفحة Boxer Radio Controller', RM_BOXER),
    official('المعالج', 'STM32VGT6', '', 'صفحة Boxer Radio Controller', RM_BOXER),
    official('النظام', 'EdgeTX مثبَّت مسبقاً', '', 'صفحة Boxer Radio Controller', RM_BOXER),
  ],

  'radiomaster-tx16s-mk2': [
    official('الشاشة', '4.3" IPS ملوّنة تعمل باللمس', '', 'صفحة TX16S Mark II', RM_TX16S),
    official('أقصى عدد قنوات', '16', 'قناة (يعتمد على المستقبِل)', 'صفحة TX16S Mark II', RM_TX16S),
    official('العصي', 'حسّاسات هول الإصدار 4.0', '', 'صفحة TX16S Mark II', RM_TX16S),
    official('الشحن', 'عبر USB-C حتى 2.2', 'أمبير', 'صفحة TX16S Mark II', RM_TX16S),
    official('النظام', 'EdgeTX مثبَّت مسبقاً مع تفعيل اللمس', '', 'صفحة TX16S Mark II', RM_TX16S),
  ],

  'iflight-nazgul5-v3': [
    official('المحرّكات', 'XING-E Pro 2207', '', 'صفحة Nazgul5 V3 6S', IFLIGHT_NAZGUL5),
    official('متحكّم الطيران', 'BLITZ F7', '', 'صفحة Nazgul5 V3 6S', IFLIGHT_NAZGUL5),
    official('المسرّعات', 'BLITZ E45S رباعي 45A بنظام BLHeli32 لجهد 2-6S', '', 'صفحة Nazgul5 V3 6S', IFLIGHT_NAZGUL5),
    official('مرسل الفيديو', 'BLITZ بطاقة 1.6', 'واط', 'صفحة Nazgul5 V3 6S', IFLIGHT_NAZGUL5),
    official('الكاميرا', 'RaceCam R1', '', 'صفحة Nazgul5 V3 6S', IFLIGHT_NAZGUL5),
    official('الوزن بلا بطارية', '435', 'غرام', 'صفحة Nazgul5 V3 6S', IFLIGHT_NAZGUL5),
    official('الوزن مع بطارية 6S 1400mAh', '660 ± 10', 'غرام', 'صفحة Nazgul5 V3 6S', IFLIGHT_NAZGUL5),
  ],

  'geprc-mark5': [
    official('المحرّكات', 'SPEEDX2 2107.5 بقوّة 1960KV لنسخة 6S', '', 'صفحة MARK5 Analog', GEPRC_MARK5),
    official('قطر الهيكل بين المحرّكات', '225', 'مم', 'صفحة MARK5 Analog', GEPRC_MARK5),
    official('الوزن', '385', 'غرام (نسخة 6S التماثلية)', 'صفحة MARK5 Analog', GEPRC_MARK5),
    official('متحكّم الطيران', 'GEP-F722-BT-HD V3', '', 'صفحة MARK5 Analog', GEPRC_MARK5),
    official('المسرّعات', 'GEP-BL32 رباعي 50A', '', 'صفحة MARK5 Analog', GEPRC_MARK5),
    manual('البطارية الموصى بها', '6S بسعة 1050 – 1550', 'ميلي أمبير/ساعة', 'دليل MARK5 الرسمي', GEPRC_MARK5_MANUAL),
  ],

  'dji-o3-air-unit': [
    official('وزن الوحدة مع الكاميرا', '36.4', 'غرام', 'صفحة مواصفات O3 Air Unit', DJI_O3),
    official('وزن الهوائي', '3', 'غرام', 'صفحة مواصفات O3 Air Unit', DJI_O3),
    official('أبعاد وحدة الإرسال', '32.5 × 30.5 × 14.5', 'مم', 'صفحة مواصفات O3 Air Unit', DJI_O3),
    official('أبعاد وحدة الكاميرا', '21.2 × 20 × 19.5', 'مم', 'صفحة مواصفات O3 Air Unit', DJI_O3),
    official('المستشعر', '1/1.7"', '', 'صفحة مواصفات O3 Air Unit', DJI_O3),
    official('زاوية الرؤية', '155', 'درجة', 'صفحة مواصفات O3 Air Unit', DJI_O3),
    official('التسجيل الداخلي', '20', 'غيغابايت', 'صفحة مواصفات O3 Air Unit', DJI_O3),
    official(
      'أقلّ زمن تأخير',
      '30 مللي ثانية عند 1080p/100fps مع نظّارات Goggles 3 أو Integra أو Goggles 2',
      '', 'صفحة مواصفات O3 Air Unit', DJI_O3,
    ),
    official(
      'أقصى مدى إرسال الصورة',
      '10 كم بمعيار FCC · 2 كم بمعيار CE · 6 كم بمعيار SRRC',
      '', 'صفحة مواصفات O3 Air Unit', DJI_O3,
    ),
  ],

  'dji-goggles-n3': [
    official('الشاشة', 'شاشة LCD واحدة', '', 'صفحة مواصفات Goggles N3', DJI_N3),
    official('زاوية الرؤية', '54', 'درجة', 'صفحة مواصفات Goggles N3', DJI_N3),
    official('البثّ', '1080p بمعدّل 60 إطاراً في الثانية', '', 'صفحة مواصفات Goggles N3', DJI_N3),
    official('أقلّ زمن تأخير', '31', 'مللي ثانية', 'صفحة مواصفات Goggles N3', DJI_N3),
    official('زمن التشغيل', '2.7', 'ساعة', 'صفحة مواصفات Goggles N3', DJI_N3),
  ],

  'speedybee-f405-v4-stack': [
    official('المعالج', 'STM32F405', '', 'صفحة F405 V4 BLS 55A Stack', SPEEDYBEE_F405V4),
    official('حسّاس الحركة', 'ICM42688P', '', 'صفحة F405 V4 BLS 55A Stack', SPEEDYBEE_F405V4),
    official('منافذ UART', '6', 'منافذ', 'صفحة F405 V4 BLS 55A Stack', SPEEDYBEE_F405V4),
    official('مخارج الجهد', '5 فولت و9 فولت، كلٌّ منهما 3', 'أمبير', 'صفحة F405 V4 BLS 55A Stack', SPEEDYBEE_F405V4),
    official('تيّار المسرّعات', '55', 'أمبير', 'صفحة F405 V4 BLS 55A Stack', SPEEDYBEE_F405V4),
    official('مقاس التثبيت', '30.5 × 30.5 بفتحات 4', 'مم', 'صفحة F405 V4 BLS 55A Stack', SPEEDYBEE_F405V4),
    official('الأبعاد', '41.6 × 39.4 × 7.8', 'مم', 'صفحة F405 V4 BLS 55A Stack', SPEEDYBEE_F405V4),
    official('تسجيل الصندوق الأسود', 'بطاقة ذاكرة حتى 4', 'غيغابايت', 'صفحة F405 V4 BLS 55A Stack', SPEEDYBEE_F405V4),
  ],

  // ── Round two ───────────────────────────────────────────────────────────
  // Read on the same date. Each of these turned up something the catalogue had
  // wrong as well as something it was missing — see the `noteAr` on their audit
  // rows: two carried the previous generation's name, and the Cinelog's three
  // video versions are three different purchases, not one product.

  'geprc-cinelog25': [
    official('المحرّكات', '1404 4500KV', '', 'صفحة Cinelog25 V2 Analog', GEPRC_CINELOG25),
    official('متحكّم الطيران والمسرّع', 'TAKER G4 35A AIO', '', 'صفحة Cinelog25 V2 Analog', GEPRC_CINELOG25),
    official('المراوح', 'HQ DT63mm رباعية الشفرات', '', 'صفحة Cinelog25 V2 Analog', GEPRC_CINELOG25),
    official('وحدة تحديد الموقع', 'شريحة M10 مدمجة', '', 'صفحة Cinelog25 V2 Analog', GEPRC_CINELOG25),
    {
      labelAr: 'الوزن',
      valueAr: 'غير متوفّر من المصدر',
      status: 'pending',
    },
  ],

  'matek-m10-gps': [
    official('الشريحة', 'u-blox SAM-M10Q-00B', '', 'صفحة M10Q-5883 الرسمية', MATEK_M10Q),
    official(
      'المنظومات المدعومة',
      'GPS وGLONASS وGalileo وBeiDou في وقت واحد',
      '', 'صفحة M10Q-5883 الرسمية', MATEK_M10Q,
    ),
    official('الهوائي', 'رقعة عالية الكسب 15 × 15', 'مم', 'صفحة M10Q-5883 الرسمية', MATEK_M10Q),
    official(
      'البروتوكول ومعدّل التحديث',
      'UBX بمعدّل 5Hz مع GPS وGalileo وBeiDou B1C وGLONASS، أو NMEA بمعدّل 1Hz',
      '', 'صفحة M10Q-5883 الرسمية', MATEK_M10Q,
    ),
    official('الموصل', 'JST-GH بستّة أطراف', '', 'صفحة M10Q-5883 الرسمية', MATEK_M10Q),
    { labelAr: 'الوزن', valueAr: 'غير متوفّر من المصدر', status: 'pending' },
  ],

  'caddx-ratel-2': [
    official('المستشعر', '1/1.8" ستارلايت بمدى ديناميكي واسع', '', 'صفحة Ratel 2 الرسمية', CADDX_RATEL2),
    official('الوضوح', '1200', 'خط تلفزيوني', 'صفحة Ratel 2 الرسمية', CADDX_RATEL2),
    official('زاوية الرؤية', '165', 'درجة', 'صفحة Ratel 2 الرسمية', CADDX_RATEL2),
    official('زمن التأخير', '8', 'مللي ثانية', 'صفحة Ratel 2 الرسمية', CADDX_RATEL2),
    official('حساسية الإضاءة', '0.0001', 'لكس', 'صفحة Ratel 2 الرسمية', CADDX_RATEL2),
    official(
      'نسبة الصورة والنظام',
      'تبديل بين 4:3 و16:9، وبين PAL وNTSC',
      '', 'صفحة Ratel 2 الرسمية', CADDX_RATEL2,
    ),
    { labelAr: 'الوزن', valueAr: 'غير متوفّر من المصدر', status: 'pending' },
  ],

  // ── Round three: the beginner path, reviewed as one group ───────────────
  // Tiny whoop and 2-inch together, because that is the order somebody
  // actually buys in — and reviewing them apart is how a shop ends up
  // recommending a second aircraft that duplicates the first.

  'betafpv-cetus-x': [
    official('المحرّكات', '1103 11000KV', '', 'صفحة Cetus X FPV Kit', BETAFPV_CETUS_X),
    official('المراوح', 'Gemfan 2020 رباعية الشفرات', '', 'صفحة Cetus X FPV Kit', BETAFPV_CETUS_X),
    official('الوزن مع البطارية', '55', 'غرام', 'صفحة Cetus X FPV Kit', BETAFPV_CETUS_X),
    official('جهد البطارية', '2S', '', 'صفحة Cetus X FPV Kit', BETAFPV_CETUS_X),
    official('جهاز التحكّم المرفق', 'LiteRadio 3', '', 'صفحة Cetus X FPV Kit', BETAFPV_CETUS_X),
    official('النظّارة المرفقة', 'VR03 بفتحة بطاقة للتسجيل', '', 'صفحة Cetus X FPV Kit', BETAFPV_CETUS_X),
    official(
      'مساعدات الطيران',
      'مقياس ضغط مدمج لثبات الارتفاع، ووضع تثبيت الموضع، وهبوط اضطراري تلقائي',
      '', 'صفحة Cetus X FPV Kit', BETAFPV_CETUS_X,
    ),
    official(
      'فتحة الوحدة الخارجية في جهاز التحكّم',
      'مقاس Nano — يقبل وحدة إرسال خارجية لتشغيل طائرات أخرى',
      '', 'صفحة Cetus X FPV Kit', BETAFPV_CETUS_X,
    ),
  ],

  'betafpv-pavo-pico': [
    official('المحرّكات', '1102 14000KV', '', 'صفحة Pavo Pico', BETAFPV_PAVO_PICO),
    official('المراوح', 'Gemfan 45mm', '', 'صفحة Pavo Pico', BETAFPV_PAVO_PICO),
    official(
      'متحكّم الطيران',
      'F4 AIO لجهد 2-3S بمسرّع 20A، وزنه 5.92 غرام، مصمَّم لوحدة فيديو رقمية',
      '', 'صفحة Pavo Pico', BETAFPV_PAVO_PICO,
    ),
    official('الوزن مع وحدة DJI O3', '71.2', 'غرام', 'صفحة Pavo Pico', BETAFPV_PAVO_PICO),
    official('الوزن مع وحدة Vista', '66.02', 'غرام', 'صفحة Pavo Pico', BETAFPV_PAVO_PICO),
    official('الوزن مع وحدة Avatar', '65.88', 'غرام', 'صفحة Pavo Pico', BETAFPV_PAVO_PICO),
    {
      labelAr: 'الجيل التالي',
      valueAr: 'Pavo Pico II بمحرّكات LAVA 1102 14000KV ودعم وحدات DJI O4 وO4 Pro',
      status: 'verified',
      source: {
        kind: 'manufacturer-page',
        titleAr: 'صفحة Pavo Pico II',
        url: BETAFPV_PAVO_PICO_II,
        checkedAt: CHECKED,
      },
    },
  ],
};

/**
 * What a source did NOT say.
 *
 * «غير متوفّر من المصدر» is a real row and appears on the page as one. It is
 * the difference between «we did not check» and «we checked and the
 * manufacturer does not publish it» — and a buyer who needs that figure learns
 * from the second that asking the manufacturer is the next step, rather than
 * assuming the shop was careless.
 */
export const NOT_PUBLISHED_AR = 'غير متوفّر من المصدر';

/** Products with at least one sourced figure recorded in this file. */
export function documentedProductIds(): string[] {
  return Object.keys(LAUNCH_SPECS);
}
