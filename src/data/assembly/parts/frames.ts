// TODO: Ahmed will review specs
import type { Frame } from '../types';

export const frames: Frame[] = [
  {
    id: 'frame-freestyle5-budget',
    tier: 'budget',
    nameAr: 'إطار فريستايل 5 إنش - اقتصادي',
    nameEn: 'Freestyle 5" Frame - Budget',
    priceRangeEGP: [600, 900],
    specs: { sizeInch: 5, wheelbaseMm: 220, armThicknessMm: 4, material: 'فايبر كربون 3K', weightG: 95 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['إطار بسيط وسهل الإصلاح، مناسب لأول بناء'],
    safetyNotes: ['تأكد من ربط جميع البراغي جيدًا قبل أول طيران'],
    buildNotes: ['سمك الذراع 4مم يتحمل الاصطدامات الخفيفة أثناء التعلم'],
  },
  {
    id: 'frame-freestyle5-mid',
    tier: 'mid',
    nameAr: 'إطار فريستايل 5 إنش - متوسط',
    nameEn: 'Freestyle 5" Frame - Mid',
    priceRangeEGP: [1000, 1500],
    specs: { sizeInch: 5, wheelbaseMm: 225, armThicknessMm: 5, material: 'فايبر كربون T700', weightG: 105 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['توازن جيد بين الوزن والمتانة'],
    safetyNotes: ['افحص الأذرع بعد أي سقوط قوي قبل إعادة الطيران'],
    buildNotes: ['يدعم تركيب Stack بحجم 30.5×30.5 و20×20'],
  },
  {
    id: 'frame-freestyle5-premium',
    tier: 'premium',
    nameAr: 'إطار فريستايل 5 إنش - احترافي',
    nameEn: 'Freestyle 5" Frame - Premium',
    priceRangeEGP: [1800, 2600],
    specs: { sizeInch: 5, wheelbaseMm: 230, armThicknessMm: 6, material: 'فايبر كربون T1000', weightG: 118 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['مخصص للطيارين المتقدمين الذين يحتاجون متانة قصوى'],
    safetyNotes: ['وزن أعلى قليلًا — تأكد من قوة المحركات المختارة'],
    buildNotes: ['تصميم unibody يقلل نقاط الفشل عند التجميع'],
  },
];
