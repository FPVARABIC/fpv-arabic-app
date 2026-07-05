// TODO: Ahmed will review specs
import type { Gps } from '../types';

export const gps: Gps[] = [
  {
    id: 'gps-budget',
    tier: 'budget',
    nameAr: 'وحدة GPS - اقتصادية',
    nameEn: 'GPS Module - Budget',
    priceRangeEGP: [200, 300],
    specs: { chipset: 'M8N', hasCompass: false, weightG: 6 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['كافية لتفعيل ميزة GPS Rescue الأساسية في Betaflight'],
    safetyNotes: ['اختبر GPS Rescue في مكان مفتوح وبارتفاع آمن قبل الاعتماد عليه'],
    buildNotes: ['ركّبها بعيدًا عن أسلاك VTX لتقليل التداخل'],
  },
  {
    id: 'gps-mid',
    tier: 'mid',
    nameAr: 'وحدة GPS - متوسطة',
    nameEn: 'GPS Module - Mid',
    priceRangeEGP: [350, 450],
    specs: { chipset: 'M10Q', hasCompass: true, weightG: 7 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['بوصلة مدمجة تحسّن دقة العودة للمنزل'],
    safetyNotes: ['عاير البوصلة (compass calibration) بعيدًا عن أي معدن أو مغناطيس'],
    buildNotes: ['دقة تموضع أعلى وزمن قفل إشارة أسرع من M8N'],
  },
  {
    id: 'gps-premium',
    tier: 'premium',
    nameAr: 'وحدة GPS - احترافية',
    nameEn: 'GPS Module - Premium',
    priceRangeEGP: [500, 650],
    specs: { chipset: 'M10Q + مضاد للتشويش', hasCompass: true, weightG: 8 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['مناسبة للطيران بعيد المدى حيث الدقة أهم'],
    safetyNotes: ['حتى مع دقة أعلى، لا تعتمد على GPS Rescue كبديل كامل عن مهارة التحكم اليدوي'],
    buildNotes: ['تصفية إشارة أفضل في بيئات بها تداخل كهرومغناطيسي عالٍ'],
  },
];
