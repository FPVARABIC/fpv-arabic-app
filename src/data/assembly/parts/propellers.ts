// TODO: Ahmed will review specs
import type { Propeller } from '../types';

export const propellers: Propeller[] = [
  {
    id: 'propeller-5in-budget',
    tier: 'budget',
    nameAr: 'مروحة 5 إنش - اقتصادية',
    nameEn: '5" Propeller - Budget',
    priceRangeUSD: [80, 120],
    specs: { sizeInch: 5, pitchInch: 4.3, bladeCount: 3, material: 'بولي كربونات' },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6], frameSizeInch: 5 },
    beginnerNotes: ['مادة مرنة تتحمل الاصطدامات أثناء التعلم دون كسر فوري'],
    safetyNotes: ['افحص كل مروحة قبل الطيران — أي شرخ صغير يزيد الاهتزاز'],
    buildNotes: ['وازن كل طقم مراوح قبل التركيب لتقليل الاهتزاز'],
  },
  {
    id: 'propeller-5in-mid',
    tier: 'mid',
    nameAr: 'مروحة 5 إنش - متوسطة',
    nameEn: '5" Propeller - Mid',
    priceRangeUSD: [140, 200],
    specs: { sizeInch: 5, pitchInch: 4.5, bladeCount: 3, material: 'فايبر كربون مقوى' },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6], frameSizeInch: 5 },
    beginnerNotes: ['صلابة أعلى تعطي استجابة أدق في الفريستايل'],
    safetyNotes: ['حادة الأطراف أكثر من البلاستيك — احذر عند اللمس والتخزين'],
    buildNotes: ['كفاءة أفضل عند سرعات دوران متوسطة إلى عالية'],
  },
  {
    id: 'propeller-5in-premium',
    tier: 'premium',
    nameAr: 'مروحة 5 إنش - احترافية',
    nameEn: '5" Propeller - Premium',
    priceRangeUSD: [220, 300],
    specs: { sizeInch: 5, pitchInch: 4.8, bladeCount: 3, material: 'فايبر كربون كامل' },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [6], frameSizeInch: 5 },
    beginnerNotes: ['مخصصة لبناء 6S عالي الأداء'],
    safetyNotes: ['صلبة جدًا — تسبب ضررًا أكبر عند الاصطدام، حافظ على مسافة أمان'],
    buildNotes: ['تتطلب موازنة دقيقة لتفادي اهتزاز عالي التردد'],
  },
];
