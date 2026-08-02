/**
 * The master domain inventory — "المصفوفة الرئيسية الشاملة".
 *
 * WHAT PROBLEM THIS SOLVES
 * ------------------------
 * A platform this size forgets things silently. A component gets a lesson but
 * never appears in the build section; a part appears in the build section but
 * has no setup steps; a setting is explained with no link back to the hardware
 * it controls. Nothing breaks, no test fails, and the gap is invisible until a
 * user hits it.
 *
 * This file is the inventory that makes those gaps visible. It declares EVERY
 * system and component the platform intends to cover — including the ones not
 * written yet — and `domainMatrixStatus()` derives each element's real state by
 * inspecting the actual data, not by reading a hand-maintained checkbox.
 *
 * THE CRITICAL DESIGN RULE
 * ------------------------
 * Nothing in this file may claim coverage. Every status flag is COMPUTED:
 *   hasModule      ← does a KB module exist for this element?
 *   hasBuild       ← does the assembly section actually offer this part category?
 *   hasSoftware    ← is there a software entry or Betaflight page that configures it?
 *   hasDiagnostics ← does a diagnostic tree own it?
 *   hasGlossary    ← do glossary terms carry its domain?
 *   hasSearch      ← does the search index contain documents for it?
 *
 * A hand-written "yes" would be exactly the fake progress the product spec
 * forbids ("ولا يجوز إخفاؤه خلف تصميم أو نسبة تقدم غير حقيقية").
 */

import { allKbModules } from './registry';
import { kbTerms } from './glossary/terms';
import { allDxTrees } from './diagnostics/trees';
import { buildStages } from '../assembly/buildStages';
import { bfPageRegistry } from '../betaflight/pageRegistry';

/** Top-level area of the domain, used for grouping in the UI. */
export type DomainArea =
  | 'principles'
  | 'propulsion'
  | 'electrical'
  | 'control'
  | 'video'
  | 'navigation'
  | 'structure'
  | 'assembly'
  | 'software'
  | 'operations';

export const DOMAIN_AREA_LABEL_AR: Record<DomainArea, string> = {
  principles: 'مبادئ الطيران والفيزياء',
  propulsion: 'منظومة الدفع',
  electrical: 'الكهرباء والطاقة',
  control: 'أنظمة التحكم اللاسلكي',
  video: 'أنظمة الفيديو',
  navigation: 'الملاحة والحساسات',
  structure: 'الهيكل والبناء الميكانيكي',
  assembly: 'اللحام والتجميع',
  software: 'البرامج والـFirmware',
  operations: 'التشغيل والصيانة والسلامة',
};

/**
 * One tracked element of the domain.
 *
 * `kind` matters: the spec insists on not confusing a component with the system
 * it belongs to, with the protocol it speaks, with the program that configures
 * it. Recording the distinction here keeps the inventory honest about what kind
 * of thing each row actually is.
 */
export type DomainElementKind = 'system' | 'component' | 'protocol' | 'software' | 'discipline';

export interface DomainElement {
  id: string;
  area: DomainArea;
  kind: DomainElementKind;
  titleAr: string;
  titleEn: string;
  /** One line on why this element is in scope at all. */
  whyAr: string;
  /** KB module id that owns it, when authored. */
  moduleId?: string;
  /** Assembly part-category key (see data/assembly/parts) when the build section offers it. */
  assemblyCategory?: string;
  /** Betaflight registry page ids that configure it. */
  betaflightPageIds?: string[];
  /** Glossary domain key its terms live under. */
  glossaryDomain?: string;
  /** Search index `system` value, when it differs from moduleId. */
  searchSystem?: string;
  /** Priority for the expansion plan: 1 = next, 3 = later. */
  priority: 1 | 2 | 3;
}

