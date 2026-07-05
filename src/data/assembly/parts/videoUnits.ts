// TODO: Ahmed will review specs
import type { VideoUnit } from '../types';

export const videoUnits: VideoUnit[] = [
  {
    id: 'video-unit-budget',
    tier: 'budget',
    nameAr: 'كاميرا FPV - اقتصادية',
    nameEn: 'FPV Camera - Budget',
    priceRangeEGP: [350, 500],
    specs: { sensorType: 'CMOS 1/3"', resolution: '1200TVL', fovDegrees: 150, weightG: 8 },
    compatibilityTags: { droneTypes: ['freestyle-5-inch'], batteryVoltages: [4, 6] },
    beginnerNotes: ['جودة كافية للتعلم والطيران الأساسي'],
    safetyNotes: ['اضبط زاوية الكاميرا جيدًا قبل أول طيران لتفادي فقدان الرؤية'],
    buildNotes: ['متوافقة مع أنظمة الفيديو Analog فقط'],
  },
  {
    id: 'video-unit-mid',
    tier: 'mid',
    nameAr: 'كاميرا FPV - متوسطة',
    nameEn: 'FPV Camera - Mid',
    priceRangeEGP: [700, 950],
    specs: { sensorType: 'CMOS 1/2"', resolution: '1000TVL WDR', fovDegrees: 155, weightG: 9 },
    compatibilityTags: { droneTypes: ['freestyle-5-inch'], batteryVoltages: [4, 6] },
    beginnerNotes: ['نطاق ديناميكي أوسع (WDR) يحسن الرؤية في الإضاءة القوية/الضعيفة'],
    safetyNotes: ['تأكد من توافق الموصل مع نظام الفيديو الرقمي المختار'],
    buildNotes: ['متوافقة مع أنظمة HDZero و Walksnail'],
  },
  {
    id: 'video-unit-premium',
    tier: 'premium',
    nameAr: 'كاميرا FPV - احترافية',
    nameEn: 'FPV Camera - Premium',
    priceRangeEGP: [1400, 1800],
    specs: { sensorType: 'CMOS 1/1.8" Starlight', resolution: '4:3 HD', fovDegrees: 160, weightG: 11 },
    compatibilityTags: { droneTypes: ['freestyle-5-inch'], batteryVoltages: [4, 6] },
    beginnerNotes: ['أفضل أداء في الإضاءة المنخفضة'],
    safetyNotes: ['مصممة خصيصًا لوحدات DJI O3 — تحقق من التوافق قبل الشراء'],
    buildNotes: ['وزن أعلى قليلًا — أدرجه ضمن حسابات التوازن الكلي للدرون'],
  },
];
