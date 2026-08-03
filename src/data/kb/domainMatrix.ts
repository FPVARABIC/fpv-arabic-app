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
import { computeModuleCoverage } from './coverage';
import { kbTerms } from './glossary/terms';
import { allDxTrees } from './diagnostics/trees';
import { buildStages } from '../assembly/buildStages';
import { bfPageRegistry } from '../betaflight/pageRegistry';
import { frames } from '../assembly/parts/frames';
import { motors } from '../assembly/parts/motors';
import { escs } from '../assembly/parts/escs';
import { flightControllers } from '../assembly/parts/flightControllers';
import { receivers } from '../assembly/parts/receivers';
import { videoUnits } from '../assembly/parts/videoUnits';
import { batteries } from '../assembly/parts/batteries';
import { propellers } from '../assembly/parts/propellers';
import { gps } from '../assembly/parts/gps';
import { buzzers } from '../assembly/parts/buzzers';
import { capacitors } from '../assembly/parts/capacitors';
import { tools } from '../assembly/parts/tools';
import type { BasePart } from '../assembly/types';

/** Part catalogues by assembly category — used to tell "offered" from "populated". */
const PARTS_BY_CATEGORY: Record<string, BasePart[]> = {
  frames, motors, escs, flightControllers, receivers, videoUnits,
  batteries, propellers, gps, buzzers, capacitors, tools,
};

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
  { id: 'propellers', area: 'propulsion', kind: 'component', titleAr: 'المراوح', titleEn: 'Propellers', whyAr: 'القطعة التي تحوّل دوران المحرك إلى دفع فعلي، وأكثر القطع تأثيراً في كل شيء.', moduleId: 'propellers', assemblyCategory: 'propellers', glossaryDomain: 'propellers', betaflightPageIds: ['motors', 'configuration'], priority: 1 },
  { id: 'esc', area: 'propulsion', kind: 'component', titleAr: 'منظّم السرعة (ESC)', titleEn: 'Electronic Speed Controller', whyAr: 'الجسر بين أمر متحكم الطيران وتيار المحرك الحقيقي.', moduleId: 'esc', assemblyCategory: 'escs', glossaryDomain: 'esc', betaflightPageIds: ['motors', 'configuration'], priority: 1 },

  // ── Electrical & power ────────────────────────────────────────────────────
  { id: 'flight-controller', area: 'electrical', kind: 'system', titleAr: 'متحكم الطيران', titleEn: 'Flight Controller', whyAr: 'المنظومة التي تربط كل شيء وتنفّذ حلقة التحكم.', moduleId: 'flight-controller', assemblyCategory: 'flightControllers', glossaryDomain: 'flight-controller', betaflightPageIds: ['setup', 'ports', 'configuration', 'sensors'], priority: 1 },
  { id: 'power-battery', area: 'electrical', kind: 'system', titleAr: 'البطاريات وأنظمة الطاقة', titleEn: 'Batteries and power systems', whyAr: 'مصدر الطاقة، وأكثر مصادر الخطر والفشل شيوعاً.', moduleId: 'power-battery', assemblyCategory: 'batteries', glossaryDomain: 'power-battery', betaflightPageIds: ['power'], priority: 1 },
  { id: 'electrical-basics', area: 'electrical', kind: 'discipline', titleAr: 'الكهرباء والإلكترونيات', titleEn: 'Electricity and electronics', whyAr: 'الجهد والتيار والأرضي والقصر — أساس كل توصيل وكل عطل كهربائي.', glossaryDomain: 'electrical', priority: 2 },
  { id: 'power-distribution', area: 'electrical', kind: 'component', titleAr: 'توزيع الطاقة والمكثفات والمنظّمات', titleEn: 'Power distribution, capacitors, regulators', whyAr: 'ما يحمي الإلكترونيات من ضجيج التيار العالي وقفزات الجهد.', assemblyCategory: 'capacitors', priority: 2 },

  // ── Radio control ─────────────────────────────────────────────────────────
  { id: 'radio-control', area: 'control', kind: 'system', titleAr: 'نظام التحكم اللاسلكي', titleEn: 'Radio control system', whyAr: 'جهاز الإرسال والمستقبل والبروتوكول والهوائيات — منظومة واحدة لا قطعة.', assemblyCategory: 'receivers', glossaryDomain: 'radio-control', betaflightPageIds: ['receiver', 'failsafe', 'modes'], priority: 1 },
  { id: 'radio-transmitter', area: 'control', kind: 'component', titleAr: 'جهاز الإرسال وEdgeTX', titleEn: 'Radio transmitter and EdgeTX', whyAr: 'واجهة الطيار كلها: القنوات والمزج والأوضاع والنماذج.', priority: 2 },
  { id: 'antennas', area: 'control', kind: 'component', titleAr: 'الهوائيات والترددات', titleEn: 'Antennas and RF', whyAr: 'يحدد المدى والموثوقية في التحكم والفيديو معاً.', priority: 2 },

  // ── Video ─────────────────────────────────────────────────────────────────
  { id: 'video', area: 'video', kind: 'system', titleAr: 'نظام الفيديو', titleEn: 'FPV video system', whyAr: 'العين التي يطير بها الطيار: الكاميرا والمرسل والنظارة.', moduleId: 'video', assemblyCategory: 'videoUnits', glossaryDomain: 'video', betaflightPageIds: ['osd', 'vtx'], priority: 2 },
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

