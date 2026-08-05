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
import type { KbLevel, KbLink, KbBotMeta } from '../types';

import { allKbModules } from '../registry';
import { kbTerms } from '../glossary/terms';
import { allDxTrees } from '../diagnostics/trees';

import { lessonsData } from '../../lessonsData';
import { bfPageRegistry } from '../../betaflight/pageRegistry';
import { buildStages } from '../../assembly/buildStages';
import { droneTypes } from '../../assembly/droneTypes';
import { roadmapData } from '../../roadmapData';
import { checklistsData } from '../../checklistsData';
import { setupSteps } from '../../expresslrs/setupSteps';
import { allEdgeTxPages } from '../../edgetx/registry';
import { allVideoToolPages } from '../../video/software/registry';
import { troubleshootingIssues } from '../../expresslrs/troubleshootingIssues';
import { SOFTWARE_SCOPE } from '../../software/scope';
import { resolveDestination } from '../../../platform/destinations';
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
  | 'edgetx-topic'
  | 'edgetx-setting'
  | 'video-tool'
  | 'software-scope'
  // Three sources that existed but had no way to be found. A module is what a
  // reader names when they say «افتح منظومة الفيديو»; a learning path is the
  // answer to «من أين أبدأ»; and a diagnostic NODE is the individual check
  // someone describes when they say «الطائرة لا تسلّح بعد ما وصّلت البطارية» —
  // indexing only the tree root made every one of those land on a front page
  // and leave the reader to find their own step.
  | 'module'
  | 'path'
  | 'dx-node'
  | 'drone-type'
  | 'troubleshooting'
  /*
   * Contributed by a surface rather than built here — see `registerSearchDocs`.
   *
   * The TYPES live in the shared union because the contract is shared: the
   * ranking, the filters and the result badges all switch on this, and a type
   * the engine does not know about is a result nobody can filter. The DOCUMENTS
   * live wherever the section does, which for these five is the web.
   */
  | 'project'
  | 'project-section'
  | 'product'
  | 'product-variant'
  | 'service'
  | 'page';

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
  'edgetx-topic': 'EdgeTX — موضوع',
  'edgetx-setting': 'EdgeTX — إعداد',
  'video-tool': 'برامج الفيديو',
  'software-scope': 'خارج التغطية',
  module: 'منظومة',
  path: 'مسار تعلّم',
  'dx-node': 'خطوة تشخيص',
  'drone-type': 'نوع بناء',
  troubleshooting: 'مشكلة وحل',
  project: 'مشروع',
  'project-section': 'قسم في مشروع',
  product: 'منتج',
  'product-variant': 'خيار منتج',
  service: 'خدمة',
  page: 'صفحة',
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
  /**
   * The normalised forms that ARE this thing's name.
   *
   * Not the same as its title tokens. «ESC» is the ABBREVIATION of a term whose
   * English title is "Electronic Speed Controller" and whose Arabic title is
   * «منظّم سرعة المحرك» — so an equality test against either title fails, and
   * the entry that defines ESC lost to a lesson with ESC in its name. The names
   * a thing answers to are their own field.
   */
  exactNames?: string[];
  /** Normalized, deduped title tokens — highest search weight. */
  titleTokens: string[];
  /** Normalized keyword tokens — high weight. */
  keywordTokens: string[];
  /** Normalized body tokens — lowest weight. */
  bodyTokens: string[];

  /**
   * The phrasings a reader uses when something is WRONG, kept apart from the
   * ordinary keywords.
   *
   * This separation is the single biggest ranking fix in this batch. These
   * strings already existed — every article, diagnostic tree, ExpressLRS issue
   * and EdgeTX topic carries `bot.symptomsAr` — but they were folded into
   * `keywordTokens`, which made «الريسيفر لا يشتغل» score a receiver PRODUCT
   * above the diagnosis, because a product name shares those words too. A
   * symptom match is a different KIND of evidence from a keyword match, and it
   * has to be scored as one.
   */
  symptomTokens: string[];

  /**
   * Retrieval metadata, carried through from the entry's own `bot` block.
   *
   * Not new content and not a second copy: these are references into the same
   * fields `src/data/` already holds, surfaced on the doc so the retrieval layer
   * can answer "what does the reader have to tell me before I can judge this?"
   * without loading the whole source entry. This is what lets the assistant use
   * this index later instead of building its own.
   */
  intents?: string[];
  /** Destinations this entry can offer, as abstract links — never routes. */
  actions?: KbLink[];
  /** Facts that must be known before any judgement about this topic. */
  requiresBeforeVerdict?: string[];
  /** Safety preconditions that must be stated before any step is suggested. */
  safetyPrerequisitesAr?: string[];
  /** Part categories this concerns, e.g. 'receivers'. */
  parts?: string[];
  /** When this statement was last checked against its source. */
  reviewedAt?: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function uniq(tokens: string[]): string[] {
  return Array.from(new Set(tokens.filter(Boolean)));
}

