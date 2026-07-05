import type { BuildStage } from './types';

// TODO: Ahmed will review specs
export const buildStages: BuildStage[] = [
  { id: 'stage-1',  number: 1,  titleAr: 'اختيار نوع الدرون',        descriptionAr: 'حدد نوع البناء المناسب لهدفك (فريستايل، سباق، سينمائي...)', partCategory: null },
  { id: 'stage-2',  number: 2,  titleAr: 'اختيار الإطار (Frame)',      descriptionAr: 'اختر الهيكل الذي يحمل كل القطع بحسب حجم الدرون', partCategory: 'frames' },
  { id: 'stage-3',  number: 3,  titleAr: 'اختيار المحركات (Motors)',   descriptionAr: 'اختر المحركات المناسبة لحجم الإطار وفولتية البطارية', partCategory: 'motors' },
  { id: 'stage-4',  number: 4,  titleAr: 'اختيار الـESC',              descriptionAr: 'اختر وحدة التحكم بسرعة المحركات', partCategory: 'escs' },
  { id: 'stage-5',  number: 5,  titleAr: 'اختيار الـFlight Controller', descriptionAr: 'اختر دماغ الطيران المسؤول عن التوازن والتحكم', partCategory: 'flightControllers' },
  { id: 'stage-6',  number: 6,  titleAr: 'اختيار الـReceiver',         descriptionAr: 'اختر مستقبل إشارة جهاز التحكم', partCategory: 'receivers' },
  { id: 'stage-7',  number: 7,  titleAr: 'اختيار نظام الفيديو (VTX)',  descriptionAr: 'اختر جهاز بث الصورة المناسب (analog أو digital)', partCategory: 'videoSystems' },
  { id: 'stage-8',  number: 8,  titleAr: 'اختيار الكاميرا',            descriptionAr: 'اختر وحدة الكاميرا المتوافقة مع نظام الفيديو', partCategory: 'videoUnits' },
  { id: 'stage-9',  number: 9,  titleAr: 'اختيار البطارية (LiPo)',     descriptionAr: 'اختر فولتية وسعة البطارية المناسبة للبناء', partCategory: 'batteries' },
  { id: 'stage-10', number: 10, titleAr: 'اختيار المراوح (Props)',     descriptionAr: 'اختر المراوح المتوافقة مع حجم الإطار والمحركات', partCategory: 'propellers' },
  { id: 'stage-11', number: 11, titleAr: 'اختيار GPS (اختياري)',       descriptionAr: 'أضف وحدة GPS إن احتجت تتبع الموقع أو العودة للمنزل', partCategory: 'gps' },
  { id: 'stage-12', number: 12, titleAr: 'اختيار الـBuzzer',           descriptionAr: 'اختر جرس تحديد موقع الدرون عند السقوط', partCategory: 'buzzers' },
  { id: 'stage-13', number: 13, titleAr: 'اختيار الـCapacitor',        descriptionAr: 'اختر مكثف تنقية الطاقة لحماية القطع الإلكترونية', partCategory: 'capacitors' },
  { id: 'stage-14', number: 14, titleAr: 'تجهيز الأدوات',              descriptionAr: 'جهّز أدوات اللحام والتجميع قبل البدء', partCategory: 'tools' },
  { id: 'stage-15', number: 15, titleAr: 'فحص التوافق النهائي',        descriptionAr: 'تأكد من توافق كل القطع المختارة مع بعضها قبل التجميع', partCategory: null },
  { id: 'stage-16', number: 16, titleAr: 'تركيب الإطار والمحركات',     descriptionAr: 'ثبّت المحركات على أذرع الإطار', partCategory: null },
  { id: 'stage-17', number: 17, titleAr: 'التوصيل واللحام',            descriptionAr: 'وصّل الأسلاك بين ESC وFC والمحركات', partCategory: null },
  { id: 'stage-18', number: 18, titleAr: 'الإعداد البرمجي (Betaflight)', descriptionAr: 'اضبط إعدادات الطيران عبر Betaflight', partCategory: null },
  { id: 'stage-19', number: 19, titleAr: 'الاختبار النهائي وأول طيران', descriptionAr: 'افحص كل القطع وقم بأول اختبار طيران آمن', partCategory: null },
];