/**
 * Three-state status per dimension.
 *
 * The binary tick this matrix originally used said "there is something here",
 * which is not the question the spec actually asks. Reaching 25/25 inside a
 * content model while the build corner is still a bare part list is exactly the
 * kind of half-coverage a tick hides. `partial` exists so that half-coverage
 * reports itself as half-coverage.
 */
export type DimensionState = 'none' | 'partial' | 'complete';

export type MatrixDimension =
  | 'content'
  | 'build'
  | 'software'
  | 'diagnostics'
  | 'glossary'
  | 'search';

export const MATRIX_DIMENSIONS: MatrixDimension[] = [
  'content', 'build', 'software', 'diagnostics', 'glossary', 'search',
];

export const MATRIX_DIMENSION_LABEL_AR: Record<MatrixDimension, string> = {
  content: 'المحتوى النظري',
  build: 'قسم البناء',
  software: 'البرامج والإعداد',
  diagnostics: 'التشخيص',
  glossary: 'القاموس',
  search: 'البحث',
};

export const MATRIX_DIMENSION_SHORT_AR: Record<MatrixDimension, string> = {
  content: 'محتوى',
  build: 'بناء',
  software: 'برامج',
  diagnostics: 'تشخيص',
  glossary: 'قاموس',
  search: 'بحث',
};

/**
 * Declared floors, not measurements.
 *
 * These numbers cannot be derived from anything — they are the platform's own
 * standard for "this dimension is finished". They live here as named constants
 * so the standard is visible and auditable rather than buried in a comparison.
 */
export const MIN_DX_TREES_FOR_COMPLETE = 2;
export const MIN_TERMS_FOR_COMPLETE = 5;
export const MIN_PARTS_FOR_COMPLETE = 3;

export interface DomainElementStatus {
  element: DomainElement;

  /** Per-dimension three-state status — the honest view. */
  dimensions: Record<MatrixDimension, DimensionState>;

  /**
   * Overall status. Deliberately the WEAKEST dimension, never an average:
   * a system explained in lessons but absent from the build section is not
   * "83% done", it is incomplete.
   */
  overall: DimensionState;

  // ── Raw counts behind the states, shown to the user so the verdict is auditable
  articleCount: number;
  /** Covered / required coverage axes inside the module, when one exists. */
  coverageCovered: number;
  coverageRequired: number;
  dxCount: number;
  termCount: number;
  partCount: number;
  /** Reviewed Betaflight pages out of those declared for this element. */
  bfReviewed: number;
  bfDeclared: number;

  /** Count of dimensions at `complete`. */
  completeDimensions: number;

  // ── Backwards-compatible booleans, kept so existing consumers keep working
  hasModule: boolean;
  hasBuild: boolean;
  hasSoftware: boolean;
  hasDiagnostics: boolean;
  hasGlossary: boolean;
  hasSearch: boolean;
  /** Count of dimensions that are not `none`. */
  coveredCorners: number;
}

