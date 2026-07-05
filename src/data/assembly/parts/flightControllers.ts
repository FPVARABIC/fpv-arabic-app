// TODO: Ahmed will review specs
import type { FlightController } from '../types';

export const flightControllers: FlightController[] = [
  {
    id: 'fc-f405-budget',
    tier: 'budget',
    nameAr: 'Flight Controller F405 - اقتصادي',
    nameEn: 'F405 Flight Controller - Budget',
    priceRangeEGP: [500, 750],
    specs: { mcu: 'STM32F405', gyro: 'MPU6000', mountingSizeMm: 30.5, uartCount: 4, hasBuiltInOsd: true },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['خيار موثوق ومنتشر، يدعم كل الميزات الأساسية لـBetaflight'],
    safetyNotes: ['تأكد أن جهد الدخل يدعم فولتية بطاريتك قبل التوصيل'],
    buildNotes: ['قياس تركيب 30.5×30.5 قياسي مع أغلب الإطارات'],
  },
  {
    id: 'fc-f722-mid',
    tier: 'mid',
    nameAr: 'Flight Controller F722 - متوسط',
    nameEn: 'F722 Flight Controller - Mid',
    priceRangeEGP: [900, 1300],
    specs: { mcu: 'STM32F722', gyro: 'ICM42688', mountingSizeMm: 30.5, uartCount: 6, hasBuiltInOsd: true },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['جيروسكوب أدق يعطي طيران أكثر ثباتًا'],
    safetyNotes: ['منافذ UART أكثر — رتب الأسلاك جيدًا لتفادي الأخطاء بالتوصيل'],
    buildNotes: ['يدعم Blackbox بذاكرة أونبورد أكبر'],
  },
  {
    id: 'fc-h743-premium',
    tier: 'premium',
    nameAr: 'Flight Controller H743 - احترافي',
    nameEn: 'H743 Flight Controller - Premium',
    priceRangeEGP: [1600, 2200],
    specs: { mcu: 'STM32H743', gyro: 'ICM42688 (dual)', mountingSizeMm: 30.5, uartCount: 8, hasBuiltInOsd: true },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: ['أداء معالجة عالٍ، غالبًا أكثر مما يحتاجه المبتدئ'],
    safetyNotes: ['تحقق من توافق إصدار Betaflight مع هذه اللوحة قبل الفلاش'],
    buildNotes: ['معالج قوي يدعم فلاتر متقدمة لتقليل الاهتزاز'],
  },
];
