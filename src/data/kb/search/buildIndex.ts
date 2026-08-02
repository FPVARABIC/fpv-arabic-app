/**
 * Global search index.
 *
 * Before this file the app had no app-wide search at all: the only search box
 * (`Community/Search/SearchScreen.tsx`) queried Firestore for community posts
 * and users. A user could not search for a lesson, a part, a Betaflight setting
 * or a term.
 *
 * This index spans EVERY content source in the app at once:
 *   KB articles · KB glossary · diagnostic trees · lessons · Betaflight pages ·
 *   Betaflight FIELDS (individual settings, by their real English label) ·
 *   assembly parts · assembly stages · roadmap stages · checklists ·
 *   ExpressLRS setup steps · ExpressLRS troubleshooting issues.
 *
 * Built lazily, once, and cached — it is derived entirely from already-loaded
 * static data, so there is no fetch and no async.
 */

import { normalizeText, tokenize } from './normalize';
import type { KbLevel } from '../types';

import { allKbModules } from '../registry';
import { kbTerms } from '../glossary/terms';
import { allDxTrees } from '../diagnostics/trees';

import { lessonsData } from '../../lessonsData';
import { bfPageRegistry } from '../../betaflight/pageRegistry';
import { buildStages } from '../../assembly/buildStages';
import { roadmapData } from '../../roadmapData';
import { checklistsData } from '../../checklistsData';
import { setupSteps } from '../../expresslrs/setupSteps';
import { troubleshootingIssues } from '../../expresslrs/troubleshootingIssues';
import { troubleshootingData } from '../../troubleshootingData';

import { frames } from '../../assembly/parts/frames';
import { motors } from '../../assembly/parts/motors';
import { escs } from '../../assembly/parts/escs';
import { flightControllers } from '../../assembly/parts/flightControllers';
import { receivers } from '../../assembly/parts/receivers';
import { videoUnits } from '../../assembly/parts/videoUnits';
import { batteries } from '../../assembly/parts/batteries';
import { propellers } from '../../assembly/parts/propellers';
import { gps } from '../../assembly/parts/gps';
import { buzzers } from '../../assembly/parts/buzzers';
import { capacitors } from '../../assembly/parts/capacitors';
import { tools } from '../../assembly/parts/tools';
import type { BasePart } from '../../assembly/types';

export type SearchDocType =
  | 'article'
  | 'term'
  | 'dx'
  | 'lesson'
  | 'bf-page'
  | 'bf-field'
  | 'part'
  | 'assembly-stage'
  | 'roadmap'
  | 'checklist'
  | 'elrs-step'
  | 'elrs-issue'
  | 'troubleshooting';

export const SEARCH_TYPE_LABEL_AR: Record<SearchDocType, string> = {
  article: 'موسوعة',
  term: 'مصطلح',
  dx: 'تشخيص',
  lesson: 'درس',
  'bf-page': 'Betaflight — صفحة',
  'bf-field': 'Betaflight — إعداد',
  part: 'قطعة',
  'assembly-stage': 'مرحلة تجميع',
  roadmap: 'مرحلة بناء',
  checklist: 'قائمة فحص',
  'elrs-step': 'ExpressLRS — خطوة',
  'elrs-issue': 'ExpressLRS — مشكلة',
  troubleshooting: 'مشكلة وحل',
};

/** Broad content class, used by the "تعليمي / مرجعي / تشخيصي" filter. */
export type SearchContentClass = 'learning' | 'reference' | 'diagnostic';

