/**
 * Propellers — the third fully-authored KB module.
 *
 * WHY IT IS A MODULE AND NOT A SECTION OF `motors`
 * ------------------------------------------------
 * The propeller is where almost every "my build behaves badly" story actually
 * begins: it is the load that sets current draw, the rotating mass that sets
 * vibration, the part that decides whether the aircraft flips on takeoff, and
 * the only component on the aircraft that can injure a person. Folding that into
 * a subsection of the motors module would bury it under a component that merely
 * *responds* to it.
 *
 * `requiredCoverage` omits three of the 28 axes, and the module page shows the
 * omission openly rather than padding the matrix:
 *   protocols    — a propeller speaks no protocol; the ESC does
 *   wiring       — a propeller has no electrical connection at all
 *   updatability — propellers carry no firmware
 *
 * `configuration` IS declared, and deliberately so: propeller direction is
 * inseparable from motor-direction and mixer settings, and the reversed-motor
 * ("props out") option changes which physical propeller belongs on every arm.
 * That is a software corner the reader genuinely has to visit, and it lives in
 * `prop-installation`.
 */

import type { KbModule } from '../../types';

import { propWhatIs, propAnatomy } from './articles/fundamentals';
import { propSizing, propPitch, propBladeCount } from './articles/geometry';
import { propMaterials, propSelection } from './articles/selection';
import { propInstallation, propBalance } from './articles/practice';
import { propDamageSafety } from './articles/safety';

export const propellersModule: KbModule = {
  id: 'propellers',
  titleAr: 'المراوح',
  titleEn: 'Propellers',
  domain: 'propellers',
  icon: 'Wind',
  summaryAr:
    'القطعة التي تحوّل دوران المحرك إلى دفع حقيقي، وأكثر قطعة تؤثر في الحرارة وزمن الطيران والإحساس بالتحكم. عشرة مقالات تغطي كيف تصنع المروحة الدفع، وتشريحها، وقراءة ترميزها، والميل وعدد الشفرات والمواد، والاختيار والتركيب والاتزان والسلامة.',
  levels: ['zero', 'beginner', 'basic', 'intermediate', 'advanced'],
  lastReviewed: '2026-08',
  requiredCoverage: [
    'definition', 'principle', 'components', 'types', 'comparison', 'compatibility',
    'power', 'installation', 'configuration', 'testing', 'performance', 'safety',
    'failures', 'diagnostics', 'maintenance', 'applications',
    'beginner', 'intermediate', 'advanced', 'pro', 'terminology', 'sources',
    'internalLinks', 'search', 'assessment',
  ],
  articles: [
    propWhatIs,
    propAnatomy,
    propSizing,
    propPitch,
    propBladeCount,
    propMaterials,
    propSelection,
    propInstallation,
    propBalance,
    propDamageSafety,
  ],
  paths: [
    {
      id: 'prop-path-beginner',
      titleAr: 'من الصفر: افهم المروحة قبل أن تلمسها',
      audienceAr: 'لم تركّب مروحة من قبل، أو ركّبتها بلا أن تعرف لماذا هناك نوعان منها.',
      level: 'beginner',
      articleIds: ['prop-what-is', 'prop-anatomy', 'prop-installation', 'prop-damage-safety'],
      outcomeAr: 'تستطيع تمييز نوعَي المراوح، وتركيبها في الاتجاه الصحيح بالشدّ الصحيح، وفحصها فحصاً يمنع الحوادث.',
    },
    {
      id: 'prop-path-choose',
      titleAr: 'مسار الشراء: أي مروحة تناسب مشروعي؟',
      audienceAr: 'تبني الآن أو تريد تغيير مراوحك وتحتاج قراراً صحيحاً قبل الدفع.',
      level: 'basic',
      articleIds: ['prop-sizing', 'prop-pitch', 'prop-blade-count', 'prop-materials', 'prop-selection'],
      outcomeAr: 'تستطيع قراءة أي مواصفة مروحة، وترتيب قيود مشروعك، واختيار مقاس وميل وعدد شفرات ومادة بلا تخمين.',
    },
    {
      id: 'prop-path-deep',
      titleAr: 'الفهم العميق: لماذا تغيّر المروحة كل شيء',
      audienceAr: 'تطير بالفعل وتريد فهم أثر المروحة في الحرارة والاستهلاك والإحساس بالتحكم.',
      level: 'advanced',
      articleIds: ['prop-what-is', 'prop-pitch', 'prop-blade-count', 'prop-balance'],
      outcomeAr: 'تستطيع تفسير أثر أي تغيير في المروحة على التيار والحرارة وزمن الطيران، وتتبّع سلسلة الاهتزاز حتى مصدرها.',
    },
    {
      id: 'prop-path-fix',
      titleAr: 'مسار العطل: اهتزاز أو انقلاب أو مروحة انفصلت',
      audienceAr: 'لديك مشكلة الآن وتشك أن مصدرها المراوح.',
      level: 'intermediate',
      articleIds: ['prop-damage-safety', 'prop-balance', 'prop-installation', 'prop-anatomy'],
      outcomeAr: 'تستطيع عزل المروحة عن المحمل عن الهيكل، وتقرر بثقة: استبدل، أو أعد الشدّ، أو ابحث في مكان آخر.',
    },
  ],
};