/**
 * The normalised whole names a thing answers to, for equality matching.
 *
 * Five glossary entries write their acronym INSIDE the English name — «CRSF
 * (Crossfire Serial Protocol)», «OSD (On-Screen Display)» — rather than in the
 * `abbr` field the others use. Both spellings are legitimate content, so the
 * acronym is derived here instead of the content being rewritten to suit the
 * index: someone typing «CRSF» is naming that term whichever way its author
 * chose to write it down.
 */
function names(...parts: (string | undefined | null)[]): string[] {
  const out = parts.filter((p): p is string => !!p).map(normalizeText);
  for (const p of parts) {
    const m = p?.match(/^([A-Za-z0-9][A-Za-z0-9-]{1,6})\s*\(/);
    if (m) out.push(normalizeText(m[1]));
  }
  return uniq(out);
}

function toks(...parts: (string | undefined | null)[]): string[] {
  return uniq(parts.filter((p): p is string => !!p).flatMap(tokenize));
}

/** Body text is capped so one huge article cannot dominate token frequency. */
const BODY_TOKEN_CAP = 900;

function bodyToks(...parts: (string | undefined | null)[]): string[] {
  return uniq(parts.filter((p): p is string => !!p).flatMap(tokenize)).slice(0, BODY_TOKEN_CAP);
}

/**
 * The symptom surface of an entry: the words someone types when it is broken.
 *
 * Misspellings belong here rather than in the keywords for the same reason the
 * symptoms do — «الريسيفر ميت» is a symptom phrasing, not a synonym of the
 * title, and treating it as one made typo-tolerance and symptom matching
 * indistinguishable in the score.
 */
function symptomToks(bot: KbBotMeta | undefined, ...extra: (string | undefined)[]): string[] {
  return uniq([
    ...(bot?.symptomsAr ?? []),
    ...(bot?.misspellingsAr ?? []),
    ...extra.filter((x): x is string => !!x),
  ].flatMap(tokenize));
}

/** The retrieval metadata every doc carries, lifted from one `bot` block. */
function botFields(bot: KbBotMeta | undefined) {
  if (!bot) return {};
  return {
    ...(bot.intents?.length ? { intents: bot.intents as string[] } : {}),
    ...(bot.actions?.length ? { actions: bot.actions } : {}),
    ...(bot.requiresBeforeVerdict?.length ? { requiresBeforeVerdict: bot.requiresBeforeVerdict } : {}),
    ...(bot.safetyPrerequisitesAr?.length ? { safetyPrerequisitesAr: bot.safetyPrerequisitesAr } : {}),
    ...(bot.parts?.length ? { parts: bot.parts } : {}),
  };
}

function partDocs(list: BasePart[], categoryAr: string, system: string): SearchDoc[] {
  return list.map(p => ({
    symptomTokens: [],
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
        symptomTokens: symptomToks(a.bot),
        reviewedAt: a.sources?.[0]?.reviewedAt,
        ...botFields(a.bot),
      });
    }
  }

  // The seven systems themselves.
  //
  // A module was findable only through its articles, so «افتح منظومة الفيديو»
  // returned eleven video articles and no way to see the system as a whole —
  // which is the thing a reader starting out actually wants.
  for (const mod of allKbModules) {
    docs.push({
      key: `module:${mod.id}`,
      type: 'module',
      sourceId: mod.id,
      titleAr: mod.titleAr,
      titleEn: mod.titleEn,
      subtitle: mod.summaryAr,
      route: `/kb/${mod.id}`,
      contentClass: 'learning',
      system: mod.id,
      titleTokens: toks(mod.titleAr, mod.titleEn),
      keywordTokens: toks(mod.summaryAr),
      bodyTokens: bodyToks(...mod.articles.map(a => a.titleAr)),
      symptomTokens: [],
    });

    // And the ordered routes through it. «من أين أبدأ» has an answer in this
    // platform — thirty-one of them — and none of it was searchable.
    for (const path of mod.paths ?? []) {
      docs.push({
        key: `path:${path.id}`,
        type: 'path',
        sourceId: path.id,
        titleAr: path.titleAr,
        subtitle: `${mod.titleAr} · ${path.audienceAr}`,
        route: `/kb/${mod.id}`,
        contentClass: 'learning',
        level: path.level,
        system: mod.id,
        titleTokens: toks(path.titleAr),
        keywordTokens: toks(path.audienceAr, path.outcomeAr),
        bodyTokens: bodyToks(...path.articleIds),
        symptomTokens: [],
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
      exactNames: names(t.ar, t.en, t.abbr, t.pronunciationAr),
      titleTokens: toks(t.ar, t.en, t.abbr, t.pronunciationAr),
      keywordTokens: toks(...t.appearsIn, ...(t.examples ?? [])),
      bodyTokens: bodyToks(t.short, t.technical),
      // A term's «examples» ARE its symptom surface: «لا أستطيع تغيير القناة من
      // النظارة» is written on the VTX Table entry precisely because that is
      // what someone types when they meet the concept for the first time.
      symptomTokens: symptomToks(undefined, ...(t.examples ?? [])),
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
      // The symptom line and every alias for it. This is the field that makes
      // «الريسيفر لا يشتغل» reach the diagnosis rather than a product whose
      // description happens to contain the same three words.
      symptomTokens: symptomToks(undefined, tree.symptomAr, ...tree.aliases),
      reviewedAt: tree.lastReviewed,
      safetyPrerequisitesAr: [
        ...(tree.removeProps ? ['انزع المراوح قبل أي فحص في هذه الشجرة'] : []),
        ...(tree.disconnectBattery ? ['افصل البطارية قبل أي فحص في هذه الشجرة'] : []),
      ],
    });

    // Every individual check inside the tree.
    //
    // Indexing only the root meant that someone describing the exact check they
    // are stuck on — «الطائرة لا تسلّح بعد توصيل البطارية» — landed on the front
    // of a five-step tree and had to find their own step. The node carries the
    // question, how to perform it and what to expect, which is precisely the
    // language a stuck reader uses.
    for (const node of tree.nodes) {
      docs.push({
        key: `dx-node:${tree.id}.${node.id}`,
        type: 'dx-node',
        sourceId: `${tree.id}.${node.id}`,
        titleAr: node.question,
        subtitle: `${tree.titleAr} › ${node.how}`,
        route: `/diagnose/${tree.id}`,
        contentClass: 'diagnostic',
        system: tree.moduleId,
        titleTokens: toks(node.question),
        keywordTokens: toks(node.how, node.expected),
        bodyTokens: bodyToks(...node.outcomes.map(o => `${o.label} ${o.meaning}`)),
        // Deliberately empty. A node's question is a CHECK — «هل يدور المحرك
        // بحرية؟» — not a declaration that something is broken, and feeding it
        // into the symptom surface made «كيف أغير اتجاه المحرك» score a
        // thrown-propeller check above the setting that changes direction. The
        // TREE declares the symptom; the node asks about it.
        symptomTokens: [],
        reviewedAt: tree.lastReviewed,
      });
    }
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
      symptomTokens: symptomToks(undefined, l.commonMistake),
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
      symptomTokens: [],
      reviewedAt: entry.page?.reviewedAt,
      version: entry.page?.firmwareVersionRange,
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
          symptomTokens: [],
          reviewedAt: f.source.reviewedAt,
        });
      }
    }
  }

  // The build archetypes.
  //
  // «أريد بناء درون سينمائي» named a real thing in this platform — the
  // `cinematic` build type, with its own frame size, voltages and description —
  // and the only way to reach it was to already be inside the build flow. Four
  // words of a beginner's first question, answerable, and unsearchable.
  for (const t of droneTypes) {
    docs.push({
      key: `drone-type:${t.id}`,
      type: 'drone-type',
      sourceId: t.id,
      titleAr: t.primaryName,
      titleEn: t.nameEn,
      subtitle: t.description,
      route: '/assembly',
      contentClass: 'learning',
      exactNames: names(t.primaryName, t.nameEn, t.id),
      titleTokens: toks(t.primaryName, t.nameEn, t.id),
      keywordTokens: toks(t.description),
      bodyTokens: [],
      symptomTokens: [],
    });
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
      symptomTokens: [],
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
      symptomTokens: [],
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
      symptomTokens: [],
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
      // The exact step, not the guide: a search result that lands on step 1 of 25
      // when the reader asked about flashing is a result they have to search again.
      route: resolveDestination({ kind: 'elrs-setup', id: s.id }) ?? '/programming/expresslrs/setup',
      contentClass: 'learning',
      software: 'expresslrs',
      system: 'radio-control',
      titleTokens: toks(s.title),
      keywordTokens: toks('expresslrs', 'elrs', ...s.terminology.map(t => `${t.term}`)),
      bodyTokens: bodyToks(s.summary, s.goal, ...s.actions, ...s.expectedResult, ...s.commonMistakes),
      symptomTokens: symptomToks(s.bot),
      reviewedAt: s.reviewedAt,
      ...botFields(s.bot),
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
      // The exact issue, not the list of 33.
      route: resolveDestination({ kind: 'elrs-issue', id: i.id }) ?? '/programming/expresslrs/troubleshooting',
      contentClass: 'diagnostic',
      software: 'expresslrs',
      system: 'radio-control',
      titleTokens: toks(i.title, i.symptom),
      keywordTokens: toks(i.category, 'expresslrs', 'elrs'),
      bodyTokens: bodyToks(...i.likelyCauses, i.resolvedWhen, i.nextIfUnresolved),
      symptomTokens: symptomToks(i.bot, i.symptom, i.title),
      reviewedAt: i.reviewedAt,
      ...botFields(i.bot),
    });
  }

  // EdgeTX — topics, and every individual setting by its real English label.
  // The settings are indexed separately for the same reason Betaflight's fields
  // are: someone searching «Subtrim» wants the row, and landing them on a screen
  // of fourteen rows makes them search again.
  for (const p of allEdgeTxPages) {
    docs.push({
      key: `edgetx-topic:${p.id}`,
      type: 'edgetx-topic',
      sourceId: p.id,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      subtitle: p.summaryAr,
      route: resolveDestination({ kind: 'edgetx', id: p.id }) ?? '/programming/edgetx',
      contentClass: p.kind === 'problem' ? 'diagnostic' : 'reference',
      software: 'edgetx',
      system: 'radio-control',
      version: p.sources[0]?.version,
      titleTokens: toks(p.titleAr, p.titleEn),
      keywordTokens: toks(
        'edgetx', 'ايدجtx',
        ...(p.bot?.symptomsAr ?? []), ...(p.bot?.misspellingsAr ?? []),
      ),
      bodyTokens: bodyToks(
        p.summaryAr, p.whenNeededAr, p.whereAr,
        ...p.relationAr, ...p.commonMistakesAr, ...p.verifyAr, p.revertAr,
        ...p.manualRequiredAr, ...p.stepsAr.map(x => x.textAr),
      ),
      symptomTokens: symptomToks(p.bot, ...(p.troubleshootingAr ?? []).map(t => t.symptomAr)),
      reviewedAt: p.lastReviewed,
      ...botFields(p.bot),
    });

    for (const g of p.groups) {
      for (const st of g.settings) {
        docs.push({
          key: `edgetx-setting:${p.id}.${st.id}`,
          type: 'edgetx-setting',
          sourceId: `${p.id}.${st.id}`,
          titleAr: st.labelAr,
          titleEn: st.labelEn,
          subtitle: `${p.titleAr} › ${g.titleAr}`,
          route: `${resolveDestination({ kind: 'edgetx', id: p.id }) ?? '/programming/edgetx'}?topic=${encodeURIComponent(st.id)}`,
          contentClass: 'reference',
          software: 'edgetx',
          system: 'radio-control',
          titleTokens: toks(st.labelAr, st.labelEn),
          keywordTokens: toks('edgetx', p.titleAr, p.titleEn, g.titleAr),
          bodyTokens: bodyToks(st.whatAr, st.effectAr, st.whenAr, st.riskAr, st.verifyAr, st.revertAr),
          symptomTokens: [],
          reviewedAt: p.lastReviewed,
        });
      }
    }
  }

  // The video software centre.
  //
  // Indexed at page level only, with no per-setting split — unlike EdgeTX and
  // Betaflight, whose screens are grids of named fields a reader searches for
  // by name. These pages are procedures: their unit of usefulness is the whole
  // ordered sequence, and dropping someone into step 4 of a firmware update is
  // exactly the failure mode the safety ordering exists to prevent.
  //
  // `bot.symptomsAr` carries the real search surface here — «التحديث توقف»،
  // «الاداة لا ترى الجهاز» — which is what people type when something has
  // already gone wrong, and is nothing like the page's own title.
  for (const p of allVideoToolPages) {
    docs.push({
      key: `video-tool:${p.id}`,
      type: 'video-tool',
      sourceId: p.id,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      subtitle: p.summaryAr,
      route: resolveDestination({ kind: 'video', id: p.id }) ?? '/programming/video',
      contentClass: p.kind === 'problem' ? 'diagnostic' : 'reference',
      software: p.scope === 'betaflight' ? 'betaflight' : undefined,
      system: 'video',
      version: p.sources[0]?.version,
      titleTokens: toks(p.titleAr, p.titleEn),
      keywordTokens: toks(
        'video', 'فيديو',
        ...(p.bot?.symptomsAr ?? []), ...(p.bot?.misspellingsAr ?? []),
      ),
      bodyTokens: bodyToks(
        p.summaryAr, p.whenNeededAr, p.toolAr,
        ...p.prerequisitesAr, ...p.relationAr, ...p.commonMistakesAr,
        ...p.verifyAr, p.revertAr, ...p.versionNotesAr, ...p.manualRequiredAr,
        ...p.stepsAr.map(x => x.textAr),
      ),
      symptomTokens: symptomToks(p.bot),
      reviewedAt: p.lastReviewed,
      ...botFields(p.bot),
    });
  }

  // Programs the platform does NOT cover.
  //
  // Indexed deliberately, and this is the whole point of them: someone typing
  // «BLHeli» or «هل تدعمون INAV» currently gets results ABOUT those words from
  // articles that merely mention them, and has to read three pages to work out
  // that no, there is no coverage. A result that says «خارج التغطية» in its own
  // badge answers the question in the result list itself.
  //
  // The badge is why this is a distinct type rather than an article: a scope
  // page must never be mistaken for coverage, and its own type label is what
  // guarantees the reader sees the answer before the click.
  for (const sc of SOFTWARE_SCOPE) {
    docs.push({
      key: `software-scope:${sc.id}`,
      type: 'software-scope',
      sourceId: sc.id,
      titleAr: sc.titleAr,
      titleEn: sc.nameEn,
      subtitle: sc.whatItIsAr,
      route: `/programming/scope/${sc.id}`,
      contentClass: 'reference',
      titleTokens: toks(sc.nameEn, sc.titleAr),
      keywordTokens: toks(
        ...(sc.bot?.symptomsAr ?? []), ...(sc.bot?.misspellingsAr ?? []),
        ...(sc.bot?.software ?? []),
      ),
      bodyTokens: bodyToks(
        sc.whatItIsAr, sc.whoNeedsItAr, sc.whyAr, sc.goInsteadAr,
        ...sc.weHaveAr, ...sc.weDoNotHaveAr,
      ),
      symptomTokens: symptomToks(sc.bot),
      reviewedAt: sc.reviewedAt,
      ...botFields(sc.bot),
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
      symptomTokens: symptomToks(undefined, t.problem, ...t.symptoms),
    });
  }

  return docs;
}

