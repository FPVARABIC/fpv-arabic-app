// TODO: Ahmed will review specs
import type { Capacitor } from '../types';

export const capacitors: Capacitor[] = [
  {
    id: 'capacitor-budget',
    tier: 'budget',
    nameAr: 'كاباستور - اقتصادي',
    nameEn: 'Capacitor - Budget',
    priceRangeEGP: [30, 50],
    specs: { capacitanceUf: 470, voltageRating: 25, weightG: 8 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4] },
    beginnerNotes: ['يحمي القطع الإلكترونية من تشويش الطاقة (voltage spikes)'],
    safetyNotes: ['لا تستخدمه مع بطارية 6S — تصنيف الجهد لا يكفي'],
    buildNotes: ['يُلحم مباشرة على أطراف الطاقة (+/-) قرب مدخل الـESC'],
  },
  {
    id: 'capacitor-mid',
    tier: 'mid',
    nameAr: 'كاباستور - متوسط',
    nameEn: 'Capacitor - Mid',
    priceRangeEGP: [55, 80],
    specs: { capacitanceUf: 680, voltageRating: 35, weightG: 10 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['يدعم فولتيتين (4S/6S) — خيار مرن'],
    safetyNotes: ['تحقق من القطبية الصحيحة قبل اللحام لتفادي تلف الدائرة'],
    buildNotes: ['سعة أعلى تقلل تشويش VTX الناتج عن حمل المحركات'],
  },
  {
    id: 'capacitor-premium',
    tier: 'premium',
    nameAr: 'كاباستور - احترافي',
    nameEn: 'Capacitor - Premium',
    priceRangeEGP: [90, 130],
    specs: { capacitanceUf: 1000, voltageRating: 50, weightG: 13 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [6] },
    beginnerNotes: ['مخصص للبناء 6S عالي التيار'],
    safetyNotes: ['وزنه أعلى — ثبّته جيدًا لتفادي انفصاله أثناء الاصطدامات'],
    buildNotes: ['يقلل تداخل الفيديو بشكل ملحوظ في أنظمة Digital VTX عالية الطاقة'],
  },
];
