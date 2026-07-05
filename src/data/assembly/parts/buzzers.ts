// TODO: Ahmed will review specs
import type { Buzzer } from '../types';

export const buzzers: Buzzer[] = [
  {
    id: 'buzzer-budget',
    tier: 'budget',
    nameAr: 'جرس تحديد الموقع - اقتصادي',
    nameEn: 'Finder Buzzer - Budget',
    priceRangeEGP: [40, 70],
    specs: { hasBuiltInBattery: false, volumeDb: 100, weightG: 3 },
    compatibilityTags: { droneTypes: ['freestyle-5-inch'], batteryVoltages: [4, 6] },
    beginnerNotes: ['يعمل فقط طالما البطارية الرئيسية موصولة'],
    safetyNotes: ['لن يصدر صوتًا إذا انفصلت البطارية الرئيسية عن الدرون بعد السقوط'],
    buildNotes: ['يتصل مباشرة بمخرج buzzer على الـFC'],
  },
  {
    id: 'buzzer-mid',
    tier: 'mid',
    nameAr: 'جرس تحديد الموقع - متوسط',
    nameEn: 'Finder Buzzer - Mid',
    priceRangeEGP: [90, 130],
    specs: { hasBuiltInBattery: true, volumeDb: 110, weightG: 5 },
    compatibilityTags: { droneTypes: ['freestyle-5-inch'], batteryVoltages: [4, 6] },
    beginnerNotes: ['بطارية احتياطية صغيرة تجعله يعمل حتى بعد انفصال البطارية الرئيسية'],
    safetyNotes: ['اشحن البطارية الاحتياطية بشكل دوري لتتأكد من عملها عند الحاجة'],
    buildNotes: ['وزن أعلى قليلًا بسبب البطارية المدمجة'],
  },
  {
    id: 'buzzer-premium',
    tier: 'premium',
    nameAr: 'جرس تحديد الموقع - احترافي',
    nameEn: 'Finder Buzzer - Premium',
    priceRangeEGP: [150, 200],
    specs: { hasBuiltInBattery: true, volumeDb: 120, weightG: 6 },
    compatibilityTags: { droneTypes: ['freestyle-5-inch'], batteryVoltages: [4, 6] },
    beginnerNotes: ['أعلى شدة صوت — مفيد جدًا في العشب الكثيف أو الغابات'],
    safetyNotes: ['صوت قوي جدًا عن قرب — احذر عند الاختبار في مساحة مغلقة صغيرة'],
    buildNotes: ['يدعم تفعيل تلقائي عبر Betaflight عند فقدان الإشارة'],
  },
];
