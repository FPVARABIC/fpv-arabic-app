import type { BuildStage } from './types';

// TODO: Ahmed will review specs
//
// Stage 3 is the MERGED video stage: the old two-stage split (conceptual
// videoSystems pick at stage-3, then the concrete videoUnits product at
// stage-10) collapsed into one stage selecting directly from videoUnits.
// The old split's only safeguard (validateVideoSystemVideoUnit) was never
// wired into the report, and the units' own prose carries the system
// trade-offs; the one guardrail the split really provided — the unit must
// match the goggles' system — now lives in this stage's descriptionAr.
// videoSystems.ts still exists as a data/evidence archive but is no
// longer wired to any stage.
export const buildStages: BuildStage[] = [
  { id: 'stage-1',  number: 1,  titleAr: 'اختيار نوع الدرون',            descriptionAr: 'حدد نوع البناء المناسب لهدفك (Freestyle، سباقات، Cinematic...)', partCategory: null },
  // BuildFlow special-cases this stage id — reads from droneSizeOptions.ts / batteryVoltageOptions.ts, not a parts/*.ts array
  { id: 'stage-2',  number: 2,  titleAr: 'اختيار الحجم',                 descriptionAr: 'حدد حجم الإطار المناسب — الخيارات المعروضة هنا مبنية على القطع المتوفرة فعلياً لنوع الدرون الذي اخترته', partCategory: null },
  { id: 'stage-3',  number: 3,  titleAr: 'اختيار نظام الفيديو (VTX)',    descriptionAr: 'اختر وحدة بث الفيديو المناسبة — يجب أن تكون من نفس نظام نظارتك (DJI أو Walksnail أو HDZero أو Analog)، فالأنظمة غير متوافقة مع بعضها.', partCategory: 'videoUnits' },
  // BuildFlow special-cases this stage id — reads from droneSizeOptions.ts / batteryVoltageOptions.ts, not a parts/*.ts array
  { id: 'stage-4',  number: 4,  titleAr: 'اختيار فولتية البطارية',       descriptionAr: 'حدد فولتية البطارية (4S أو 6S) التي ستبني عليها', partCategory: null },
  { id: 'stage-5',  number: 5,  titleAr: 'اختيار الإطار (Frame)',        descriptionAr: 'اختر الهيكل الذي يحمل كل القطع بحسب حجم الدرون', partCategory: 'frames' },
  { id: 'stage-6',  number: 6,  titleAr: 'اختيار المحركات (Motors)',     descriptionAr: 'اختر المحركات المناسبة لحجم الإطار وفولتية البطارية', partCategory: 'motors' },
  { id: 'stage-7',  number: 7,  titleAr: 'اختيار الـESC',                descriptionAr: 'اختر وحدة التحكم بسرعة المحركات', partCategory: 'escs' },
  { id: 'stage-8',  number: 8,  titleAr: 'اختيار الـFlight Controller',  descriptionAr: 'اختر دماغ الطيران المسؤول عن التوازن والتحكم', partCategory: 'flightControllers' },
  { id: 'stage-9',  number: 9,  titleAr: 'اختيار الـReceiver',           descriptionAr: 'اختر مستقبل إشارة جهاز التحكم', partCategory: 'receivers' },
  { id: 'stage-10', number: 10, titleAr: 'اختيار GPS (اختياري)',         descriptionAr: 'أضف وحدة GPS إن احتجت تتبع الموقع أو العودة للمنزل', partCategory: 'gps' },
  { id: 'stage-11', number: 11, titleAr: 'اختيار الـBuzzer',             descriptionAr: 'اختر جرس تحديد موقع الدرون عند السقوط', partCategory: 'buzzers' },
  { id: 'stage-12', number: 12, titleAr: 'اختيار الـCapacitor',          descriptionAr: 'اختر مكثف تنقية الطاقة لحماية القطع الإلكترونية', partCategory: 'capacitors' },
  { id: 'stage-13', number: 13, titleAr: 'اختيار المراوح (Props)',       descriptionAr: 'اختر المراوح المتوافقة مع حجم الإطار والمحركات', partCategory: 'propellers' },
  { id: 'stage-14', number: 14, titleAr: 'اختيار البطارية (LiPo)',       descriptionAr: 'اختر منتج البطارية المطابق للفولتية التي حددتها', partCategory: 'batteries' },
  { id: 'stage-15', number: 15, titleAr: 'تجهيز الأدوات',                descriptionAr: 'جهّز أدوات اللحام والتجميع قبل البدء', partCategory: 'tools' },
  { id: 'stage-16', number: 16, titleAr: 'فحص التوافق النهائي',          descriptionAr: 'تأكد من توافق كل القطع المختارة مع بعضها قبل إنهاء البناء', partCategory: null },
  { id: 'stage-17', number: 17, titleAr: 'قائمة المشتريات',              descriptionAr: 'ملخص كل القطع المختارة (سيتم تفعيل الشراء لاحقًا)', partCategory: null },
  { id: 'stage-18', number: 18, titleAr: 'خريطة التركيب',                descriptionAr: 'دليل تركيب تفصيلي خطوة بخطوة (قريبًا)', partCategory: null },
];
