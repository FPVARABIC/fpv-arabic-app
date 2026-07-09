import type { DroneType } from './types';

// TODO: Ahmed will review specs
export const droneTypes: DroneType[] = [
  {
    id: 'freestyle',
    primaryName: 'Freestyle',
    nameEn: 'Freestyle 5-inch',
    frameSizeInch: 5,
    description: 'أشهر فئة بناء بين طياري الـFPV — توازن بين القوة والتحكم، مناسبة لـFreestyle والسباق الخفيف.',
    recommendedBatteryVoltages: [4, 6],
    imagePath: '/assets/assembly/drone-types/freestyle.png',
  },
  {
    id: 'cinematic',
    primaryName: 'Cinematic',
    nameEn: 'Cinematic',
    frameSizeInch: 5,
    description: 'بناء مخصص للتصوير الناعم، يركّز على الاستقرار وحمل كاميرا أثقل بدلاً من السرعة أو المناورات الحادة.',
    recommendedBatteryVoltages: [4, 6],
    imagePath: '/assets/assembly/drone-types/cinematic.png',
  },
  {
    id: 'long-range',
    primaryName: 'مدى طويل',
    nameAr: 'مدى طويل',
    frameSizeInch: 7,
    description: 'بناء موجّه للرحلات الطويلة والمسافات البعيدة، يعتمد على كفاءة الطاقة وأنظمة اتصال قوية بدلاً من الأداء الحاد.',
    recommendedBatteryVoltages: [6],
    imagePath: '/assets/assembly/drone-types/long-range.png',
  },
  {
    id: 'cinewhoop',
    primaryName: 'Cinewhoop',
    nameEn: 'Cinewhoop',
    frameSizeInch: 3,
    description: 'درون صغير محاط بحلقات حماية حول المراوح، مناسب للتصوير القريب في أماكن ضيقة أو حول أشخاص وأشياء بأمان أكبر.',
    recommendedBatteryVoltages: [2], // TODO: Ahmed will review
    imagePath: '/assets/assembly/drone-types/cinewhoop.png',
  },
  {
    id: 'racing',
    primaryName: 'سباقات',
    nameAr: 'سباقات',
    frameSizeInch: 5,
    description: 'بناء مخصص لسباقات الأداء العالي، يركّز على السرعة والاستجابة السريعة أكثر من حمل الكاميرا أو الاستقرار.',
    recommendedBatteryVoltages: [4, 6],
    imagePath: '/assets/assembly/drone-types/racing.png',
  },
];
