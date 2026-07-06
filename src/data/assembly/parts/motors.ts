// TODO: Ahmed will review specs
import type { Motor } from '../types';

export const motors: Motor[] = [
  {
    id: 'motor-2207-budget',
    tier: 'budget',
    nameAr: 'محرك 2207 - اقتصادي',
    nameEn: 'Motor 2207 - Budget',
    priceRangeUSD: [250, 350],
    specs: { kv: 1950, statorSize: '2207', weightG: 32, shaftDiameterMm: 5, maxThrustG: 1450, compatibleVoltages: [4] },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4], frameSizeInch: 5 },
    beginnerNotes: ['KV مناسب لبطارية 4S فقط، لا تستخدمه مع 6S'],
    safetyNotes: ['تحقق من اتجاه دوران المحرك (CW/CCW) قبل التركيب'],
    buildNotes: ['يستخدم شفت 5مم قياسي، متوافق مع أغلب المراوح 5 إنش'],
  },
  {
    id: 'motor-2207-mid',
    tier: 'mid',
    nameAr: 'محرك 2207 - متوسط',
    nameEn: 'Motor 2207 - Mid',
    priceRangeUSD: [400, 550],
    specs: { kv: 1750, statorSize: '2207', weightG: 34, shaftDiameterMm: 5, maxThrustG: 1700, compatibleVoltages: [4, 6] },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6], frameSizeInch: 5 },
    beginnerNotes: ['يدعم فولتيتين (4S و6S) — مرونة أكبر لاحقًا'],
    safetyNotes: ['عند التشغيل على 6S يسخن أكثر — تأكد من التهوية'],
    buildNotes: ['bell أكبر قليلًا يعطي كفاءة أفضل عند دوران منخفض'],
  },
  {
    id: 'motor-2207-premium',
    tier: 'premium',
    nameAr: 'محرك 2207 - احترافي',
    nameEn: 'Motor 2207 - Premium',
    priceRangeUSD: [650, 900],
    specs: { kv: 1700, statorSize: '2207', weightG: 36, shaftDiameterMm: 5, maxThrustG: 1950, compatibleVoltages: [6] },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [6], frameSizeInch: 5 },
    beginnerNotes: ['مصمم خصيصًا لـ6S فقط — لا يعمل بكفاءة على 4S'],
    safetyNotes: ['قوة دفع عالية — ابدأ بحساسية تحكم منخفضة أول مرة'],
    buildNotes: ['يحتاج ESC بتصنيف تيار أعلى نظرًا لقوة الدفع الكبيرة'],
  },
];