export interface SearchDoc {
  /** Globally unique: `${type}:${sourceId}`. */
  key: string;
  type: SearchDocType;
  sourceId: string;
  titleAr: string;
  titleEn?: string;
  subtitle?: string;
  route: string;
  contentClass: SearchContentClass;
  level?: KbLevel;
  /** Owning system/module id where one exists — powers the "النظام" filter. */
  system?: string;
  /** Software this belongs to, e.g. 'betaflight', 'expresslrs'. */
  software?: string;
  /** Firmware/app version this statement is tied to, when version-specific. */
  version?: string;
  /** Normalized, deduped title tokens — highest search weight. */
  titleTokens: string[];
  /** Normalized keyword tokens — high weight. */
  keywordTokens: string[];
  /** Normalized body tokens — lowest weight. */
  bodyTokens: string[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function uniq(tokens: string[]): string[] {
  return Array.from(new Set(tokens.filter(Boolean)));
}

function toks(...parts: (string | undefined | null)[]): string[] {
  return uniq(parts.filter((p): p is string => !!p).flatMap(tokenize));
}

/** Body text is capped so one huge article cannot dominate token frequency. */
const BODY_TOKEN_CAP = 900;

function bodyToks(...parts: (string | undefined | null)[]): string[] {
  return uniq(parts.filter((p): p is string => !!p).flatMap(tokenize)).slice(0, BODY_TOKEN_CAP);
}

function partDocs(list: BasePart[], categoryAr: string, system: string): SearchDoc[] {
  return list.map(p => ({
    key: `part:${p.id}`,
    type: 'part' as const,
    sourceId: p.id,
    titleAr: p.nameAr,
    titleEn: p.nameEn,
    subtitle: `${categoryAr}${p.brand ? ` · ${p.brand}` : ''}`,
    route: '/assembly',
    contentClass: 'reference' as const,
    system,
    titleTokens: toks(p.nameAr, p.nameEn, p.brand, categoryAr),
    keywordTokens: toks(p.protocolOrSystem, p.tier, ...(p.compatibilityTags.droneTypes ?? [])),
    bodyTokens: bodyToks(
      p.whyChoose, p.notFor, p.upgradePath,
      ...p.beginnerNotes, ...p.safetyNotes, ...p.buildNotes,
    ),
  }));
}

// ── index construction ────────────────────────────────────────────────────────

function buildDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  // KB articles — the encyclopedia itself.
  for (const mod of allKbModules) {
    for (const a of mod.articles) {
      const layerText = Object.values(a.layers)
        .flat()
        .map(b => {
          if (!b) return '';
          switch (b.type) {
            case 'para': return b.text;
            case 'list': return [b.title, ...b.items].filter(Boolean).join(' ');
            case 'steps': return [b.title, ...b.steps.flatMap(s => [s.text, s.note])].filter(Boolean).join(' ');
            case 'table': return [b.caption, ...b.headers, ...b.rows.flat()].filter(Boolean).join(' ');
            case 'callout': return [b.title, b.text].filter(Boolean).join(' ');
            case 'definition': return [b.term, b.en, b.text].filter(Boolean).join(' ');
            case 'keyvalue': return [b.caption, ...b.pairs.flatMap(p => [p.k, p.v])].filter(Boolean).join(' ');
            case 'compare': return [b.caption, ...b.columns, ...b.rows.flatMap(r => [r.label, ...r.cells])].filter(Boolean).join(' ');
            case 'diagram': return b.caption ?? '';
            case 'faq': return b.items.flatMap(i => [i.q, i.a]).join(' ');
            case 'checklist': return [b.title, ...b.items].filter(Boolean).join(' ');
            default: return '';
          }
        })
        .join(' ');

      docs.push({
        key: `article:${a.id}`,
        type: 'article',
        sourceId: a.id,
        titleAr: a.titleAr,
        titleEn: a.titleEn,
        subtitle: mod.titleAr,
        route: `/kb/${mod.id}/${a.id}`,
        contentClass: a.kind === 'diagnostic' ? 'diagnostic' : (a.kind === 'reference' || a.kind === 'comparison' ? 'reference' : 'learning'),
        level: a.levels[0],
        system: mod.id,
        titleTokens: toks(a.titleAr, a.titleEn),
        keywordTokens: toks(...a.keywordsAr, ...a.keywordsEn, ...a.objectives),
        bodyTokens: bodyToks(a.summaryAr, layerText, ...(a.tasks ?? [])),
      });
    }
  }

  // Glossary terms.
  for (const t of kbTerms) {
    docs.push({
      key: `term:${t.id}`,
      type: 'term',
      sourceId: t.id,
      titleAr: t.ar,
      titleEn: t.en,
      subtitle: t.abbr ? `${t.en} (${t.abbr})` : t.en,
      route: `/glossary?term=${encodeURIComponent(t.id)}`,
      contentClass: 'reference',
      system: t.domain,
      titleTokens: toks(t.ar, t.en, t.abbr, t.pronunciationAr),
      keywordTokens: toks(...t.appearsIn, ...(t.examples ?? [])),
      bodyTokens: bodyToks(t.short, t.technical),
    });
  }

  // Diagnostic trees — searchable by symptom wording, not just by title.
  for (const tree of allDxTrees) {
    docs.push({
      key: `dx:${tree.id}`,
      type: 'dx',
      sourceId: tree.id,
      titleAr: tree.titleAr,
      subtitle: tree.symptomAr,
      route: `/diagnose/${tree.id}`,
      contentClass: 'diagnostic',
      system: tree.moduleId,
      titleTokens: toks(tree.titleAr, tree.symptomAr),
      keywordTokens: toks(...tree.aliases),
      bodyTokens: bodyToks(
        ...tree.quickChecks,
        ...tree.nodes.flatMap(n => [n.question, n.how, n.expected, ...n.outcomes.map(o => `${o.label} ${o.meaning}`)]),
        ...tree.stopConditions,
      ),
    });
  }

  // Lessons.
  for (const l of lessonsData) {
    docs.push({
      key: `lesson:${l.id}`,
      type: 'lesson',
      sourceId: l.id,
      titleAr: l.title,
      subtitle: `درس ${l.number} · ${l.level}`,
      route: `/lessons/${l.id}`,
      contentClass: 'learning',
      level: l.level === 'مبتدئ' ? 'beginner' : 'intermediate',
      titleTokens: toks(l.title, l.description),
      keywordTokens: toks(l.objective, ...(l.conceptIds ?? [])),
      bodyTokens: bodyToks(l.explanation, ...l.importantPoints, l.commonMistake, l.warning),
    });
  }

  // Betaflight — pages, and every individual field by its real English label.
  for (const entry of bfPageRegistry) {
    docs.push({
      key: `bf-page:${entry.id}`,
      type: 'bf-page',
      sourceId: entry.id,
      titleAr: entry.titleAr,
      titleEn: entry.officialTitle,
      subtitle: entry.contentStatus === 'reviewed' ? 'Betaflight' : 'Betaflight · لم يُغطَّ بعد',
      route: `/betaflight/${entry.id}`,
      contentClass: 'reference',
      software: 'betaflight',
      titleTokens: toks(entry.titleAr, entry.officialTitle, entry.officialId),
      keywordTokens: toks('betaflight'),
      bodyTokens: bodyToks(entry.page?.summaryAr, entry.conditionNote),
    });

    if (!entry.page) continue;
    for (const group of entry.page.groups) {
      for (const f of group.fields) {
        docs.push({
          key: `bf-field:${entry.id}.${f.id}`,
          type: 'bf-field',
          sourceId: `${entry.id}.${f.id}`,
          titleAr: f.arabicMeaning,
          titleEn: f.englishLabel,
          subtitle: `${entry.officialTitle} › ${group.titleAr}`,
          route: `/betaflight/${entry.id}`,
          contentClass: 'reference',
          software: 'betaflight',
          version: f.source.firmwareVersion,
          titleTokens: toks(f.englishLabel, f.arabicMeaning),
          keywordTokens: toks(entry.officialTitle, entry.titleAr, group.titleAr, 'betaflight'),
          bodyTokens: bodyToks(f.arabicExplanation, f.beginnerGuidance, f.advancedGuidance, f.conditionNote),
        });
      }
    }
  }

  // Assembly parts.
  docs.push(
    ...partDocs(frames, 'إطار', 'frames'),
    ...partDocs(motors, 'محرك', 'motors'),
    ...partDocs(escs, 'ESC', 'esc'),
    ...partDocs(flightControllers, 'متحكم طيران', 'flight-controller'),
    ...partDocs(receivers, 'مستقبل', 'radio-control'),
    ...partDocs(videoUnits, 'وحدة فيديو', 'video'),
    ...partDocs(batteries, 'بطارية', 'power-battery'),
    ...partDocs(propellers, 'مروحة', 'propellers'),
    ...partDocs(gps, 'GPS', 'navigation-sensors'),
    ...partDocs(buzzers, 'بازر', 'electrical'),
    ...partDocs(capacitors, 'مكثف', 'electrical'),
    ...partDocs(tools, 'أداة', 'soldering-wiring'),
  );

  // Assembly stages.
  for (const s of buildStages) {
    docs.push({
      key: `assembly-stage:${s.id}`,
      type: 'assembly-stage',
      sourceId: s.id,
      titleAr: s.titleAr,
      subtitle: `التجميع · مرحلة ${s.number}`,
      route: '/assembly',
      contentClass: 'reference',
      titleTokens: toks(s.titleAr),
      keywordTokens: toks(s.partCategory ?? ''),
      bodyTokens: bodyToks(s.descriptionAr),
    });
  }

  // Roadmap stages.
  for (const r of roadmapData) {
    docs.push({
      key: `roadmap:${r.id}`,
      type: 'roadmap',
      sourceId: r.id,
      titleAr: r.title,
      subtitle: `البناء · مرحلة ${r.number}`,
      route: `/roadmap/${r.id}`,
      contentClass: 'learning',
      titleTokens: toks(r.title),
      keywordTokens: toks(...(r.conceptIds ?? [])),
      bodyTokens: bodyToks(r.description, ...r.checklist),
    });
  }

  // Checklists.
  for (const c of checklistsData) {
    docs.push({
      key: `checklist:${c.id}`,
      type: 'checklist',
      sourceId: c.id,
      titleAr: c.title,
      subtitle: 'قائمة فحص',
      route: '/checklists',
      contentClass: 'reference',
      titleTokens: toks(c.title),
      keywordTokens: [],
      bodyTokens: bodyToks(...c.items.map(i => i.text)),
    });
  }

  // ExpressLRS setup steps.
  for (const s of setupSteps) {
    docs.push({
      key: `elrs-step:${s.id}`,
      type: 'elrs-step',
      sourceId: s.id,
      titleAr: s.title,
      subtitle: `ExpressLRS · خطوة ${s.order}`,
      route: '/programming/expresslrs/setup',
      contentClass: 'learning',
      software: 'expresslrs',
      system: 'radio-control',
      titleTokens: toks(s.title),
      keywordTokens: toks('expresslrs', 'elrs', ...s.terminology.map(t => `${t.term}`)),
      bodyTokens: bodyToks(s.summary, s.goal, ...s.actions, ...s.expectedResult, ...s.commonMistakes),
    });
  }

  // ExpressLRS troubleshooting issues.
  for (const i of troubleshootingIssues) {
    docs.push({
      key: `elrs-issue:${i.id}`,
      type: 'elrs-issue',
      sourceId: i.id,
      titleAr: i.title,
      subtitle: i.symptom,
      route: '/programming/expresslrs/troubleshooting',
      contentClass: 'diagnostic',
      software: 'expresslrs',
      system: 'radio-control',
      titleTokens: toks(i.title, i.symptom),
      keywordTokens: toks(i.category, 'expresslrs', 'elrs'),
      bodyTokens: bodyToks(...i.likelyCauses, i.resolvedWhen, i.nextIfUnresolved),
    });
  }

  // Legacy troubleshooting list — kept alive and now reachable via search.
  for (const t of troubleshootingData) {
    docs.push({
      key: `troubleshooting:${t.id}`,
      type: 'troubleshooting',
      sourceId: t.id,
      titleAr: t.problem,
      subtitle: t.symptoms[0],
      route: '/troubleshooting',
      contentClass: 'diagnostic',
      titleTokens: toks(t.problem),
      keywordTokens: toks(...t.symptoms),
      bodyTokens: bodyToks(...t.causes, ...t.steps, t.safetyNote),
    });
  }

  return docs;
}

let cached: SearchDoc[] | null = null;

export function getSearchIndex(): SearchDoc[] {
  if (!cached) cached = buildDocs();
  return cached;
}

/** Test-only: forces a rebuild. Never called by app code. */
export function resetSearchIndexCache(): void {
  cached = null;
}

/** Distinct systems present in the index, for the filter UI. */
export function indexSystems(): string[] {
  return Array.from(new Set(getSearchIndex().map(d => d.system).filter((s): s is string => !!s))).sort();
}

export { normalizeText };
