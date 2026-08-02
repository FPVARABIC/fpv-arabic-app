/**
 * Motors — the second fully-authored KB module.
 *
 * Scoped deliberately as a COMPONENT module that keeps pointing at its system:
 * a motor cannot be understood, chosen, or diagnosed without the propeller that
 * loads it and the ESC that drives it, so `motor-esc-relation` exists as its own
 * article rather than being a paragraph inside the selection guide.
 *
 * `requiredCoverage` omits four axes that genuinely do not apply here, and the
 * module page renders that omission openly rather than padding the matrix:
 *   protocols  — a motor speaks no protocol; the ESC does (see the ESC module)
 *   wiring     — three interchangeable power leads, covered under installation
 *   updatability — motors carry no firmware
 * The `pro` axis IS declared: the sizing, KV and motor/ESC articles carry real
 * lookup-only reference tables a working builder uses without reading the prose.
 */

import type { KbModule } from '../../types';

import { motorWhatIs, motorAnatomy } from './articles/fundamentals';
import { motorSizing, motorKv } from './articles/selection';
import { motorEscRelation, motorSelection, motorInstallation } from './articles/practice';
import { motorTesting, motorFailures, motorMaintenance } from './articles/care';

export const motorsModule: KbModule = {
  id: 'motors',
  titleAr: 'المحركات',
  titleEn: 'Motors',
  domain: 'motors',
  icon: 'Fan',
  summaryAr:
    'مصدر الدفع كله. عشرة مقالات تغطي كيف يدور المحرك، وتشريحه، وقراءة ترميزه وثابت KV، وعلاقته بالـESC والمروحة، واختياره وتركيبه واختباره وأعطاله وصيانته.',
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
    motorWhatIs,
    motorAnatomy,
    motorSizing,
    motorKv,
    motorEscRelation,
    motorSelection,
    motorInstallation,
    motorTesting,
    motorFailures,
    motorMaintenance,
  ],
  paths: [
    {
      id: 'motor-path-beginner',
      titleAr: 'من الصفر: ما هذا الشيء الذي يدور؟',
      audienceAr: 'لم تتعامل مع محرك بلا فرش من قبل وتريد فهمه قبل شراء أي شيء.',
      level: 'beginner',
      articleIds: ['motor-what-is', 'motor-anatomy', 'motor-installation', 'motor-failures'],
      outcomeAr: 'تستطيع شرح كيف يدور المحرك، وتركيبه بشكل صحيح، وتجنّب الأخطاء التي تقتله.',
    },
    {
      id: 'motor-path-choose',
      titleAr: 'مسار الشراء: أي محرك يناسب مشروعي؟',
      audienceAr: 'تبني طائرة الآن وتحتاج قراراً صحيحاً قبل الدفع.',
      level: 'basic',
      articleIds: ['motor-sizing', 'motor-kv', 'motor-esc-relation', 'motor-selection'],
      outcomeAr: 'تستطيع قراءة أي مواصفة محرك، وحساب ما يحتاجه مشروعك، واكتشاف تعارض التوافق قبل الشراء.',
    },
    {
      id: 'motor-path-deep',
      titleAr: 'الفهم العميق: لماذا يسخن ولماذا يفقد الدفع',
      audienceAr: 'تطير بالفعل وتريد فهم ما يحدث داخل المحرك وفي علاقته بالمنظومة.',
      level: 'advanced',
      articleIds: ['motor-what-is', 'motor-kv', 'motor-esc-relation', 'motor-anatomy', 'motor-testing'],
      outcomeAr: 'تستطيع تفسير الحرارة والاستهلاك وفقد الدفع، وربط كل عرَض بضلعه في مثلث المحرك والمروحة والـESC.',
    },
    {
      id: 'motor-path-fix',
      titleAr: 'مسار العطل: محرك يسخن أو لا يدور',
      audienceAr: 'لديك مشكلة الآن في محرك محدد وتريد عزل السبب.',
      level: 'intermediate',
      articleIds: ['motor-testing', 'motor-anatomy', 'motor-failures', 'motor-maintenance'],
      outcomeAr: 'تستطيع عزل العطل بين المحرك والـESC والمروحة، وتقرر بثقة: نظّف، أو استبدل محملاً، أو استبدل المحرك.',
    },
  ],
};