export const MATRIX_CORNERS = MATRIX_DIMENSIONS.length;

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

    // ── Content: a module exists, and every axis it declares is genuinely
    //    covered. A module at 20/25 reports `partial`, not a tick.
    const cov = mod ? computeModuleCoverage(mod) : null;
    const coverageCovered = cov?.coveredCount ?? 0;
    const coverageRequired = cov?.requiredCount ?? 0;
    const content: DimensionState =
      articleCount === 0 ? 'none'
        : cov && cov.complete ? 'complete'
          : 'partial';

    // ── Build: the stage must exist AND the catalogue behind it must actually
    //    offer parts. A stage pointing at an empty list is a screen, not a build
    //    section.
    const partCount = el.assemblyCategory ? (PARTS_BY_CATEGORY[el.assemblyCategory]?.length ?? 0) : 0;
    const stageOffered = !!el.assemblyCategory && assemblyCategories.has(el.assemblyCategory);
    const build: DimensionState =
      !stageOffered ? 'none'
        : partCount >= MIN_PARTS_FOR_COMPLETE ? 'complete'
          : 'partial';

    // ── Software: every declared configuration page must be reviewed, AND the
    //    module must actually teach the setup (an article claiming the
    //    `configuration` axis). Reviewed pages with no article tying them to the
    //    hardware is exactly the disconnect the spec objects to.
    const bfDeclared = (el.betaflightPageIds ?? []).length;
    const bfReviewed = (el.betaflightPageIds ?? []).filter(id => reviewedBfPages.has(id)).length;
    const teachesSetup = !!mod && mod.articles.some(a => a.coverage.includes('configuration'));
    let software: DimensionState;
    if (el.kind === 'software') {
      software = (!!el.searchSystem && searchDocSystems.has(el.searchSystem)) ? 'complete' : 'none';
    } else if (bfDeclared === 0) {
      software = 'none';
    } else if (bfReviewed === bfDeclared && teachesSetup) {
      software = 'complete';
    } else if (bfReviewed > 0) {
      software = 'partial';
    } else {
      software = 'none';
    }

    // ── Diagnostics: trees owned by this element's module, against a declared
    //    floor. One tree covers one symptom; a system needs more than that.
    const dxCount = allDxTrees.filter(t => t.moduleId === el.moduleId).length;
    const diagnostics: DimensionState =
      dxCount === 0 ? 'none'
        : dxCount >= MIN_DX_TREES_FOR_COMPLETE ? 'complete'
          : 'partial';

    const termCount = el.glossaryDomain
      ? kbTerms.filter(t => t.domain === el.glossaryDomain).length
      : 0;
    const glossary: DimensionState =
      termCount === 0 ? 'none'
        : termCount >= MIN_TERMS_FOR_COMPLETE ? 'complete'
          : 'partial';

    const search: DimensionState =
      searchDocSystems.has(el.moduleId ?? el.searchSystem ?? el.id) ? 'complete' : 'none';

    const dimensions: Record<MatrixDimension, DimensionState> = {
      content, build, software, diagnostics, glossary, search,
    };

    const states = MATRIX_DIMENSIONS.map(d => dimensions[d]);
    const overall: DimensionState =
      states.every(s => s === 'complete') ? 'complete'
        : states.every(s => s === 'none') ? 'none'
          : 'partial';

    return {
      element: el,
      dimensions,
      overall,
      articleCount,
      coverageCovered,
      coverageRequired,
      dxCount,
      termCount,
      partCount,
      bfReviewed,
      bfDeclared,
      completeDimensions: states.filter(s => s === 'complete').length,
      hasModule: content !== 'none',
      hasBuild: build !== 'none',
      hasSoftware: software !== 'none',
      hasDiagnostics: diagnostics !== 'none',
      hasGlossary: glossary !== 'none',
      hasSearch: search !== 'none',
      coveredCorners: states.filter(s => s !== 'none').length,
    };
  });
}

export interface DomainMatrixSummary {
  totalElements: number;
  /** Elements where EVERY dimension is complete. */
  complete: number;
  /** Elements with something in at least one dimension, but not all complete. */
  partial: number;
  /** Elements with nothing at all yet. */
  notStarted: number;
  /** How many elements reach `complete` in each dimension separately. */
  byDimension: { dimension: MatrixDimension; complete: number; partial: number; none: number }[];
  byArea: { area: DomainArea; total: number; complete: number; partial: number }[];
}

export function summarizeDomainMatrix(rows: DomainElementStatus[]): DomainMatrixSummary {
  const areas = Array.from(new Set(domainElements.map(e => e.area)));
  return {
    totalElements: rows.length,
    complete: rows.filter(r => r.overall === 'complete').length,
    partial: rows.filter(r => r.overall === 'partial').length,
    notStarted: rows.filter(r => r.overall === 'none').length,
    byDimension: MATRIX_DIMENSIONS.map(dimension => ({
      dimension,
      complete: rows.filter(r => r.dimensions[dimension] === 'complete').length,
      partial: rows.filter(r => r.dimensions[dimension] === 'partial').length,
      none: rows.filter(r => r.dimensions[dimension] === 'none').length,
    })),
    byArea: areas.map(area => {
      const inArea = rows.filter(r => r.element.area === area);
      return {
        area,
        total: inArea.length,
        complete: inArea.filter(r => r.overall === 'complete').length,
        partial: inArea.filter(r => r.overall === 'partial').length,
      };
    }),
  };
}
