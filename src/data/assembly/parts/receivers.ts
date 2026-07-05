// TODO: Ahmed will review specs
import type { Receiver } from '../types';

export const receivers: Receiver[] = [
  {
    id: 'receiver-elrs-budget',
    tier: 'budget',
    nameAr: 'ريسيفر ELRS - اقتصادي',
    nameEn: 'ELRS Receiver - Budget',
    priceRangeEGP: [250, 350],
    specs: { protocol: 'ExpressLRS', frequencyGHz: 2.4, weightG: 1.2, hasTelemetry: true },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['بروتوكول مفتوح المصدر ومنتشر بقوة، دعم مجتمعي كبير'],
    safetyNotes: ['تأكد من مطابقة إصدار الفيرموير بين الريموت والريسيفر'],
    buildNotes: ['هوائي صغير يسهل تركيبه داخل الإطار'],
  },
  {
    id: 'receiver-elrs-mid',
    tier: 'mid',
    nameAr: 'ريسيفر ELRS - متوسط',
    nameEn: 'ELRS Receiver - Mid',
    priceRangeEGP: [400, 550],
    specs: { protocol: 'ExpressLRS', frequencyGHz: 2.4, weightG: 1.5, hasTelemetry: true },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['مدى إشارة أفضل عن الفئة الاقتصادية'],
    safetyNotes: ['اختبر المدى في مكان مفتوح قبل الاعتماد عليه بعيدًا'],
    buildNotes: ['يدعم وضعي تشغيل (dual antenna) لتحسين الاستقبال'],
  },
  {
    id: 'receiver-elrs-premium',
    tier: 'premium',
    nameAr: 'ريسيفر ELRS - احترافي',
    nameEn: 'ELRS Receiver - Premium',
    priceRangeEGP: [600, 850],
    specs: { protocol: 'ExpressLRS', frequencyGHz: 2.4, weightG: 1.8, hasTelemetry: true },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['مخصص للمدى الطويل والأداء التنافسي'],
    safetyNotes: ['طاقة إرسال أعلى تتطلب الالتزام بلوائح ترددات بلدك'],
    buildNotes: ['يدعم معدل تحديث أعلى لتقليل التأخير (latency)'],
  },
];
