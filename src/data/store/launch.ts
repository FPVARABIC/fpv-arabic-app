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

/* ── Batch two: the rest of the catalogue ─────────────────────────────────── */

const GEPRC_CINEBOT25_V2 = 'https://geprc.com/product/geprc-cinebot25-v2-o4-pro-quadcopter/';
const GEPRC_CINEBOT25_V1 = 'https://geprc.com/product/geprc-cinebot25-analog-quadcopter/';
const GEPRC_CINELOG30_V3 = 'https://geprc.com/product/geprc-cinelog30-v3-o4-pro-quadcopter/';
const GEPRC_CINELOG35_V3 = 'https://geprc.com/product/geprc-cinelog35-v3-o4-pro-fpv-drone/';
const GEPRC_CINEBOT30 = 'https://geprc.com/product/geprc-cinebot30-hd-o3-fpv-drone/';
const GEPRC_CROCODILE7 = 'https://geprc.com/product/crocodile-7-pro/';
const GEPRC_SMART35 =
  'https://geprc.com/product/geprc-smart-35-analog-3-5inch-micro-freestyle-drone/';
const GEPRC_DOMAIN36 = 'https://geprc.com/product/geprc-domain3-6-analog-freestyle-fpv-drone/';
const GEPRC_DOMAIN36_O3 = 'https://geprc.com/product/geprc-domain3-6-hd-o3-freestyle-fpv-drone/';

const IFLIGHT_EVOQUE_F4 = 'https://shop.iflight.com/Nazgul-Evoque-F4-6S-HD-Pro2046';
const IFLIGHT_CHIMERA7_PRO_V2 = 'https://shop.iflight.com/Chimera7-Pro-V2-6S-Pro1947';
const IFLIGHT_CHIMERA7_ECO = 'https://shop.iflight.com/Chimera7-ECO-6S-Pro2066';
const IFLIGHT_XING2_2207 = 'https://shop.iflight.com/xing2-2207-4s-6s-fpv-motor-unibell-pro1464';

const BETAFPV_PAVO25_V2 = 'https://betafpv.com/products/pavo25-v2-brushless-whoop-quadcopter';
const BETAFPV_CETUS_LITE = 'https://betafpv.com/products/cetus-lite-fpv-kit';
const BETAFPV_PAVO30 = 'https://betafpv.com/products/pavo30-whoop-quadcopter';
const BETAFPV_SUPERD = 'https://betafpv.com/products/superd-elrs-2-4g-diversity-receiver';
const BETAFPV_SUPERX = 'https://betafpv.com/products/superx-elrs-gemini-xross-receiver';

const HAPPYMODEL_MOBULA8 =
  'https://www.happymodel.cn/index.php/2023/04/29/happymodel-mobula8-1-2s-85mm-micro-fpv-whoop-drone/';
const HAPPYMODEL_MOBULA8_V3 =
  'https://www.happymodel.cn/index.php/2025/10/18/happymodel-mobula8-uart-elrs-v3-2s-85mm-micro-fpv-whoop-drone/';
const HAPPYMODEL_EP1 =
  'https://www.happymodel.cn/index.php/2022/11/07/2-4g-elrs-ep1-ep2-ep1dual-tcxo-receiver/';

const WALKSNAIL_GOGGLES_X = 'https://www.caddxfpv.com/products/walksnail-avatar-hd-goggles-x';
const WALKSNAIL_PRO_KIT = 'https://www.caddxfpv.com/products/walksnail-avatar-hd-pro-kit';
const HDZERO_GOGGLE2 = 'https://www.hd-zero.com/product-page/hdzero-goggle-2';
const HDZERO_FREESTYLE_V2 = 'https://www.hd-zero.com/product-page/freestyle-v2-vtx';

const SPEEDYBEE_F7V3 = 'https://www.speedybee.com/speedybee-f7-v3-flight-controller/';
const SPEEDYBEE_BLS50 = 'https://www.speedybee.com/speedybee-f405-bls-50a-30x30-4-in-1-esc/';
const SPEEDYBEE_BLS60 = 'https://www.speedybee.com/speedybee-bls-60a-30x30-4-in-1-esc/';
const HOLYBRO_KAKUTE_H7V2 = 'https://holybro.com/products/kakute-h7-v2';
const HOBBYWING_G2_45 = 'https://www.hobbywing.com/en/products/xrotor-fpv-g2-45a-4in1-esc275.html';
const HOBBYWING_G2_65 = 'https://www.hobbywing.com/en/products/xrotor-fpv-g2-65a-4in1-esc268';
const HOBBYWING_G2_SHEET =
  'https://www.hobbywing.com/en/uploads/file/20250324/715cf619a357b18a11761e3bb13e4f6d.pdf';
const TMOTOR_F55A = 'https://store.tmotor.com/product/f55a-pro-v2-4in1-fpv-esc.html';
const TMOTOR_F60PROV = 'https://store.tmotor.com/product/f60prov-fpv-motor.html';
const EMAX_ECO_II = 'https://emaxmodel.com/products/'
  + 'emax-eco-ii-series-2306-1700kv-1900kv-2400kv-brushless-motor-for-rc-drone-fpv-racing';
const EMAX_ECO_III = 'https://emaxmodel.com/products/'
  + 'eamx-ecoiii-series-2306-3-6s-1700kv-1900kv-2400kv-brushless-motor-drone-motor-accessories';
const EMAX_TINYHAWK3 = 'https://emaxmodel.com/products/'
  + 'emax-tinyhawk-iii-rtf-kit-fpv-racing-drone-f4-5a-15000kv-runcam-nano-4-37ch-'
  + '25-100-200mw-vtx-1s-2s-frsky-d8-with-controller-goggles';

const TBS_SOURCE_ONE_V51 = 'https://www.team-blacksheep.com/products/prod:sourceone_v5';
const TBS_SOURCE_ONE_V6 = 'https://www.team-blacksheep.com/products/product:8547';
const TBS_SOURCE_ONE_RTF = 'https://www.team-blacksheep.com/products/prod:source_1_rtf';
const TBS_UNIFY_NANO = 'https://www.team-blacksheep.com/products/prod:unifypro32_nano';
const TBS_UNIFY_MANUAL = 'https://www.team-blacksheep.com/media/files/tbs-unify-pro32-manual.pdf';
const ARMATTAN_MARMOTTE = 'https://armattanquads.com/products/marmotte';
const IMPULSERC_APEXDC = 'https://impulserc.com/collections/apex/products/apexdc-evo-5-fpv-frame-kit-1';

const CNHL_BLACK_V2 = 'https://chinahobbyline.com/collections/cnhl-black-series-v2-0-lipo-batteries';
const CNHL_BLACK = 'https://chinahobbyline.com/collections/cnhl-black-series-lipo-batteries';
const TATTU_RLINE_V5 = 'https://genstattu.com/tattu-r-line-version-5-0-batteries/';
const ISDT_Q6NANO_MANUAL = 'https://www.isdt.co/down/pdf/Q6nano_EN.pdf';
const ISDT_608AC_MANUAL = 'https://www.isdt.co/down/pdf/608AC_EN.pdf';

const RUNCAM_PHOENIX2 = 'https://shop.runcam.com/runcam-phoenix-2/';
const RUNCAM_PHOENIX2_MANUAL = 'https://www.runcam.com/download/Phoenix2/Phoenix_2_Manual.pdf';
const FOXEER_MICRO_RAZER = 'https://www.foxeer.com/'
  + '1200tvl-foxeer-micro-razer-fpv-camera-pal-ntsc-switchable-1-8mm-lens-4ms-latency-g-265';
const FOXEER_RAZER_MINI_V3 = 'https://www.foxeer.com/foxeer-razer-mini-v3-fpv-camera-g-593';
const FOXEER_REAPER_V3 = 'https://www.foxeer.com/foxeer-4-9g-6g-reaper-extreme-v3-2-5w-80ch-vtx-g-591';
const FOXEER_LOLLIPOP4 =
  'https://www.foxeer.com/foxeer-lollipop-4-5-8g-2-6dbi-high-gain-fpv-antenna-2pcs-g-369';
const RUSH_TANK_II = 'https://rushfpv.net/products/tank-ii-ultimate-vtx';
const RUSH_TANK_III = 'https://rushfpv.net/products/tank-iii-ultimate-vtx';
const RUSH_TANK_MINI_II = 'https://rushfpv.net/products/tank-ultimate-mini-vtx';

const HOLYBRO_MICRO_M10 = 'https://holybro.com/products/micro-m10-gps';
const FLYWOO_GM10_PRO_V3 = 'https://flywoo.net/products/goku-gm10-pro-v3-gps-w-compass';
const RM_RP1 = 'https://radiomasterrc.com/products/rp1-expresslrs-2-4ghz-nano-receiver';
const TRUERC_XAIR_MK2 =
  'https://www.truerc.ca/shop/5-8ghz-2/receiver-long-range/x-air-5-8-mk-ii-2';
