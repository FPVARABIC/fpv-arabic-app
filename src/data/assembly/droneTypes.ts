import type { DroneType } from './types';

// Initial dataset: Freestyle 5-inch only, per Phase 0 scope.
export const droneTypes: DroneType[] = [
  {
    id: 'freestyle-5-inch',
    nameAr: 'فريستايل 5 إنش',
    nameEn: 'Freestyle 5-inch',
    frameSizeInch: 5,
    description: 'أشهر فئة بناء بين طياري الـFPV — توازن بين القوة والتحكم، مناسبة للفريستايل والسباق الخفيف.',
    recommendedBatteryVoltages: [4, 6],
  },
];