export const domainElements: DomainElement[] = [
  // ── Principles ────────────────────────────────────────────────────────────
  { id: 'flight-principles', area: 'principles', kind: 'system', titleAr: 'مبادئ طيران الكوادكابتر', titleEn: 'Quadcopter flight principles', whyAr: 'الأساس الذي يُفهَم به كل ما بعده: الرفع والدفع والعزم والاستقرار.', priority: 1 },
  { id: 'aerodynamics', area: 'principles', kind: 'system', titleAr: 'الديناميكا الهوائية', titleEn: 'Aerodynamics', whyAr: 'يفسّر سلوك المراوح والهيكل في الهواء وأسباب الكفاءة والاضطراب.', priority: 2 },

  // ── Propulsion ────────────────────────────────────────────────────────────
  { id: 'motors', area: 'propulsion', kind: 'component', titleAr: 'المحركات', titleEn: 'Motors', whyAr: 'مصدر الدفع كله، ويحدد أداء الطائرة وحرارتها واستهلاكها.', moduleId: 'motors', assemblyCategory: 'motors', glossaryDomain: 'motors', betaflightPageIds: ['motors'], priority: 1 },
  { id: 'propellers', area: 'propulsion', kind: 'component', titleAr: 'المراوح', titleEn: 'Propellers', whyAr: 'القطعة التي تحوّل دوران المحرك إلى دفع فعلي، وأكثر القطع تأثيراً في كل شيء.', assemblyCategory: 'propellers', glossaryDomain: 'propellers', priority: 1 },
  { id: 'esc', area: 'propulsion', kind: 'component', titleAr: 'منظّم السرعة (ESC)', titleEn: 'Electronic Speed Controller', whyAr: 'الجسر بين أمر متحكم الطيران وتيار المحرك الحقيقي.', assemblyCategory: 'escs', glossaryDomain: 'esc', betaflightPageIds: ['motors', 'configuration'], priority: 1 },

  // ── Electrical & power ────────────────────────────────────────────────────
  { id: 'flight-controller', area: 'electrical', kind: 'system', titleAr: 'متحكم الطيران', titleEn: 'Flight Controller', whyAr: 'المنظومة التي تربط كل شيء وتنفّذ حلقة التحكم.', moduleId: 'flight-controller', assemblyCategory: 'flightControllers', glossaryDomain: 'flight-controller', betaflightPageIds: ['setup', 'ports', 'configuration', 'sensors'], priority: 1 },
  { id: 'power-battery', area: 'electrical', kind: 'system', titleAr: 'البطاريات وأنظمة الطاقة', titleEn: 'Batteries and power systems', whyAr: 'مصدر الطاقة، وأكثر مصادر الخطر والفشل شيوعاً.', assemblyCategory: 'batteries', glossaryDomain: 'power-battery', betaflightPageIds: ['power'], priority: 1 },
  { id: 'electrical-basics', area: 'electrical', kind: 'discipline', titleAr: 'الكهرباء والإلكترونيات', titleEn: 'Electricity and electronics', whyAr: 'الجهد والتيار والأرضي والقصر — أساس كل توصيل وكل عطل كهربائي.', glossaryDomain: 'electrical', priority: 2 },
  { id: 'power-distribution', area: 'electrical', kind: 'component', titleAr: 'توزيع الطاقة والمكثفات والمنظّمات', titleEn: 'Power distribution, capacitors, regulators', whyAr: 'ما يحمي الإلكترونيات من ضجيج التيار العالي وقفزات الجهد.', assemblyCategory: 'capacitors', priority: 2 },

  // ── Radio control ─────────────────────────────────────────────────────────
  { id: 'radio-control', area: 'control', kind: 'system', titleAr: 'نظام التحكم اللاسلكي', titleEn: 'Radio control system', whyAr: 'جهاز الإرسال والمستقبل والبروتوكول والهوائيات — منظومة واحدة لا قطعة.', assemblyCategory: 'receivers', glossaryDomain: 'radio-control', betaflightPageIds: ['receiver', 'failsafe', 'modes'], priority: 1 },
  { id: 'radio-transmitter', area: 'control', kind: 'component', titleAr: 'جهاز الإرسال وEdgeTX', titleEn: 'Radio transmitter and EdgeTX', whyAr: 'واجهة الطيار كلها: القنوات والمزج والأوضاع والنماذج.', priority: 2 },
  { id: 'antennas', area: 'control', kind: 'component', titleAr: 'الهوائيات والترددات', titleEn: 'Antennas and RF', whyAr: 'يحدد المدى والموثوقية في التحكم والفيديو معاً.', priority: 2 },

  // ── Video ─────────────────────────────────────────────────────────────────
  { id: 'video', area: 'video', kind: 'system', titleAr: 'نظام الفيديو', titleEn: 'FPV video system', whyAr: 'العين التي يطير بها الطيار: الكاميرا والمرسل والنظارة.', assemblyCategory: 'videoUnits', glossaryDomain: 'video', betaflightPageIds: ['osd', 'vtx'], priority: 2 },
  { id: 'cameras-payload', area: 'video', kind: 'component', titleAr: 'الكاميرات والحمولة', titleEn: 'Cameras and payload', whyAr: 'التصوير والحمولة يغيّران الوزن ومركز الثقل وسلوك الطيران.', priority: 3 },

  // ── Navigation ────────────────────────────────────────────────────────────
  { id: 'navigation-sensors', area: 'navigation', kind: 'system', titleAr: 'GPS والملاحة والحساسات', titleEn: 'GPS, navigation and sensors', whyAr: 'أساس العودة التلقائية وتثبيت الموقع والمهام.', assemblyCategory: 'gps', glossaryDomain: 'navigation-sensors', betaflightPageIds: ['gps'], priority: 2 },

  // ── Structure ─────────────────────────────────────────────────────────────
  { id: 'frames', area: 'structure', kind: 'component', titleAr: 'الهياكل والبناء الميكانيكي', titleEn: 'Frames and mechanical build', whyAr: 'يحدد المقاسات المتاحة والصلابة والرنين ومقاومة الحوادث.', assemblyCategory: 'frames', glossaryDomain: 'frames', priority: 2 },

  // ── Assembly ──────────────────────────────────────────────────────────────
  { id: 'soldering-wiring', area: 'assembly', kind: 'discipline', titleAr: 'اللحام والتوصيل', titleEn: 'Soldering and wiring', whyAr: 'أكثر مهارة يدوية تحدد نجاح البناء أو فشله.', assemblyCategory: 'tools', priority: 2 },
  { id: 'leds-buzzer', area: 'assembly', kind: 'component', titleAr: 'الإضاءة والبازر والتنبيه', titleEn: 'LEDs, buzzer and alerts', whyAr: 'العثور على الطائرة ومعرفة حالتها بصرياً وصوتياً.', assemblyCategory: 'buzzers', betaflightPageIds: ['led-strip'], priority: 3 },

  // ── Software ──────────────────────────────────────────────────────────────
  { id: 'sw-betaflight', area: 'software', kind: 'software', titleAr: 'Betaflight', titleEn: 'Betaflight', whyAr: 'أكثر Firmware استخداماً في الطيران الحر والسباق.', searchSystem: 'betaflight', priority: 1 },
  { id: 'sw-esc-tools', area: 'software', kind: 'software', titleAr: 'برامج إعداد ESC', titleEn: 'ESC configurators (BLHeli / AM32)', whyAr: 'لا يمكن ضبط اتجاه المحرك ولا مرشّح الدوران ولا تشخيص الـESC بدونها.', priority: 1 },
  { id: 'sw-expresslrs', area: 'software', kind: 'software', titleAr: 'ExpressLRS Configurator', titleEn: 'ExpressLRS Configurator', whyAr: 'تحديث وربط نظام التحكم الأكثر انتشاراً اليوم.', searchSystem: 'expresslrs', priority: 2 },
  { id: 'sw-edgetx', area: 'software', kind: 'software', titleAr: 'EdgeTX', titleEn: 'EdgeTX', whyAr: 'نظام تشغيل جهاز الإرسال نفسه.', priority: 2 },
  { id: 'sw-inav', area: 'software', kind: 'software', titleAr: 'INAV', titleEn: 'INAV', whyAr: 'Firmware الملاحة للمهام والمسارات والعودة التلقائية.', priority: 3 },
  { id: 'sw-ardupilot', area: 'software', kind: 'software', titleAr: 'ArduPilot', titleEn: 'ArduPilot', whyAr: 'منصة الطيران الذاتي الاحترافية متعددة المركبات.', priority: 3 },
  { id: 'sw-blackbox', area: 'software', kind: 'software', titleAr: 'أدوات تحليل السجلات', titleEn: 'Blackbox log analysis', whyAr: 'الأداة الوحيدة التي تحوّل الضبط من تخمين إلى قياس.', priority: 3 },
  { id: 'sw-recovery', area: 'software', kind: 'software', titleAr: 'أدوات التعريف والاستعادة', titleEn: 'Driver and recovery tools', whyAr: 'إنقاذ لوحة لا يتعرف عليها الحاسوب.', priority: 3 },

  // ── Operations ────────────────────────────────────────────────────────────
  { id: 'tuning', area: 'operations', kind: 'discipline', titleAr: 'الضبط والأداء', titleEn: 'Tuning and performance', whyAr: 'PID والمرشّحات والمعدلات — ما يحوّل طائرة تطير إلى طائرة تُطاع.', glossaryDomain: 'tuning', betaflightPageIds: ['pid-tuning'], priority: 3 },
  { id: 'maintenance', area: 'operations', kind: 'discipline', titleAr: 'الصيانة والإصلاح', titleEn: 'Maintenance and repair', whyAr: 'ما بعد الحادث، وما يمنع الحادث التالي.', priority: 3 },
  { id: 'safety', area: 'operations', kind: 'discipline', titleAr: 'السلامة', titleEn: 'Safety', whyAr: 'بطاريات LiPo ومراوح سريعة وتيار عالٍ — الخطر حقيقي لا نظري.', glossaryDomain: 'safety', priority: 1 },
  { id: 'project-types', area: 'operations', kind: 'system', titleAr: 'أنواع المشاريع والاستخدامات', titleEn: 'Build types and use cases', whyAr: 'كل نوع مشروع يغيّر كل قرار في القطع والإعداد.', priority: 3 },
];