/* ── Documents a SURFACE contributes ──────────────────────────────────────── */

/**
 * Sections that exist on one surface only, registered rather than imported.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * Two whole sections — المتجر and المشاريع — exist on the web and nowhere else.
 * A reader searching FPVARABIC expects to find a product and a project, so both
 * have to be in the index. But this file is compiled into the PHONE bundle, and
 * importing a 2,700-line catalogue and ten long project documents here would
 * ship both to an app that has no storefront and no project library.
 *
 * So the CONTRACT is shared and the CONTENT is not. `SearchDoc`, the ranking,
 * the Arabic normalisation and the synonym expansion stay in one place — there
 * is still exactly one search engine — and the web hands it the documents only
 * the web has. The phone registers nothing and its index is byte-identical to
 * what it was.
 *
 * WHY A PROVIDER AND NOT AN ARRAY
 * -------------------------------
 * Because the documents are derived from registries that are themselves lazily
 * built. A provider is called once, when the index is first needed, so
 * registering costs nothing until somebody searches.
 *
 * WHY REGISTRATION IS KEYED
 * -------------------------
 * A module registering itself twice — two imports, a hot reload, a server
 * component rendering twice — would otherwise double every product in the
 * results. The key makes registration idempotent, and re-registering under the
 * same key REPLACES rather than appends.
 */
