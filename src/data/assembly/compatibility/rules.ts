// Compatibility engine — declarative rules describing which part categories
// must agree with each other before a build is considered valid.

export type CompatibilityRuleId =
  | 'frame-motor-size'
  | 'motor-battery-voltage'
  | 'esc-battery-voltage'
  | 'frame-propeller-size'
  | 'video-system-video-unit';

export interface CompatibilityRule {
  id: CompatibilityRuleId;
  descriptionAr: string;
  categoriesInvolved: string[];
}

// TODO: Ahmed will review specs
export const compatibilityRules: CompatibilityRule[] = [
  {
    id: 'frame-motor-size',
    descriptionAr: 'يجب أن يتوافق حجم الإطار مع أذرع المحركات المختارة',
    categoriesInvolved: ['frames', 'motors'],
  },
  {
    id: 'motor-battery-voltage',
    descriptionAr: 'يجب أن تدعم المحركات فولتية البطارية المختارة',
    categoriesInvolved: ['motors', 'batteries'],
  },
  {
    id: 'esc-battery-voltage',
    descriptionAr: 'يجب أن يتحمل الـESC فولتية البطارية المختارة',
    categoriesInvolved: ['escs', 'batteries'],
  },
  {
    id: 'frame-propeller-size',
    descriptionAr: 'يجب أن تتناسب مقاسات المراوح مع حجم الإطار',
    categoriesInvolved: ['frames', 'propellers'],
  },
  {
    id: 'video-system-video-unit',
    descriptionAr: 'يجب أن تتوافق الكاميرا مع نوع نظام الفيديو (analog/digital)',
    categoriesInvolved: ['videoSystems', 'videoUnits'],
  },
];