const LUMENIER_AXII2 =
  'https://www.lumenier.com/products/lumenier-axii-2-long-range-5-8ghz-antenna-lhcp';
const GEMFAN_51466_V2 = 'https://www.gemfanhobby.com/hurricane-51466-v2-pc-3-blade.html';

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
    official('المسرّعات', 'BLITZ E45S رباعي 45A بنظام BLHeli32 لجهد 2S-6S', '', 'صفحة Nazgul5 V3 6S', IFLIGHT_NAZGUL5),
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
      'F4 AIO لجهد 2S-3S بمسرّع 20A، وزنه 5.92 غرام، مصمَّم لوحدة فيديو رقمية',
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

  /* ══ Batch two ═══════════════════════════════════════════════════════════
   * The remaining catalogue, read against each manufacturer's own pages on
   * the same date. Where a manufacturer publishes several versions of one
   * product, the figures below say WHICH version they belong to — a KV read
   * off the V2 page is not a fact about the V1, and the commonest way a shop
   * ends up lying is by quoting the newest number under the oldest name.
   * ═════════════════════════════════════════════════════════════════════ */

  'happymodel-mobula8': [
    official('قطر الهيكل بين المحرّكات', '85', 'مم', 'صفحة Mobula8 1-2S 85mm', HAPPYMODEL_MOBULA8),
    official('الأبعاد', '120 × 120 × 50', 'مم', 'صفحة Mobula8 1-2S 85mm', HAPPYMODEL_MOBULA8),
    official('الوزن', '43', 'غرام', 'صفحة Mobula8 1-2S 85mm', HAPPYMODEL_MOBULA8),
    official('المحرّكات', 'EX1103 11000KV', '', 'صفحة Mobula8 1-2S 85mm', HAPPYMODEL_MOBULA8),
    official('المراوح', 'Gemfan Hurricane 2023 ثلاثية الشفرات', '', 'صفحة Mobula8 1-2S 85mm', HAPPYMODEL_MOBULA8),
    official('الكاميرا', 'Caddx Ant', '', 'صفحة Mobula8 1-2S 85mm', HAPPYMODEL_MOBULA8),
    official('أقصى طاقة لمرسل الفيديو', '400', 'ميلي واط', 'صفحة Mobula8 1-2S 85mm', HAPPYMODEL_MOBULA8),
    official(
      'البطارية', 'يقبل 1S و2S من نوع LiPo أو LiHV — والموصى به 2S بسعة 450 أو 550 أو 650 ميلي أمبير/ساعة',
      '', 'صفحة Mobula8 1-2S 85mm', HAPPYMODEL_MOBULA8,
    ),
    official(
      'الجيل الأحدث',
      'Mobula8 UART ELRS V3 بجهد 2S، ونسخة Mobula8 O4 بنظام فيديو رقمي',
      '', 'صفحة Mobula8 UART ELRS V3', HAPPYMODEL_MOBULA8_V3,
    ),
  ],

  'betafpv-pavo25': [
    official('المحرّكات', 'LAVA 1506 4200KV', '', 'صفحة Pavo25 V2', BETAFPV_PAVO25_V2),
    official('المراوح', 'GF D63 ثلاثية الشفرات بمحور 1.5mm', '', 'صفحة Pavo25 V2', BETAFPV_PAVO25_V2),
    official(
      'متحكّم الطيران والمسرّع',
      'F722 35A AIO بتردّد نبضات حتى 128 كيلوهرتز وذاكرة 16 ميغابايت للصندوق الأسود',
      '', 'صفحة Pavo25 V2', BETAFPV_PAVO25_V2,
    ),
    official('منافذ UART', '6', 'منافذ كاملة', 'صفحة Pavo25 V2', BETAFPV_PAVO25_V2),
    official('جهد الدخل', '2 إلى 6S', '', 'صفحة Pavo25 V2', BETAFPV_PAVO25_V2),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'geprc-cinebot25': [
    official('قطر الهيكل بين المحرّكات', '123', 'مم', 'صفحة Cinebot25 V2 O4 Pro', GEPRC_CINEBOT25_V2),
    official('المحرّكات', 'SPEEDX2 1404 4600KV', '', 'صفحة Cinebot25 V2 O4 Pro', GEPRC_CINEBOT25_V2),
    official(
      'متحكّم الطيران والمسرّع',
      'TAKER F722 35A ثنائي وثلاثون بت — معالج STM32F722RET6 وحسّاس ICM42688-P',
      '', 'صفحة Cinebot25 V2 O4 Pro', GEPRC_CINEBOT25_V2,
    ),
    official('المراوح', 'HQProp DT63mm ثلاثية الشفرات النسخة الثانية', '', 'صفحة Cinebot25 V2 O4 Pro', GEPRC_CINEBOT25_V2),
    official('الوزن بنسخة ExpressLRS 2.4 غيغاهرتز', '219 ± 5', 'غرام', 'صفحة Cinebot25 V2 O4 Pro', GEPRC_CINEBOT25_V2),
    official(
      'البطارية الموصى بها', 'LiHV بجهد 4S وسعة 750 إلى 1100 ميلي أمبير/ساعة بموصّل XT30',
      '', 'صفحة Cinebot25 V2 O4 Pro', GEPRC_CINEBOT25_V2,
    ),
    official('نظام الفيديو', 'DJI O4 Air Unit Pro', '', 'صفحة Cinebot25 V2 O4 Pro', GEPRC_CINEBOT25_V2),
    official(
      'الجيل السابق',
      'Cinebot25 الأول بمتحكّم TAKER G4 45A ثمانية بت وهيكل GEP-CT25، ومحرّك SPEEDX2 1404 '
      + 'في النسخة العادية و1505 في نسخة S',
      '', 'صفحة Cinebot25 Analog', GEPRC_CINEBOT25_V1,
    ),
  ],

  'geprc-cinelog30': [
    official('المحرّكات', '1404 3850KV', '', 'صفحة Cinelog30 V3 O4 Pro', GEPRC_CINELOG30_V3),
    official('متحكّم الطيران والمسرّع', 'TAKER F722 45A ثنائي وثلاثون بت', '', 'صفحة Cinelog30 V3 O4 Pro', GEPRC_CINELOG30_V3),
    official('المراوح', 'HQProp DT76mm ثلاثية الشفرات', '', 'صفحة Cinelog30 V3 O4 Pro', GEPRC_CINELOG30_V3),
    official('نظام الفيديو', 'DJI O4 Air Unit Pro', '', 'صفحة Cinelog30 V3 O4 Pro', GEPRC_CINELOG30_V3),
    official(
      'زمن الطيران المعلَن', 'حتى 8 دقائق و10 ثوانٍ ببطارية LiHV بجهد 4S وسعة 720 ميلي أمبير/ساعة',
      '', 'صفحة Cinelog30 V3 O4 Pro', GEPRC_CINELOG30_V3,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'geprc-cinelog35': [
    official('المحرّكات', 'SPEEDX2 2105.5 2650KV', '', 'صفحة CineLog35 V3 O4 Pro', GEPRC_CINELOG35_V3),
    official('المراوح', 'HQProp D-T90mm ثلاثية الشفرات', '', 'صفحة CineLog35 V3 O4 Pro', GEPRC_CINELOG35_V3),
    official('متحكّم الطيران والمسرّع', 'GEP-F722-45A AIO النسخة الثانية', '', 'صفحة CineLog35 V3 O4 Pro', GEPRC_CINELOG35_V3),
    official(
      'نظام الفيديو', 'DJI O4 Air Unit Pro مع تسجيل بدقّة 4K عند 120 إطاراً في الثانية',
      '', 'صفحة CineLog35 V3 O4 Pro', GEPRC_CINELOG35_V3,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'geprc-cinebot30': [
    official('المحرّكات', '1804', '', 'صفحة Cinebot30 HD O3', GEPRC_CINEBOT30),
    official('المراوح', 'HQProp T76mm ثلاثية الشفرات', '', 'صفحة Cinebot30 HD O3', GEPRC_CINEBOT30),
    official('متحكّم الطيران والمسرّع', 'GEP-F722-45A AIO النسخة الثانية', '', 'صفحة Cinebot30 HD O3', GEPRC_CINEBOT30),
    official(
      'الوزن بلا بطارية',
      '209.2 غرام للنسخة التماثلية و234.7 غرام لنسخة DJI O3',
      '', 'صفحة Cinebot30 HD O3', GEPRC_CINEBOT30,
    ),
    {
      labelAr: 'سرعة دوران المحرّك لكل فولت',
      valueAr: NOT_PUBLISHED_AR,
      status: 'pending',
    },
  ],

  'geprc-crocodile7': [
    official('المحرّكات', 'GR2306 1600KV', '', 'صفحة Crocodile 7 PRO', GEPRC_CROCODILE7),
    official('المسافة بين المحرّكات', '315', 'مم', 'صفحة Crocodile 7 PRO', GEPRC_CROCODILE7),
    official(
      'طاقة مرسل الفيديو',
      'قابلة للضبط: صامت، 25، 100، 200، 600، 800 ميلي واط',
      '', 'صفحة Crocodile 7 PRO', GEPRC_CROCODILE7,
    ),
    official('البطارية', '6S بسعة 2200', 'ميلي أمبير/ساعة', 'صفحة Crocodile 7 PRO', GEPRC_CROCODILE7),
    official('زمن الطيران المعلَن', 'نحو 7', 'دقائق', 'صفحة Crocodile 7 PRO', GEPRC_CROCODILE7),
    official('مكان تركيب وحدة تحديد الموقع', '22 × 20', 'مم', 'صفحة Crocodile 7 PRO', GEPRC_CROCODILE7),
  ],

  'geprc-smart35': [
    official('المحرّكات', 'GEPRC 1404 3850KV', '', 'صفحة SMART35 Analog', GEPRC_SMART35),
    official('المراوح', 'EMAX 3.5 × 2.8 ثلاثية الشفرات', '', 'صفحة SMART35 Analog', GEPRC_SMART35),
    official('الفئة', 'توثبيك فريستايل تحت 250 غراماً', '', 'صفحة SMART35 Analog', GEPRC_SMART35),
    official(
      'نظام الفيديو',
      'نسختان: تماثلية بطاقة 600 ميلي واط، ونسخة HD رقمية',
      '', 'صفحة SMART35 Analog', GEPRC_SMART35,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'geprc-domain36': [
    official('قطر الهيكل بين المحرّكات', '170', 'مم', 'صفحة DoMain3.6 Analog', GEPRC_DOMAIN36),
    official('المحرّكات', 'SPEEDX2 2105.5 2650KV بمحور M5', '', 'صفحة DoMain3.6 Analog', GEPRC_DOMAIN36),
    official('المراوح', 'Gemfan 3630 ثلاثية الشفرات', '', 'صفحة DoMain3.6 Analog', GEPRC_DOMAIN36),
    official('متحكّم الطيران', 'TAKER F722 SE', '', 'صفحة DoMain3.6 Analog', GEPRC_DOMAIN36),
    official('المسرّعات', 'TAKER E55A رباعي ثنائي وثلاثون بت', '', 'صفحة DoMain3.6 Analog', GEPRC_DOMAIN36),
    official('هيكل الوصلات', 'ألومنيوم 7075', '', 'صفحة DoMain3.6 Analog', GEPRC_DOMAIN36),
    official(
      'البطارية الموصى بها', '6S بسعة 1050 إلى 1300', 'ميلي أمبير/ساعة',
      'صفحة DoMain3.6 Analog', GEPRC_DOMAIN36,
    ),
    official('وزن النسخة التماثلية', '279 ± 5', 'غرام', 'صفحة DoMain3.6 Analog', GEPRC_DOMAIN36),
    official('كاميرا النسخة التماثلية', 'RunCam Phoenix 2', '', 'صفحة DoMain3.6 Analog', GEPRC_DOMAIN36),
    official(
      'النسخة الرقمية', 'DoMain3.6 HD O3 بنظام DJI O3، ونسخة HD WTFPV',
      '', 'صفحة DoMain3.6 HD O3', GEPRC_DOMAIN36_O3,
    ),
  ],

  'iflight-nazgul-evoque-f4': [
    official('مقاس المروحة', '4', 'إنش', 'صفحة Nazgul Evoque F4 6S HD', IFLIGHT_EVOQUE_F4),
    official('قطر الهيكل بين المحرّكات', '185', 'مم', 'صفحة Nazgul Evoque F4 6S HD', IFLIGHT_EVOQUE_F4),
    official('جهد البطارية', '6S', '', 'صفحة Nazgul Evoque F4 6S HD', IFLIGHT_EVOQUE_F4),
    official(
      'شكل الهيكل',
      'يُباع بهيكلَين مختلفَين: F4X على شكل X مضغوط، وF4D على شكل DeadCat لإبعاد المراوح عن الكاميرا',
      '', 'صفحة Nazgul Evoque F4 6S HD', IFLIGHT_EVOQUE_F4,
    ),
    official('نظام الفيديو', 'وحدة DJI O3 الرقمية', '', 'صفحة Nazgul Evoque F4 6S HD', IFLIGHT_EVOQUE_F4),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'iflight-chimera7-pro': [
    official('المحرّكات', 'XING2 2809 1250KV', '', 'صفحة Chimera7 Pro V2 6S', IFLIGHT_CHIMERA7_PRO_V2),
    official(
      'قطر الهيكل بين المحرّكات', '327 مم بهندسة DeadCat', '',
      'صفحة Chimera7 Pro V2 6S', IFLIGHT_CHIMERA7_PRO_V2,
    ),
    official('متحكّم الطيران', 'BLITZ F722', '', 'صفحة Chimera7 Pro V2 6S', IFLIGHT_CHIMERA7_PRO_V2),
    official('المسرّعات', 'BLITZ E55 رباعي 55A لجهد 2S-6S', '', 'صفحة Chimera7 Pro V2 6S', IFLIGHT_CHIMERA7_PRO_V2),
    official('وزن النسخة التماثلية بلا بطارية', '705', 'غرام', 'صفحة Chimera7 Pro V2 6S', IFLIGHT_CHIMERA7_PRO_V2),
    official('وزن النسخة الرقمية بلا بطارية', '725', 'غرام', 'صفحة Chimera7 Pro V2 6S', IFLIGHT_CHIMERA7_PRO_V2),
    official(
      'وزن الإقلاع للنسخة الرقمية', '1621 ± 5 غراماً ببطارية سعة 8000 ميلي أمبير/ساعة', '',
      'صفحة Chimera7 Pro V2 6S', IFLIGHT_CHIMERA7_PRO_V2,
    ),
    official(
      'نظام الفيديو',
      'مرسل BLITZ Whoop بطاقة 1.6 أو 2.5 واط في النسخة التماثلية، أو وحدة DJI O3 أو O4 في النسخة الرقمية',
      '', 'صفحة Chimera7 Pro V2 6S', IFLIGHT_CHIMERA7_PRO_V2,
    ),
  ],

  'iflight-chimera7-eco': [
    official('المحرّكات', 'XING-E 2809 لمراوح مقاس 7.5 إنش', '', 'صفحة Chimera7 ECO 6S', IFLIGHT_CHIMERA7_ECO),
    official('متحكّم الطيران', 'BLITZ F7', '', 'صفحة Chimera7 ECO 6S', IFLIGHT_CHIMERA7_ECO),
    official('المسرّعات', 'BLITZ E55 رباعي', '', 'صفحة Chimera7 ECO 6S', IFLIGHT_CHIMERA7_ECO),
    official('مرسل الفيديو', 'BLITZ Whoop بطاقة 1.6 أو 2.5', 'واط', 'صفحة Chimera7 ECO 6S', IFLIGHT_CHIMERA7_ECO),
    official(
      'وحدة تحديد الموقع',
      'لا تأتي مركّبة في النسخة الاقتصادية — تُطلب مركَّبة مسبقاً عند الشراء',
      '', 'صفحة Chimera7 ECO 6S', IFLIGHT_CHIMERA7_ECO,
    ),
    official('الهيكل', 'هيكل سريع الفكّ يميّز النسخ الاقتصادية', '', 'صفحة Chimera7 ECO 6S', IFLIGHT_CHIMERA7_ECO),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'iflight-xing2-2207': [
    official('التكوين', '12N14P', '', 'صفحة XING2 2207', IFLIGHT_XING2_2207),
    official('قطر المحور', '5 مم بطول بارز 13.5 مم', '', 'صفحة XING2 2207', IFLIGHT_XING2_2207),
    official('المغانط', 'N52H منحنية', '', 'صفحة XING2 2207', IFLIGHT_XING2_2207),
    official('المحامل', 'NSK بمقاس 9 × 4 × 4', 'مم', 'صفحة XING2 2207', IFLIGHT_XING2_2207),
    official('فتحات التثبيت', '16 × 16 بقطر 3', 'مم', 'صفحة XING2 2207', IFLIGHT_XING2_2207),
    official('الأسلاك', '160 مم مقاس 20 AWG', '', 'صفحة XING2 2207', IFLIGHT_XING2_2207),
    official(
      'النسخة الحالية',
      '1750KV و2050KV و2750KV — وزنها 30.5 غراماً بالسلك، وأبعادها 29 × 32.25 مم',
      '', 'صفحة XING2 2207', IFLIGHT_XING2_2207,
    ),
    official(
      'النسخة الأقدم',
      '1855KV و2755KV — وزنها 31.6 غراماً بالسلك، وأبعادها 29.08 × 32.6 مم',
      '', 'صفحة XING2 2207', IFLIGHT_XING2_2207,
    ),
  ],

  'walksnail-avatar-hd-x': [
    official('الصورة', '1080p بمعدّل 100 إطار في الثانية بترميز H.265', '', 'صفحة Avatar HD Goggles X', WALKSNAIL_GOGGLES_X),
    official('زاوية الرؤية', '50', 'درجة', 'صفحة Avatar HD Goggles X', WALKSNAIL_GOGGLES_X),
    official('جهد الدخل', '7 – 26 فولت، أي من 2S إلى 6S', '', 'صفحة Avatar HD Goggles X', WALKSNAIL_GOGGLES_X),
    official('الوزن', '290', 'غرام', 'صفحة Avatar HD Goggles X', WALKSNAIL_GOGGLES_X),
    official('تصحيح النظر', 'من +2 إلى -6', 'ديوبتر', 'صفحة Avatar HD Goggles X', WALKSNAIL_GOGGLES_X),
    official('المسافة بين البؤبؤين', '57 – 72', 'مم', 'صفحة Avatar HD Goggles X', WALKSNAIL_GOGGLES_X),
    official(
      'إضافات',
      'حسّاس حركة مدمج، وحسّاس أشعّة تحت حمراء يطفئ الشاشتين تلقائياً، ومدخل ومخرج HDMI، ومدخل تماثلي، وعدسات قابلة للاستبدال',
      '', 'صفحة Avatar HD Goggles X', WALKSNAIL_GOGGLES_X,
    ),
  ],

  'walksnail-avatar-hd-pro': [
    official('الصورة', '1080p بمعدّل 120 إطاراً في الثانية', '', 'صفحة Avatar HD Pro Kit', WALKSNAIL_PRO_KIT),
    official('زمن التأخير المتوسّط', '22', 'مللي ثانية عند أعلى معدّل إطارات', 'صفحة Avatar HD Pro Kit', WALKSNAIL_PRO_KIT),
    official('زاوية الرؤية', '160', 'درجة', 'صفحة Avatar HD Pro Kit', WALKSNAIL_PRO_KIT),
    official('المستشعر', '1/1.8" من نوع Sony Starvis II', '', 'صفحة Avatar HD Pro Kit', WALKSNAIL_PRO_KIT),
    official('التسجيل الداخلي', '8', 'غيغابايت', 'صفحة Avatar HD Pro Kit', WALKSNAIL_PRO_KIT),
    official('تثبيت الصورة', 'يدعم Gyroflow', '', 'صفحة Avatar HD Pro Kit', WALKSNAIL_PRO_KIT),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'hdzero-goggles': [
    official('الشاشتان', 'OLED دقيقة بدقّة 1080p ومعدّل تحديث متكيّف حتى 90 هرتز', '', 'صفحة HDZero Goggle 2', HDZERO_GOGGLE2),
    official(
      'أوضاع البثّ المدعومة', '1080p30 و720p60 و540p90 و540p60', '',
      'صفحة HDZero Goggle 2', HDZERO_GOGGLE2,
    ),
    official('زمن التأخير من زجاج إلى زجاج', '3', 'مللي ثانية دون تقطيع', 'صفحة HDZero Goggle 2', HDZERO_GOGGLE2),
    official('المستقبِل التماثلي', 'مدمج في Goggle 2', '', 'صفحة HDZero Goggle 2', HDZERO_GOGGLE2),
    official('مدخل HDMI', 'حتى 1080p60 و720p100', '', 'صفحة HDZero Goggle 2', HDZERO_GOGGLE2),
    official(
      'وحدة التوسعة',
      'النسخة الأولى تماثلية فقط، والثانية تماثلية ولاسلكية',
      '', 'صفحة HDZero Goggle 2', HDZERO_GOGGLE2,
    ),
  ],

  'hdzero-freestyle-v2': [
    official('الوزن', '22.3', 'غرام', 'صفحة HDZero Freestyle V2 VTX', HDZERO_FREESTYLE_V2),
    official('الأبعاد', '29 × 30 × 14', 'مم', 'صفحة HDZero Freestyle V2 VTX', HDZERO_FREESTYLE_V2),
    official('نطاق التردّد', '5.725 – 5.850', 'غيغاهرتز', 'صفحة HDZero Freestyle V2 VTX', HDZERO_FREESTYLE_V2),
    official('جهد الدخل', '7 – 25', 'فولت', 'صفحة HDZero Freestyle V2 VTX', HDZERO_FREESTYLE_V2),
    official('استهلاك الطاقة', '6 – 15', 'واط', 'صفحة HDZero Freestyle V2 VTX', HDZERO_FREESTYLE_V2),
    official(
      'طاقة الإرسال',
      'تخرج من المصنع محدودة عند 25 و200 ميلي واط، وتصل إلى 1 واط على القناة R1 فقط بترخيص أو '
      + 'موافقة من الجهة المحلّية',
      '', 'صفحة HDZero Freestyle V2 VTX', HDZERO_FREESTYLE_V2,
    ),
    official('أوضاع البثّ', '720p60 و1080p30 و540p60 و540p90', '', 'صفحة HDZero Freestyle V2 VTX', HDZERO_FREESTYLE_V2),
    official(
      'الكاميرا',
      'غير مرفقة — مدخل الكاميرا من نوع MIPI ويحتاج كاميرا HDZero تُشترى منفصلة',
      '', 'صفحة HDZero Freestyle V2 VTX', HDZERO_FREESTYLE_V2,
    ),
  ],

  'speedybee-f7-v3-fc': [
    official('مخارج الجهد', '9 فولت بتيار 4 أمبير و5 فولت بتيار 2 أمبير، كلٌّ منهما مستقل', '', 'صفحة F7 V3 Flight Controller', SPEEDYBEE_F7V3),
    official('تردّد النبضات', 'حتى 128', 'كيلوهرتز', 'صفحة F7 V3 Flight Controller', SPEEDYBEE_F7V3),
    official('مكثّف الحماية', '1000 ميكروفاراد منخفض المقاومة الداخلية', '', 'صفحة F7 V3 Flight Controller', SPEEDYBEE_F7V3),
    official('الصندوق الأسود', 'يُنزَّل عبر البلوتوث أو الواي فاي في نحو 20 ثانية', '', 'صفحة F7 V3 Flight Controller', SPEEDYBEE_F7V3),
    official('مقياس الضغط', 'مدمج لحساب الارتفاع', '', 'صفحة F7 V3 Flight Controller', SPEEDYBEE_F7V3),
    official('فتحة الكاميرا', '22 مم للبناءات الضيّقة', '', 'صفحة F7 V3 Flight Controller', SPEEDYBEE_F7V3),
  ],

  'holybro-kakute-h7': [
    official('المعالج', 'STM32H743 بتردّد 480', 'ميغاهرتز', 'صفحة Kakute H7 V2', HOLYBRO_KAKUTE_H7V2),
    official('حسّاس الحركة', 'ICM-42688-P في النسخة الجديدة', '', 'صفحة Kakute H7 V2', HOLYBRO_KAKUTE_H7V2),
    official(
      'منافذ UART',
      'ستّة منافذ — 1 و2 و3 و4 و6 و7، والثاني مشغول بالبلوتوث لبيانات القياس',
      '', 'صفحة Kakute H7 V2', HOLYBRO_KAKUTE_H7V2,
    ),
    official('مخارج الجهد', '5 فولت بتيار 2 أمبير مستمر، و9 فولت بتيار 1.5 أمبير مستمر', '', 'صفحة Kakute H7 V2', HOLYBRO_KAKUTE_H7V2),
    official('مقاس التثبيت', '30.5 × 30.5 بفتحات قطرها 4 مم وحلقات مطّاطية قطرها 3 مم', '', 'صفحة Kakute H7 V2', HOLYBRO_KAKUTE_H7V2),
    official('ذاكرة الصندوق الأسود', '128', 'ميغابايت', 'صفحة Kakute H7 V2', HOLYBRO_KAKUTE_H7V2),
    official(
      'إضافات',
      'بلوتوث مدمج، ومقياس ضغط، وشاشة معلومات، ومنفذ كاميرا رقمية، ومنفذا مسرّعات رباعية، ومفتاح إطفاء لخطّ 9 فولت',
      '', 'صفحة Kakute H7 V2', HOLYBRO_KAKUTE_H7V2,
    ),
  ],

  'speedybee-bls-50a': [
    official('الحماية', 'ثنائي TVS لامتصاص قفزات الجهد، ومكثّف 1000 ميكروفاراد منخفض المقاومة', '', 'صفحة F405 BLS 50A 4-in-1', SPEEDYBEE_BLS50),
    official('مقاس التثبيت', '30.5 × 30.5', 'مم', 'صفحة F405 BLS 50A 4-in-1', SPEEDYBEE_BLS50),
    official(
      'الجيل الأحدث',
      'SpeedyBee BLS 60A بنفس المقاس — تيّار مستمر 240 أمبير موزّعاً على القنوات الأربع، وذروة 320 أمبير لعشر ثوانٍ',
      '', 'صفحة BLS 60A 4-in-1', SPEEDYBEE_BLS60,
    ),
  ],

  'hobbywing-xrotor-g2': [
    official('التيّار المستمر', '45', 'أمبير', 'صفحة XRotor FPV G2 45A', HOBBYWING_G2_45),
    official('تيّار الذروة', '60', 'أمبير', 'صفحة XRotor FPV G2 45A', HOBBYWING_G2_45),
    official('جهد الدخل', '3 إلى 6S', '', 'صفحة XRotor FPV G2 45A', HOBBYWING_G2_45),
    official('الوزن', '12', 'غرام', 'صفحة XRotor FPV G2 45A', HOBBYWING_G2_45),
    official('الأبعاد', '40 × 33 × 5', 'مم', 'صفحة XRotor FPV G2 45A', HOBBYWING_G2_45),
    official('مخرج الجهد', 'لا يوجد في نسخة 45 أمبير', '', 'صفحة XRotor FPV G2 45A', HOBBYWING_G2_45),
    manual('المعالج', 'ثنائي وثلاثون بت بتردّد حتى 120 ميغاهرتز', '', 'ورقة بيانات XRotor FPV G2', HOBBYWING_G2_SHEET),
    manual('تردّد النبضات', 'متغيّر من 48 إلى 96', 'كيلوهرتز', 'ورقة بيانات XRotor FPV G2', HOBBYWING_G2_SHEET),
    official(
      'النسخة الأكبر',
      'XRotor FPV G2 بتيار 65 أمبير مستمر و80 ذروة، ومخرج 5 فولت بتيار 0.6 أمبير، ووزن 15 غراماً، وأبعاد 52 × 42 × 6.6 مم',
      '', 'صفحة XRotor FPV G2 65A', HOBBYWING_G2_65,
    ),
  ],

  'tmotor-f55a-pro-ii': [
    official('التيّار المستمر', '55', 'أمبير', 'صفحة F55A Pro II', TMOTOR_F55A),
    official('تيّار الذروة', '75', 'أمبير', 'صفحة F55A Pro II', TMOTOR_F55A),
    official('جهد الدخل', '3 إلى 6S', '', 'صفحة F55A Pro II', TMOTOR_F55A),
    official('مخرج الجهد', '10 فولت بتيار 2', 'أمبير', 'صفحة F55A Pro II', TMOTOR_F55A),
    {
      labelAr: 'برنامج المسرّع',
      valueAr: 'AM32',
      status: 'disputed',
      disagreementAr:
        'عنوان صفحة الشركة يذكر AM32 بينما يذكر نصّ الصفحة نفسها BLHeli32. لم يُعتمد أيّ منهما '
        + 'قبل مراجعة الوحدة نفسها، لأن البرنامج يحدّد ما يمكن ضبطه.',
    },
  ],

  'emax-eco-ii-2306': [
    official('سرعات الدوران المتاحة', '1700KV و1900KV و2400KV', '', 'صفحة ECO II 2306', EMAX_ECO_II),
    official('الوزن بلا سلك', '28.3', 'غرام', 'صفحة ECO II 2306', EMAX_ECO_II),
    official('قطر المحور', '4', 'مم', 'صفحة ECO II 2306', EMAX_ECO_II),
    official('فتحات التثبيت', '16 × 16', 'مم', 'صفحة ECO II 2306', EMAX_ECO_II),
    official('الأسلاك', '120 مم مقاس 20 AWG', '', 'صفحة ECO II 2306', EMAX_ECO_II),
    official(
      'الجيل التالي',
      'EMAX ECO III 2306 لجهد 3 إلى 6S بنفس سرعات الدوران الثلاث',
      '', 'صفحة ECO III 2306', EMAX_ECO_III,
    ),
  ],

  'tmotor-f60-pro-v': [
    official('المقاس', '2207.5', '', 'صفحة F60 PRO V', TMOTOR_F60PROV),
    official('التكوين', '12N14P', '', 'صفحة F60 PRO V', TMOTOR_F60PROV),
    official('الوزن مع السلك', '33.3 إلى 34.3', 'غرام حسب سرعة الدوران', 'صفحة F60 PRO V', TMOTOR_F60PROV),
    official('عدد سرعات الدوران المتاحة', '4', 'خيارات', 'صفحة F60 PRO V', TMOTOR_F60PROV),
    official(
      'النسخة الأخفّ',
      'F60 PRO V-LV بسرعتَي 1950KV و2020KV ووزن نحو 32 غراماً — قاعدة ومغزل مفرّغان يوفّران 5.7٪ من الوزن',
      '', 'صفحة F60 PRO V', TMOTOR_F60PROV,
    ),
  ],

  // The built aircraft. TBS lists this as its own product, separate from the
  // bare frame below — which is why this catalogue carries both.
  'tbs-source-one-v5': [
    official(
      'ما هو',
      'TBS Source One V5.1 RTF/BNF Set — الهيكل المفتوح نفسه مبنيّاً وجاهزاً للربط أو للطيران',
      '', 'صفحة TBS Source One V5.1 RTF/BNF Set', TBS_SOURCE_ONE_RTF,
    ),
    official(
      'الشكل', 'X واسع المسافة — مخصَّص للفريستايل والطيران الحرّ', '',
      'صفحة TBS Source One V5.1 5inch', TBS_SOURCE_ONE_V51,
    ),
    official(
      'الترخيص',
      'مبنيّ على مشروع مفتوح تبرّعت به الشركة للمجتمع وملفّاته منشورة — لذلك تُصنَّع قطع غياره على نطاق واسع',
      '', 'صفحة TBS Source One V5.1 5inch', TBS_SOURCE_ONE_V51,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
    { labelAr: 'المكوّنات المرفقة', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  // The bare frame. Same project, different purchase.
  'tbs-source-one-v5-frame': [
    official(
      'الشكل', 'X واسع المسافة — مخصَّص للفريستايل والطيران الحرّ', '',
      'صفحة TBS Source One V5.1 5inch', TBS_SOURCE_ONE_V51,
    ),
    official(
      'الترخيص',
      'مشروع مفتوح تبرّعت به الشركة للمجتمع، وملفّاته منشورة على GitHub — لذلك تُصنَّع قطعه على نطاق واسع',
      '', 'صفحة TBS Source One V5.1 5inch', TBS_SOURCE_ONE_V51,
    ),
    official(
      'الطراز الحالي',
      'V5.1 هو الاسم الرسمي — ولا يوجد طراز باسم «V5» مجرَّداً',
      '', 'صفحة TBS Source One V5.1 5inch', TBS_SOURCE_ONE_V51,
    ),
    official(
      'الجيل التالي', 'TBS Source One V6 مقاس 5 إنش، وله أذرع بديلة تُباع مستقلّة', '',
      'صفحة TBS Source One V6 5inch', TBS_SOURCE_ONE_V6,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
    { labelAr: 'سماكة الأذرع', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'betafpv-pavo30': [
    official('المحرّكات', '1506 3000KV', '', 'صفحة Pavo30 Whoop Quadcopter', BETAFPV_PAVO30),
    official('المراوح', 'Gemfan D76 خماسية الشفرات', '', 'صفحة Pavo30 Whoop Quadcopter', BETAFPV_PAVO30),
    official(
      'متحكّم الطيران والمسرّع',
      'Toothpick F722 AIO بمسرّع 35 أمبير من نوع BLHeli_S وشاشة معلومات Betaflight',
      '', 'صفحة Pavo30 Whoop Quadcopter', BETAFPV_PAVO30,
    ),
    official(
      'التصميم',
      'أوّل ووب دافع بمقاس ثلاث إنشات عند BetaFPV — المراوح فوق الأذرع لا بينها',
      '', 'صفحة Pavo30 Whoop Quadcopter', BETAFPV_PAVO30,
    ),
    official(
      'البطارية الموصى بها', '4S بسعة 750', 'ميلي أمبير/ساعة',
      'صفحة Pavo30 Whoop Quadcopter', BETAFPV_PAVO30,
    ),
    official(
      'زمن الطيران المعلَن', '6 إلى 8', 'دقائق ببطارية 4S سعة 750',
      'صفحة Pavo30 Whoop Quadcopter', BETAFPV_PAVO30,
    ),
    official(
      'نسخ الفيديو', 'نسخة تماثلية ونسخة رقمية', '',
      'صفحة Pavo30 Whoop Quadcopter', BETAFPV_PAVO30,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'armattan-marmotte': [
    official('المسافة بين المحرّكات', '236', 'مم', 'صفحة Marmotte 5" Frame Kit', ARMATTAN_MARMOTTE),
    official('الوزن', 'نحو 115', 'غرام', 'صفحة Marmotte 5" Frame Kit', ARMATTAN_MARMOTTE),
    official('الشكل', 'X مضغوط', '', 'صفحة Marmotte 5" Frame Kit', ARMATTAN_MARMOTTE),
    official('سماكة اللوح الرئيسي', '4', 'مم', 'صفحة Marmotte 5" Frame Kit', ARMATTAN_MARMOTTE),
    official(
      'الضمان',
      'يغطّي كلّ قطع الكربون والمعدن في الهيكل — من المصدّ إلى المصدّ ومن الأعلى إلى الأسفل',
      '', 'صفحة Marmotte 5" Frame Kit', ARMATTAN_MARMOTTE,
    ),
  ],

  'impulserc-apex': [
    official(
      'الجيل الحالي',
      'ApexDC EVO مقاس 5 إنش — أذرع أمامية بمقاس 5 إنش وخلفية بمقاس 6 إنش',
      '', 'صفحة ApexDC EVO 5"', IMPULSERC_APEXDC,
    ),
    official(
      'النسخة الصغيرة',
      'Micro Apex مقاس 5 إنش بوزن 67 غراماً للكربون والمسامير، وأذرع كربون سماكتها 4 مم تقبل محرّكات بفتحات 9×9 و12×12 مم',
      '', 'صفحة ApexDC EVO 5"', IMPULSERC_APEXDC,
    ),
    official(
      'نسخة المدى الطويل',
      'ApexLR EVO مقاس 7 إنش بأذرع سماكتها 5.5 مم — أخفّ بعشرين غراماً من أذرع 8 مم المكافئة',
      '', 'صفحة ApexDC EVO 5"', IMPULSERC_APEXDC,
    ),
    { labelAr: 'المسافة بين المحرّكات', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'cnhl-black-series-4s': [
    official('الجهد', '14.8 فولت — أربع خلايا', '', 'صفحة CNHL Black Series', CNHL_BLACK),
    official(
      'السعات المتاحة',
      '1100 ميلي أمبير/ساعة بمعدّل 100C، و1500 بمعدّل 130C في النسخة الثانية، و5000 بمعدّل 65C',
      '', 'صفحة CNHL Black Series', CNHL_BLACK,
    ),
    official(
      'الموصّل',
      'XT60 في السعات الصغيرة، وXT90 في سعة 5000 ميلي أمبير/ساعة',
      '', 'صفحة CNHL Black Series', CNHL_BLACK,
    ),
    official(
      'النسخة الثانية',
      'CNHL Black Series V2.0 برفع معدّل التفريغ من 100C إلى 130C',
      '', 'صفحة CNHL Black Series V2.0', CNHL_BLACK_V2,
    ),
  ],

  'cnhl-black-series-6s': [
    official('الجهد', '22.2 فولت — ستّ خلايا', '', 'صفحة CNHL Black Series', CNHL_BLACK),
    official(
      'السعات المتاحة',
      '1100 و2000 ميلي أمبير/ساعة بمعدّل 100C مستمر و200C ذروة، و1500 بمعدّل 130C في النسخة الثانية، و5000 بمعدّل 65C',
      '', 'صفحة CNHL Black Series', CNHL_BLACK,
    ),
    official('الموصّل', 'XT60', '', 'صفحة CNHL Black Series', CNHL_BLACK),
    official(
      'النسخة الثانية',
      'CNHL Black Series V2.0 برفع معدّل التفريغ من 100C إلى 130C',
      '', 'صفحة CNHL Black Series V2.0', CNHL_BLACK_V2,
    ),
  ],

  'tattu-r-line-v5-6s': [
    official('الجهد', '22.2 فولت — ستّ خلايا', '', 'صفحة Tattu R-Line Version 5.0', TATTU_RLINE_V5),
    official('معدّل التفريغ', '150C', '', 'صفحة Tattu R-Line Version 5.0', TATTU_RLINE_V5),
    official(
      'السعات المتاحة',
      '850 و1050 و1200 و1400 و1480 و1550 و1800 و2200 ميلي أمبير/ساعة',
      '', 'صفحة Tattu R-Line Version 5.0', TATTU_RLINE_V5,
    ),
    official('وزن سعة 850', '145 غراماً بأبعاد 60 × 30 × 45 مم وموصّل XT30U-F', '', 'صفحة Tattu R-Line Version 5.0', TATTU_RLINE_V5),
    official('وزن سعة 1050', '186 غراماً بأبعاد 76 × 38 × 33 مم', '', 'صفحة Tattu R-Line Version 5.0', TATTU_RLINE_V5),
    official('وزن سعة 2200', '346 ± 20 غراماً بأبعاد 106.3 × 34.17 × 48.96 مم', '', 'صفحة Tattu R-Line Version 5.0', TATTU_RLINE_V5),
  ],

  'isdt-q6-charger': [
    manual('الطاقة', '200', 'واط', 'دليل Q6 Nano الرسمي', ISDT_Q6NANO_MANUAL),
    manual('جهد الدخل', '10 – 24', 'فولت', 'دليل Q6 Nano الرسمي', ISDT_Q6NANO_MANUAL),
    manual(
      'حماية الدخل',
      'يوقف الشحن إذا هبط جهد الدخل تحت الحدّ المضبوط — وهو ما يمنع تفريغ البطارية المستعملة كمصدر طاقة',
      '', 'دليل Q6 Nano الرسمي', ISDT_Q6NANO_MANUAL,
    ),
  ],

  'isdt-608ac': [
    manual('الطاقة', '200 واط من مصدر مستمر، و50 واط من الكهرباء مباشرة', '', 'دليل 608AC الرسمي', ISDT_608AC_MANUAL),
    manual('جهد الخرج', '2 – 30', 'فولت', 'دليل 608AC الرسمي', ISDT_608AC_MANUAL),
    manual('تيّار الخرج', '0.2 – 5.0', 'أمبير', 'دليل 608AC الرسمي', ISDT_608AC_MANUAL),
    manual('طاقة الدخل القابلة للضبط', '30 – 230', 'واط في وضع المصدر المستمر', 'دليل 608AC الرسمي', ISDT_608AC_MANUAL),
    manual(
      'الموازنة',
      'الشركة توصي بوصل منفذ الموازنة دائماً — وجهد كل خليّة ومقاومتها الداخلية لا تظهران إلا في وضع الموازنة',
      '', 'دليل 608AC الرسمي', ISDT_608AC_MANUAL,
    ),
  ],

  'runcam-phoenix-2': [
    official('المستشعر', '1/2" من نوع CMOS', '', 'صفحة RunCam Phoenix 2', RUNCAM_PHOENIX2),
    official('الوضوح', '1000', 'خط تلفزيوني', 'صفحة RunCam Phoenix 2', RUNCAM_PHOENIX2),
    official('زاوية الرؤية', '155 درجة بنسبة 4:3، وتبديل بين 4:3 و16:9', '', 'صفحة RunCam Phoenix 2', RUNCAM_PHOENIX2),
    official('الوزن', '9', 'غرام', 'صفحة RunCam Phoenix 2', RUNCAM_PHOENIX2),
    official('جهد التشغيل', '5 – 36 فولت مستمر', '', 'صفحة RunCam Phoenix 2', RUNCAM_PHOENIX2),
    official('العدسة', '2.1 مم بحامل M12 وفتحة f/2.0', '', 'صفحة RunCam Phoenix 2', RUNCAM_PHOENIX2),
    official('أقلّ إضاءة', '0.001', 'لكس', 'صفحة RunCam Phoenix 2', RUNCAM_PHOENIX2),
    manual('الأبعاد', '19 × 19 × 20', 'مم', 'دليل Phoenix 2 الرسمي', RUNCAM_PHOENIX2_MANUAL),
    manual('استهلاك التيّار', '220 ميلي أمبير عند 5 فولت، و120 عند 12 فولت', '', 'دليل Phoenix 2 الرسمي', RUNCAM_PHOENIX2_MANUAL),
  ],

  'foxeer-razer-micro': [
    official('الوضوح', '1200', 'خط تلفزيوني', 'صفحة Foxeer Micro Razer', FOXEER_MICRO_RAZER),
    official('العدسة', '1.8', 'مم', 'صفحة Foxeer Micro Razer', FOXEER_MICRO_RAZER),
    official('زمن التأخير', '4', 'مللي ثانية', 'صفحة Foxeer Micro Razer', FOXEER_MICRO_RAZER),
    official('النظام', 'تبديل بين PAL وNTSC', '', 'صفحة Foxeer Micro Razer', FOXEER_MICRO_RAZER),
    official(
      'الخط الأحدث',
      'Foxeer Razer Mini بنسختَيه الثانية والثالثة',
      '', 'صفحة Foxeer Razer Mini V3', FOXEER_RAZER_MINI_V3,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'rush-tank-ultimate': [
    official(
      'الجيل الحالي', 'TANK III ULTIMATE — والنسخة السابقة TANK II ULTIMATE ما زالت تُباع', '',
      'صفحة TANK III ULTIMATE VTX', RUSH_TANK_III,
    ),
    official(
      'مستويات الطاقة', 'صامت، 25، 200، 500، 800 ميلي واط', '',
      'صفحة TANK II ULTIMATE VTX', RUSH_TANK_II,
    ),
    official('جهد الدخل', '7 – 36 فولت مستمر', '', 'صفحة TANK ULTIMATE MINI II VTX', RUSH_TANK_MINI_II),
    official('مخرج الجهد', '5 فولت بتيار 1 أمبير', '', 'صفحة TANK ULTIMATE MINI II VTX', RUSH_TANK_MINI_II),
    official(
      'عدد القنوات', '48 قناة — و37 في النسخة الأمريكية', '',
      'صفحة TANK ULTIMATE MINI II VTX', RUSH_TANK_MINI_II,
    ),
    {
      labelAr: 'الوزن',
      valueAr: NOT_PUBLISHED_AR,
      status: 'pending',
    },
  ],

  'tbs-unify-pro32-nano': [
    official(
      'مستويات الطاقة',
      '25 و100 و400 و600 ميلي واط — أي 14 و20 و26 و28 ديسيبل ميلي واط',
      '', 'صفحة TBS Unify Pro32 Nano 5G8 V1.1', TBS_UNIFY_NANO,
    ),
    official('جهد الدخل', 'بطارية 1S إلى 3S، أي 3 إلى 13 فولت', '', 'صفحة TBS Unify Pro32 Nano 5G8 V1.1', TBS_UNIFY_NANO),
    official('مخرج الجهد', '5 فولت بتيار 2 أمبير، منظَّم ومُرشَّح', '', 'صفحة TBS Unify Pro32 Nano 5G8 V1.1', TBS_UNIFY_NANO),
    official('موصّل الهوائي', 'U.FL', '', 'صفحة TBS Unify Pro32 Nano 5G8 V1.1', TBS_UNIFY_NANO),
    manual('التحسينات', 'ترشيح ضوضاء أفضل وتصريف حرارة محسَّن', '', 'دليل TBS Unify Pro32 الرسمي', TBS_UNIFY_MANUAL),
  ],

  'foxeer-reaper-extreme': [
    official(
      'الجيل الحالي', 'Reaper Extreme V3', '',
      'صفحة Reaper Extreme V3', FOXEER_REAPER_V3,
    ),
    official('طاقة الإرسال', '2.5', 'واط', 'صفحة Reaper Extreme V3', FOXEER_REAPER_V3),
    official('نطاق التردّد', '4.9 – 6', 'غيغاهرتز', 'صفحة Reaper Extreme V3', FOXEER_REAPER_V3),
    official('عدد القنوات', '80', 'قناة', 'صفحة Reaper Extreme V3', FOXEER_REAPER_V3),
    official(
      'النسخ الأخرى المتاحة',
      'نسخة 5.8 غيغاهرتز بطاقة 2.5 واط و40 قناة، ونسخة V2 بطاقة 2.5 واط و72 قناة، '
      + 'ونسخة بطاقة 1.8 واط و72 قناة، ونسخة بطاقة 3 واط و80 قناة',
      '', 'صفحة Reaper Extreme V3', FOXEER_REAPER_V3,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
    { labelAr: 'الأبعاد', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'holybro-m10-gps': [
    official('الشريحة', 'u-blox من سلسلة M10', '', 'صفحة Micro M10 GPS', HOLYBRO_MICRO_M10),
    official(
      'المنظومات المدعومة',
      'GPS وGalileo وGLONASS وBeiDou في وقت واحد',
      '', 'صفحة Micro M10 GPS', HOLYBRO_MICRO_M10,
    ),
    official('الهوائي', 'رقعة عالية الكسب 25 × 25', 'مم', 'صفحة Micro M10 GPS', HOLYBRO_MICRO_M10),
    official('البوصلة', 'IST8310 أو IST8308', '', 'صفحة Micro M10 GPS', HOLYBRO_MICRO_M10),
    official('الإعداد المصنعي', 'سرعة 115200 ومعدّل تحديث 5 هرتز', '', 'صفحة Micro M10 GPS', HOLYBRO_MICRO_M10),
    official(
      'بطارية احتياطية',
      'قابلة للشحن، تُبقي بيانات الأقمار فيبدأ التثبيت أسرع بعد إطفاء قصير',
      '', 'صفحة Micro M10 GPS', HOLYBRO_MICRO_M10,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'flywoo-goku-gm10-pro': [
    official('الشريحة', 'M10050', '', 'صفحة GOKU GM10 Pro V3 GPS w/ Compass', FLYWOO_GM10_PRO_V3),
    official('البوصلة', 'QMC5883L', '', 'صفحة GOKU GM10 Pro V3 GPS w/ Compass', FLYWOO_GM10_PRO_V3),
    official('الوزن', '7.3', 'غرام', 'صفحة GOKU GM10 Pro V3 GPS w/ Compass', FLYWOO_GM10_PRO_V3),
    official('الأبعاد', '25 × 25 × 6', 'مم', 'صفحة GOKU GM10 Pro V3 GPS w/ Compass', FLYWOO_GM10_PRO_V3),
    official('الموصل', 'ستّة أطراف بتباعد 1.00', 'مم', 'صفحة GOKU GM10 Pro V3 GPS w/ Compass', FLYWOO_GM10_PRO_V3),
    official(
      'المنظومات المدعومة',
      'GPS وGLONASS وGalileo وBeiDou وQZSS وSBAS على 72 قناة بحث',
      '', 'صفحة GOKU GM10 Pro V3 GPS w/ Compass', FLYWOO_GM10_PRO_V3,
    ),
    official('الحساسية', 'تتبّع عند -162 ديسيبل ميلي واط، واستعادة عند -160', '', 'صفحة GOKU GM10 Pro V3 GPS w/ Compass', FLYWOO_GM10_PRO_V3),
    official('معدّل التحديث', 'من 1 إلى 10 هرتز، والافتراضي 10', '', 'صفحة GOKU GM10 Pro V3 GPS w/ Compass', FLYWOO_GM10_PRO_V3),
    official('جهد التشغيل', '3.3 – 5', 'فولت', 'صفحة GOKU GM10 Pro V3 GPS w/ Compass', FLYWOO_GM10_PRO_V3),
  ],

  'radiomaster-rp1': [
    official('المعالج ووحدة الراديو', 'ESP8285 مع شريحة SX1280', '', 'صفحة RP1 V2 ExpressLRS', RM_RP1),
    official('النطاق', '2.4', 'غيغاهرتز', 'صفحة RP1 V2 ExpressLRS', RM_RP1),
    official('موصّل الهوائي', 'U.FL — يقبل هوائياً كامل المدى', '', 'صفحة RP1 V2 ExpressLRS', RM_RP1),
    official('المذبذب', 'TCXO معوَّض حرارياً لثبات التردّد', '', 'صفحة RP1 V2 ExpressLRS', RM_RP1),
    official(
      'التحديث والضبط',
      'واي فاي مدمج — يُحدَّث ويُضبط من المتصفّح على الحاسوب أو الهاتف بلا كابل',
      '', 'صفحة RP1 V2 ExpressLRS', RM_RP1,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'happymodel-ep1-elrs': [
    official('المعالج ووحدة الراديو', 'ESP8285 مع شريحة SX1280 من طراز SX1281IMLTRT', '', 'صفحة EP1 / EP2 / EP1Dual', HAPPYMODEL_EP1),
    official('نطاق التردّد', '2400 – 2500', 'ميغاهرتز', 'صفحة EP1 / EP2 / EP1Dual', HAPPYMODEL_EP1),
    official('معدّل التحديث', '25 – 500', 'هرتز', 'صفحة EP1 / EP2 / EP1Dual', HAPPYMODEL_EP1),
    official('جهد التشغيل', '5', 'فولت', 'صفحة EP1 / EP2 / EP1Dual', HAPPYMODEL_EP1),
    official('الوزن بلا هوائي', '0.41', 'غرام', 'صفحة EP1 / EP2 / EP1Dual', HAPPYMODEL_EP1),
    official('الأبعاد', '10 × 10 × 6', 'مم', 'صفحة EP1 / EP2 / EP1Dual', HAPPYMODEL_EP1),
    official('كسب الهوائي', '2.23', 'ديسيبل', 'صفحة EP1 / EP2 / EP1Dual', HAPPYMODEL_EP1),
    official(
      'النسخ الأخرى',
      'EP2 بهوائي سيراميكي ملصوق ووزن 0.44 غرام وكسب 3.7 ديسيبل، وEP1 Dual بهوائيين وتنوّع حقيقي',
      '', 'صفحة EP1 / EP2 / EP1Dual', HAPPYMODEL_EP1,
    ),
  ],

  'betafpv-superd-elrs': [
    official('الوزن بلا هوائي', '1.1', 'غرام', 'صفحة SuperD ELRS Diversity Receiver', BETAFPV_SUPERD),
    official(
      'التنوّع',
      'تنوّع حقيقي بسلسلتَي استقبال كاملتين وهوائيين — لا بمبدّل بين هوائيين',
      '', 'صفحة SuperD ELRS Diversity Receiver', BETAFPV_SUPERD,
    ),
    official('المذبذب', 'TCXO معوَّض حرارياً', '', 'صفحة SuperD ELRS Diversity Receiver', BETAFPV_SUPERD),
    official('النطاقات المتاحة', '2.4 غيغاهرتز، و915 أو 868 ميغاهرتز', '', 'صفحة SuperD ELRS Diversity Receiver', BETAFPV_SUPERD),
    official('البروتوكول إلى متحكّم الطيران', 'CRSF', '', 'صفحة SuperD ELRS Diversity Receiver', BETAFPV_SUPERD),
    official(
      'الخط الأحدث',
      'SuperX ELRS Gemini Xross Receiver',
      '', 'صفحة SuperX ELRS Gemini Xross Receiver', BETAFPV_SUPERX,
    ),
  ],

  'truerc-x-air': [
    official('الكسب', '9.5 – 10.5', 'ديسيبل دائري', 'صفحة X-AIR 5.8 MK II', TRUERC_XAIR_MK2),
    official('زاوية الحزمة', '120', 'درجة', 'صفحة X-AIR 5.8 MK II', TRUERC_XAIR_MK2),
    official('نطاق التردّد', '5.1 – 6.7', 'غيغاهرتز', 'صفحة X-AIR 5.8 MK II', TRUERC_XAIR_MK2),
    official('الأبعاد', '32 × 32 × 16', 'مم', 'صفحة X-AIR 5.8 MK II', TRUERC_XAIR_MK2),
    official('الموصّل والاستقطاب', 'RP-SMA، ويُباع باستقطاب يميني أو يساري', '', 'صفحة X-AIR 5.8 MK II', TRUERC_XAIR_MK2),
    official(
      'موضعه في تصنيف الشركة',
      'مصنَّف ضمن هوائيات الاستقبال للمدى الطويل — أي هوائي نظّارة، لا هوائي طائرة',
      '', 'صفحة X-AIR 5.8 MK II', TRUERC_XAIR_MK2,
    ),
  ],

  'lumenier-axii-2': [
    official('الكسب', '2.2', 'ديسيبل دائري', 'صفحة Lumenier AXII 2', LUMENIER_AXII2),
    official('نسبة المحور', 'نحو 1.0 — أي استقطاب دائري شبه مثالي', '', 'صفحة Lumenier AXII 2', LUMENIER_AXII2),
    official(
      'الموصّلات المتاحة',
      'SMA مستقيم وطويل وقصير، وMMCX، وU.FL، ونسخة بزاوية قائمة',
      '', 'صفحة Lumenier AXII 2', LUMENIER_AXII2,
    ),
    official('الغلاف', 'بولي كربونات مصبوبة', '', 'صفحة Lumenier AXII 2', LUMENIER_AXII2),
    official('الكابل', '45 مم من نوع RG178', '', 'صفحة Lumenier AXII 2', LUMENIER_AXII2),
    official('الاستقطاب', 'يُباع يمينياً ويسارياً — يجب أن يطابق ما على الطرف الآخر', '', 'صفحة Lumenier AXII 2', LUMENIER_AXII2),
  ],

  'foxeer-lollipop-4': [
    official('الكسب', '2.6', 'ديسيبل', 'صفحة Foxeer Lollipop 4', FOXEER_LOLLIPOP4),
    official('النطاق', '5.8', 'غيغاهرتز', 'صفحة Foxeer Lollipop 4', FOXEER_LOLLIPOP4),
    official('النمط', 'دائري الاستقطاب متعدّد الاتجاهات', '', 'صفحة Foxeer Lollipop 4', FOXEER_LOLLIPOP4),
    official(
      'النسخ المتاحة',
      'النسخة العادية بعبوة زوجية، ونسخة قصيرة، ونسخة Plus، ونسخة Plus بزاوية وموصّل SMA واستقطاب يميني',
      '', 'صفحة Foxeer Lollipop 4', FOXEER_LOLLIPOP4,
    ),
    { labelAr: 'الوزن', valueAr: NOT_PUBLISHED_AR, status: 'pending' },
  ],

  'gemfan-hurricane-51466': [
    official('عدد الشفرات', '3', 'شفرات', 'صفحة Hurricane 51466 V2', GEMFAN_51466_V2),
    official('الخطوة', '3.6', 'إنش', 'صفحة Hurricane 51466 V2', GEMFAN_51466_V2),
    official('قطر القرص', '131.8', 'مم', 'صفحة Hurricane 51466 V2', GEMFAN_51466_V2),
    official('الوزن', '4.2', 'غرام', 'صفحة Hurricane 51466 V2', GEMFAN_51466_V2),
    official('المادّة', 'بولي كربونات', '', 'صفحة Hurricane 51466 V2', GEMFAN_51466_V2),
    official('فتحة المركز', 'M5 بسماكة مركز 6.8 مم', '', 'صفحة Hurricane 51466 V2', GEMFAN_51466_V2),
    official('المحرّكات الموصى بها', 'من مقاس 2207 و2306 فما فوق', '', 'صفحة Hurricane 51466 V2', GEMFAN_51466_V2),
    official('النسخة الثانية', 'متانة أعلى بنسبة 20٪ بتصميم شفرة محسَّن', '', 'صفحة Hurricane 51466 V2', GEMFAN_51466_V2),
  ],

  'betafpv-cetus-lite': [
    official('نوع المحرّكات', 'محرّكات مكنَّسة (brushed) لا عديمة المكانس', '', 'صفحة Cetus Lite FPV Kit', BETAFPV_CETUS_LITE),
    official('الوزن مع البطارية', '36', 'غرام', 'صفحة Cetus Lite FPV Kit', BETAFPV_CETUS_LITE),
    official('زمن الطيران المعلَن', '4 – 5', 'دقائق', 'صفحة Cetus Lite FPV Kit', BETAFPV_CETUS_LITE),
    official('المدى المعلَن', '80 متراً في مكان مفتوح بلا رياح', '', 'صفحة Cetus Lite FPV Kit', BETAFPV_CETUS_LITE),
    official('مادّة الهيكل', 'PA12', '', 'صفحة Cetus Lite FPV Kit', BETAFPV_CETUS_LITE),
    official('النظّارة المرفقة', 'VR02', '', 'صفحة Cetus Lite FPV Kit', BETAFPV_CETUS_LITE),
    official('جهاز التحكّم المرفق', 'LiteRadio 1', '', 'صفحة Cetus Lite FPV Kit', BETAFPV_CETUS_LITE),
    official('مساعدات الطيران', 'ثبات ارتفاع مساعِد', '', 'صفحة Cetus Lite FPV Kit', BETAFPV_CETUS_LITE),
  ],

  'emax-tinyhawk-3-rtf': [
    official('المحرّكات', '15000KV', '', 'صفحة Tinyhawk III RTF Kit', EMAX_TINYHAWK3),
    official('متحكّم الطيران والمسرّع', 'F4 بمسرّع 5A', '', 'صفحة Tinyhawk III RTF Kit', EMAX_TINYHAWK3),
    official('الكاميرا', 'RunCam Nano 4', '', 'صفحة Tinyhawk III RTF Kit', EMAX_TINYHAWK3),
    official('مرسل الفيديو', '37 قناة بطاقة 25 أو 100 أو 200 ميلي واط', '', 'صفحة Tinyhawk III RTF Kit', EMAX_TINYHAWK3),
    official('جهد البطارية', '1S إلى 2S', '', 'صفحة Tinyhawk III RTF Kit', EMAX_TINYHAWK3),
    official(
      'بروتوكول التحكّم',
      'FrSky D8 — وهو ليس تفضيلاً: جهاز هذا الطقم لا يشغّل مستقبِل ExpressLRS',
      '', 'صفحة Tinyhawk III RTF Kit', EMAX_TINYHAWK3,
    ),
  ],
};

/** Products with at least one sourced figure recorded in this file. */
export function documentedProductIds(): string[] {
  return Object.keys(LAUNCH_SPECS);
}
