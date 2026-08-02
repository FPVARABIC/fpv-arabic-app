/**
 * The single next action.
 *
 * The mechanic borrowed here — and rebuilt for this domain rather than copied —
 * is that a good platform never returns the user to a menu. It knows where they
 * are and says one thing. Choice is the cost; removing it is the product.
 *
 * The ordering below is a safety ordering, not a convenience one: an unresolved
 * blocker outranks progress, because continuing to buy parts on top of a
 * voltage mismatch compounds the mistake instead of surfacing it.
 */

import { buildStages } from '../assembly/buildStages';
import type { ProjectSnapshot, Finding, NextStep } from './types';

export function computeNextStep(p: ProjectSnapshot, findings: Finding[]): NextStep {
  // 1. Nothing started — the only meaningful action is to start.
  if (!p.exists) {
    return {
      titleAr: 'ابدأ مشروعك الأول',
      reasonAr: 'كل ما في المنصة يصبح أدقّ حين تعرف قطعك: التحذيرات تصير عن عتادك أنت، والمقالات تُبرز ما يخصّه، والتشخيص يبدأ من طائرتك لا من طائرة عامة.',
      route: '/assembly',
      ctaAr: 'ابدأ الآن',
      isBlocked: false,
    };
  }

  // 2. A blocker outranks everything. Building further on top of it is worse
  //    than pausing, because every later choice inherits the same wrong premise.
  const blocker = findings.find(x => x.severity === 'blocker');
  if (blocker) {
    return {
      titleAr: 'عالج المانع قبل أن تكمل',
      reasonAr: blocker.claimAr,
      route: '/assembly',
      ctaAr: 'راجع اختيارك',
      isBlocked: true,
    };
  }

  // 3. Still choosing parts — point at the stage they actually stopped on.
  const stage = buildStages[p.stageIndex];
  if (stage && p.stageIndex < buildStages.length - 1) {
    return {
      titleAr: stage.titleAr,
      reasonAr: `أنت في المرحلة ${p.stageIndex + 1} من ${buildStages.length}. ${stage.descriptionAr}`,
      route: '/assembly',
      ctaAr: 'أكمل من حيث توقفت',
      isBlocked: false,
    };
  }

  // 4. Parts are settled but data is missing — the honest next action is to go
  //    get the number we refused to invent, not to declare the build sound.
  const unknown = findings.find(x => x.severity === 'unknown');
  if (unknown) {
    return {
      titleAr: 'أكمل البيانات الناقصة قبل أول تشغيل',
      reasonAr: unknown.claimAr,
      route: '/project',
      ctaAr: 'اعرف ما ينقص',
      isBlocked: false,
    };
  }

  // 5. Everything we can check is checked — the next real risk is the first
  //    power-up, so that is where we send them.
  return {
    titleAr: 'انتقل إلى فحص ما قبل التشغيل الأول',
    reasonAr: 'اختياراتك اجتازت كل ما نستطيع فحصه. الخطر التالي ليس في القطع بل في أول توصيل للبطارية: فحص القصر، وواقي التيار، والمراوح منزوعة.',
    route: '/checklists',
    ctaAr: 'افتح قائمة الفحص',
    isBlocked: false,
  };
}