// ── Derived status ───────────────────────────────────────────────────────────

export interface DomainElementStatus {
  element: DomainElement;
  /** A KB module exists and has articles. */
  hasModule: boolean;
  articleCount: number;
  /** The assembly section actually offers this part category as a stage. */
  hasBuild: boolean;
  /** Software/firmware configuration coverage exists. */
  hasSoftware: boolean;
  /** At least one diagnostic tree owns it. */
  hasDiagnostics: boolean;
  dxCount: number;
  /** Glossary terms exist under its domain. */
  hasGlossary: boolean;
  termCount: number;
  /** Reachable via the global search index. */
  hasSearch: boolean;
  /** How many of the six corners are covered. */
  coveredCorners: number;
}

export const MATRIX_CORNERS = 6;

/**
 * Computes the real state of every element by inspecting live data.
 *
 * `searchDocSystems` is injected rather than imported so this module stays
 * usable from contexts that must not pull in the whole search index (the
 * matrix view needs it; a data-only consumer does not).
 */
export function domainMatrixStatus(searchDocSystems: Set<string>): DomainElementStatus[] {
  const assemblyCategories = new Set(
    buildStages.map(s => s.partCategory).filter((c): c is string => !!c),
  );
  const reviewedBfPages = new Set(
    bfPageRegistry.filter(e => e.contentStatus === 'reviewed').map(e => e.id),
  );

  return domainElements.map(el => {
    const mod = el.moduleId ? allKbModules.find(m => m.id === el.moduleId) : undefined;
    const articleCount = mod?.articles.length ?? 0;
    const hasModule = articleCount > 0;

    const hasBuild = !!el.assemblyCategory && assemblyCategories.has(el.assemblyCategory);

    // Software coverage means the platform can actually tell you how to
    // configure this element — either a reviewed Betaflight page owns it, or the
    // element IS a software entry with its own search presence.
    const hasSoftware = el.kind === 'software'
      ? (!!el.searchSystem && searchDocSystems.has(el.searchSystem))
      : (el.betaflightPageIds ?? []).some(id => reviewedBfPages.has(id));

    const dxCount = allDxTrees.filter(t => t.moduleId === el.moduleId).length;
    const termCount = el.glossaryDomain
      ? kbTerms.filter(t => t.domain === el.glossaryDomain).length
      : 0;

    const hasSearch = searchDocSystems.has(el.moduleId ?? el.searchSystem ?? el.id);

    const coveredCorners = [hasModule, hasBuild, hasSoftware, dxCount > 0, termCount > 0, hasSearch]
      .filter(Boolean).length;

    return {
      element: el,
      hasModule,
      articleCount,
      hasBuild,
      hasSoftware,
      hasDiagnostics: dxCount > 0,
      dxCount,
      hasGlossary: termCount > 0,
      termCount,
      hasSearch,
      coveredCorners,
    };
  });
}

export interface DomainMatrixSummary {
  totalElements: number;
  /** Elements with all six corners covered. */
  complete: number;
  /** Elements with at least one corner but not all. */
  partial: number;
  /** Elements with nothing at all yet. */
  notStarted: number;
  byArea: { area: DomainArea; total: number; complete: number; partial: number }[];
}

export function summarizeDomainMatrix(rows: DomainElementStatus[]): DomainMatrixSummary {
  const areas = Array.from(new Set(domainElements.map(e => e.area)));
  return {
    totalElements: rows.length,
    complete: rows.filter(r => r.coveredCorners === MATRIX_CORNERS).length,
    partial: rows.filter(r => r.coveredCorners > 0 && r.coveredCorners < MATRIX_CORNERS).length,
    notStarted: rows.filter(r => r.coveredCorners === 0).length,
    byArea: areas.map(area => {
      const inArea = rows.filter(r => r.element.area === area);
      return {
        area,
        total: inArea.length,
        complete: inArea.filter(r => r.coveredCorners === MATRIX_CORNERS).length,
        partial: inArea.filter(r => r.coveredCorners > 0 && r.coveredCorners < MATRIX_CORNERS).length,
      };
    }),
  };
}
