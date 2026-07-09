// Compatibility engine — declarative rules describing which part categories
// must agree with each other before a build is considered valid.

export type CompatibilityRuleId =
  | 'frame-motor-size'
  | 'motor-battery-voltage'
  | 'esc-battery-voltage'
  | 'frame-propeller-size';

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
    descriptionAr: 'يجب أن يتوافق KV المحرك مع عدد خلايا البطارية (4S/6S)؛ KV مرتفع جداً مع 6S يرفع التيار والحرارة، وKV منخفض جداً مع 4S يعطي أداء ضعيفاً — نفس حجم الفريم لا يعني نفس اختيار البطارية أو نفس KV.',
    categoriesInvolved: ['motors', 'batteries'],
  },
  {
    id: 'esc-battery-voltage',
    descriptionAr: 'يجب أن يتحمل الـESC فولتية البطارية المختارة',
    categoriesInvolved: ['escs', 'batteries'],
  },
  {
    id: 'frame-propeller-size',
    descriptionAr: 'لا تركب مروحة أكبر من المقاس الذي يدعمه الفريم صراحة؛ الخلوص قد يختفي أثناء الاهتزاز أو التصادم، والمقاس القريب (مثل 5.5 إنش على فريم 5 إنش عادي) لا يكفي دون دعم فريم صريح لذلك المقاس تحديداً.',
    categoriesInvolved: ['frames', 'propellers'],
  },
  // The 'video-system-video-unit' rule was removed with the video-stage
  // merge: there is no separate videoSystems selection to cross-check
  // anymore. Its goggles-must-match-system guidance moved into the merged
  // stage-3's descriptionAr in buildStages.ts.
];