export type SearchDocProvider = () => SearchDoc[];

const providers = new Map<string, SearchDocProvider>();

export function registerSearchDocs(sourceKey: string, provider: SearchDocProvider): void {
  const existing = providers.get(sourceKey);
  // Re-registering the identical function is the common case (a module
  // evaluated twice) and must not throw away a warm cache.
  if (existing === provider) return;
  providers.set(sourceKey, provider);
  cached = null;
}

/** Which surfaces have contributed. Used by the suite, not by app code. */
export function registeredDocSources(): string[] {
  return [...providers.keys()].sort();
}

/** Test-only: forget every contributed source. */
export function clearRegisteredDocs(): void {
  providers.clear();
  cached = null;
}

let cached: SearchDoc[] | null = null;

export function getSearchIndex(): SearchDoc[] {
  if (!cached) {
    const core = buildDocs();
    const extra: SearchDoc[] = [];
    for (const provide of providers.values()) extra.push(...provide());
    // A contributed document whose key collides with a core one would silently
    // shadow reviewed content. Core wins, and the collision is dropped rather
    // than merged — a duplicate key in a search index is a result that appears
    // twice with two different destinations.
    const coreKeys = new Set(core.map(d => d.key));
    cached = [...core, ...extra.filter(d => !coreKeys.has(d.key))];
  }
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
