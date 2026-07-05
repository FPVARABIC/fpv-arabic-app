// TODO: Ahmed will review specs
import type { Esc } from '../types';

export const escs: Esc[] = [
  {
    id: 'esc-4in1-budget',
    tier: 'budget',
    nameAr: 'ESC رباعي 45A - اقتصادي',
    nameEn: '4-in-1 ESC 45A - Budget',
    priceRangeEGP: [700, 1000],
    specs: { currentRatingA: 45, firmware: 'BLHeli_S', channels: 4, weightG: 12, compatibleVoltages: [4] },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4] },
    beginnerNotes: ['خيار جيد للتعلم بميزانية محدودة'],
    safetyNotes: ['لا تستخدمه مع بطارية 6S — يتجاوز الحد الأقصى للفولتية'],
    buildNotes: ['يدعم DShot300 فقط، كافٍ لمعظم إعدادات المبتدئين'],
  },
  {
    id: 'esc-4in1-mid',
    tier: 'mid',
    nameAr: 'ESC رباعي 55A - متوسط',
    nameEn: '4-in-1 ESC 55A - Mid',
    priceRangeEGP: [1100, 1500],
    specs: { currentRatingA: 55, firmware: 'BLHeli_32', channels: 4, weightG: 13, compatibleVoltages: [4, 6] },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['يدعم فولتيتين، خيار مرن للترقية لاحقًا'],
    safetyNotes: ['تأكد من تحديث الفيرموير قبل أول استخدام'],
    buildNotes: ['يدعم DShot600 وتيليمتري تيار كل محرك'],
  },
  {
    id: 'esc-4in1-premium',
    tier: 'premium',
    nameAr: 'ESC رباعي 65A - احترافي',
    nameEn: '4-in-1 ESC 65A - Premium',
    priceRangeEGP: [1700, 2300],
    specs: { currentRatingA: 65, firmware: 'BLHeli_32', channels: 4, weightG: 15, compatibleVoltages: [6] },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [6] },
    beginnerNotes: ['مخصص لبناء 6S عالي الأداء فقط'],
    safetyNotes: ['تيار مرتفع — تحقق من جودة اللحام على كل مخرج'],
    buildNotes: ['مكثفات منخفضة ESR مدمجة تقلل الحاجة لكاباستور خارجي كبير'],
  },
];
