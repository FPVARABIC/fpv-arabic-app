import type { KnowledgeEntry } from './types';
import { allKnowledgeEntries } from './chapters';
import {
  safetyKeywords,
  synonymGroups,
  intentKeywords,
  criticalSafetyTerms,
  stopwords,
  domainKeywords,
  mentorPhrases,
  clarificationMenus,
  correctionTriggers,
  correctionMessages,
  outOfDomainMessage,
  advancedTerms,
  followUpQuestions,
} from './botKnowledgeRules';

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  score: number;
}

export interface KnowledgeBotAnswer {
  answer: string;
  steps: string[];
  safetyNote?: string;
  sources: { id: string; title: string; chapter: string }[];
  confidence: 'high' | 'medium' | 'low';
  matchedCategories?: string[];
}

// ── Text normalization ──────────────────────────────────────────────────────

export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[ً-ٟ]/g, '')   // strip Arabic tashkeel/diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[؟?!.,،؛;:]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeField(text: string): string {
  return normalizeQuery(text);
}

// ── Synonym expansion ───────────────────────────────────────────────────────

function expandQueryTerms(normalized: string): string[] {
  const terms = new Set<string>([normalized]);
  for (const group of Object.values(synonymGroups)) {
    const normalizedGroup = group.map(t => normalizeQuery(t));
    const hit = normalizedGroup.some(t => normalized.includes(t));
    if (hit) {
      normalizedGroup.forEach(t => terms.add(t));
    }
  }
  return Array.from(terms);
}

// ── Scoring ─────────────────────────────────────────────────────────────────

function scoreEntry(entry: KnowledgeEntry, terms: string[]): number {
  let score = 0;
  const title = normalizeField(entry.title);
  const summary = normalizeField(entry.summary);
  const body = normalizeField(entry.body);
  const category = normalizeField(entry.category);
  const tags = entry.tags.map(t => normalizeField(t));
  const section = normalizeField(entry.section ?? '');

  for (const term of terms) {
    if (!term || term.length < 2) continue;

    // Title — highest weight
    if (title.includes(term)) score += 10;
    // Tags — high weight (require tag.length>=2 to block single-char false matches like 'p','q','r')
    if (tags.some(tag => tag.length >= 2 && (tag.includes(term) || term.includes(tag)))) score += 8;
    // Summary — medium weight
    if (summary.includes(term)) score += 5;
    // Section
    if (section.includes(term)) score += 4;
    // Category
    if (category.includes(term)) score += 3;
    // Body — lower weight but still counts
    if (body.includes(term)) score += 2;

    // Exact phrase bonus in title
    if (title === term) score += 5;
    // Exact tag bonus
    if (tags.includes(term)) score += 3;
  }

  // Safety entry bonus when query touches safety topics
  const safetyNorm = safetyKeywords.map(k => normalizeQuery(k));
  if (
    entry.safetyRisk !== 'none' &&
    terms.some(t => safetyNorm.some(sk => t.includes(sk) || sk.includes(t)))
  ) {
    score += 4;
  }

  // Critical safety bonus
  if (entry.safetyRisk === 'critical' || entry.safetyRisk === 'high') {
    if (terms.some(t => criticalSafetyTerms.map(c => normalizeQuery(c)).some(c => t.includes(c) || c.includes(t)))) {
      score += 6;
    }
  }

  return score;
}

// ── Core search ─────────────────────────────────────────────────────────────

export function searchKnowledge(query: string, limit = 3): KnowledgeSearchResult[] {
  const normalized = normalizeQuery(query);
  const terms = expandQueryTerms(normalized);

  // Add individual words, filtering stopwords to prevent false-positive matches
  const meaningfulWords = normalized.split(' ').filter(w => w.length >= 2 && !stopwords.has(w));
  const hasExpansion = terms.length > 1;
  if (meaningfulWords.length === 0 && !hasExpansion) return [];
  const allTerms = Array.from(new Set([...terms, ...meaningfulWords]));

  const scored: KnowledgeSearchResult[] = allKnowledgeEntries
    .map(entry => ({ entry, score: scoreEntry(entry, allTerms) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

// ── Domain guard ─────────────────────────────────────────────────────────────

const _normalizedDomainKeywords = domainKeywords.map(k => normalizeQuery(k));
const _normalizedAdvancedTerms = advancedTerms.map(t => normalizeQuery(t));

function isDomainQuery(normalized: string): boolean {
  return _normalizedDomainKeywords.some(k => k.length >= 2 && (normalized.includes(k) || k.includes(normalized.slice(0, 6))));
}

// Returns true when query is about filter cutoff frequency, not drone components.
function isFilterCutoffQuery(normalized: string): boolean {
  const cutoffTerms = [
    'تردد', 'فلتر', 'filter', 'cutoff', 'frequency', 'hz', 'd-term',
    'gyro filter', 'notch', 'biquad',
  ].map(t => normalizeQuery(t));
  return cutoffTerms.some(t => normalized.includes(t));
}

// ── Intent detection ─────────────────────────────────────────────────────────

type IntentKey = keyof typeof intentKeywords;

function detectIntent(normalized: string): IntentKey | null {
  // Priority order matters — more specific intents first
  const priorityOrder: IntentKey[] = [
    'beginner_start', 'build_guidance', 'betaflight_setup',
    'wiring_uart', 'battery_power', 'motors_props',
    'safety', 'component_selection', 'troubleshooting',
    'definition', 'vague_problem', 'setup',
  ];
  for (const intent of priorityOrder) {
    const keywords = intentKeywords[intent] ?? [];
    if (keywords.map(k => normalizeQuery(k)).some(k => normalized.includes(k))) {
      return intent;
    }
  }
  return null;
}

// ── Safety note builder ──────────────────────────────────────────────────────

function buildSafetyNote(normalized: string, results: KnowledgeSearchResult[]): string | undefined {
  const notes: string[] = [];

  const hasMotorTest =
    (normalized.includes('اختبار') || normalized.includes('تشغيل') || normalized.includes('motor') || normalized.includes('motors tab')) &&
    (normalized.includes('محرك') || normalized.includes('motor') || normalized.includes('موتور'));
  const hasPropsOn =
    normalized.includes('مراوح مركب') || normalized.includes('props on') || normalized.includes('مروح');
  if (hasMotorTest || hasPropsOn) {
    notes.push('لا تختبر المحركات والمراوح مركبة. أزل المراوح أولاً.');
  }

  const hasFirstPower =
    normalized.includes('أول تشغيل') || normalized.includes('أول توصيل') ||
    normalized.includes('smoke') || normalized.includes('smoker') || normalized.includes('سموك') ||
    (normalized.includes('بطاريه') || normalized.includes('بطاري')) && normalized.includes('أول') ||
    normalized.includes('esc') && (normalized.includes('لحام') || normalized.includes('جديد'));
  if (hasFirstPower) {
    notes.push('استخدم Smoke Stopper عند أول تشغيل بعد اللحام أو تعديل الأسلاك.');
  }

  const hasFailsafe =
    normalized.includes('failsafe') || normalized.includes('فيل سيف') ||
    normalized.includes('فقدان') || normalized.includes('signal');
  if (hasFailsafe) {
    notes.push('اختبر Failsafe بدون مراوح قبل الطيران.');
  }

  const hasBothTxRx = normalized.includes('tx') && normalized.includes('rx');
  const hasUart =
    hasBothTxRx ||
    (
      (normalized.includes('tx') || normalized.includes('rx')) &&
      (
        normalized.includes('توصيل') || normalized.includes('اتصال') ||
        normalized.includes('uart') || normalized.includes('serial') ||
        normalized.includes('اوصل') || normalized.includes('وصل') ||
        normalized.includes('اربط') || normalized.includes('ربط')
      )
    );
  if (hasUart) {
    notes.push('قاعدة UART: TX من طرف يذهب إلى RX في الطرف الآخر، وليس TX إلى TX.');
  }

  // Add safety note from matched entries if they carry one
  for (const r of results) {
    if (r.entry.safetyNote && !notes.includes(r.entry.safetyNote)) {
      notes.push(r.entry.safetyNote);
      break; // one entry safety note is enough
    }
  }

  return notes.length > 0 ? notes.join(' | ') : undefined;
}

// ── Correction detection ─────────────────────────────────────────────────────

function detectCorrection(normalized: string): string | null {
  for (const trigger of correctionTriggers) {
    const normPhrases = trigger.anyPhrase.map(p => normalizeQuery(p));
    if (normPhrases.some(p => normalized.includes(p))) {
      return trigger.key;
    }
  }
  return null;
}

// ── Specificity escape hatch ─────────────────────────────────────────────────
// When beginner/build intent fires but query also contains a specific component
// + problem indicator, route to normal KB search instead of beginner overview.

const _specificComponentTerms = [
  'محرك', 'motor', 'esc', 'بطاري', 'ريسيفر', 'receiver', 'fc', 'مروح', 'prop', 'uart', 'vbat', 'pid', 'vtx',
].map(t => normalizeQuery(t));

const _problemIndicators = [
  'لا يعمل', 'لا يدور', 'يسخن', 'مشكله', 'error', 'خطا', 'لم يعمل', 'ما يشتغل', 'ينقلب', 'يرتجف',
].map(t => normalizeQuery(t));

function hasSpecificProblem(normalized: string): boolean {
  const hasComponent = _specificComponentTerms.some(t => normalized.includes(t));
  const hasProblem = _problemIndicators.some(t => normalized.includes(t));
  return hasComponent && hasProblem;
}

// ── Response formatters ─────────────────────────────────────────────────────

function buildBeginnerResponse(results: KnowledgeSearchResult[], normalized: string): KnowledgeBotAnswer {
  const safetyNote = buildSafetyNote(normalized, results);
  const sources = results.map(r => ({ id: r.entry.id, title: r.entry.title, chapter: r.entry.chapter }));
  const steps: string[] = [];

  for (const r of results) {
    if (steps.length >= 5) break;
    const lines = r.entry.body
      .split(/[.\n]/)
      .map(l => l.trim())
      .filter(l => l.length > 10);
    steps.push(...lines.slice(0, 2));
  }

  steps.push(mentorPhrases.beginner_followup);

  return {
    answer: mentorPhrases.beginner_intro,
    steps: steps.filter(s => s.length > 0).slice(0, 6),
    safetyNote,
    sources,
    confidence: 'high',
  };
}

function buildBetaflightBroadResponse(results: KnowledgeSearchResult[], normalized: string): KnowledgeBotAnswer {
  const safetyNote = buildSafetyNote(normalized, results);
  const sources = results.map(r => ({ id: r.entry.id, title: r.entry.title, chapter: r.entry.chapter }));
  const steps: string[] = [];

  for (const r of results) {
    if (steps.length >= 5) break;
    if (r.entry.summary) steps.push(r.entry.summary);
  }

  steps.push(mentorPhrases.betaflight_broad_followup);

  return {
    answer: mentorPhrases.betaflight_broad_intro,
    steps: steps.filter(s => s.length > 0).slice(0, 6),
    safetyNote,
    sources,
    confidence: 'high',
  };
}

function buildVagueProblemResponse(): KnowledgeBotAnswer {
  return {
    answer: 'وصف المشكلة بشكل أدق يساعدني أجاوبك بشكل صحيح. أخبرني:',
    steps: clarificationMenus.vague_problem,
    sources: [],
    confidence: 'medium',
  };
}

function buildOutOfDomainResponse(): KnowledgeBotAnswer {
  return {
    answer: outOfDomainMessage,
    steps: [],
    sources: [],
    confidence: 'low',
  };
}

function formatCorrectionStyle(
  correctionKey: string,
  results: KnowledgeSearchResult[],
): KnowledgeBotAnswer {
  const msg = correctionMessages[correctionKey];
  const sources = results.map(r => ({ id: r.entry.id, title: r.entry.title, chapter: r.entry.chapter }));
  const steps: string[] = [];

  for (const r of results) {
    if (steps.length >= 3) break;
    const lines = r.entry.body
      .split(/[.\n]/)
      .map(l => l.trim())
      .filter(l => l.length > 10);
    if (lines.length > 0) steps.push(lines[0]);
  }

  return {
    answer: msg.answer,
    steps,
    safetyNote: msg.safetyNote,
    sources,
    confidence: 'high',
  };
}

// ── K4.3 mode formatters ────────────────────────────────────────────────────

function formatConceptMode(results: KnowledgeSearchResult[], normalized: string): KnowledgeBotAnswer {
  if (results.length === 0) {
    return { answer: mentorPhrases.no_match, steps: [], sources: [], confidence: 'low' };
  }
  const topEntry = results[0].entry;
  const topScore = results[0].score;
  const safetyNote = buildSafetyNote(normalized, results);
  const sources = results.map(r => ({ id: r.entry.id, title: r.entry.title, chapter: r.entry.chapter }));
  const bodyLines = topEntry.body.split(/[.\n]/).map(l => l.trim()).filter(l => l.length > 10);
  const steps = [...bodyLines.slice(0, 4), followUpQuestions.concept_explanation];
  return {
    answer: topEntry.summary,
    steps: steps.filter(s => s.length > 0).slice(0, 5),
    safetyNote,
    sources,
    confidence: topScore >= 15 ? 'high' : topScore >= 7 ? 'medium' : 'low',
  };
}

function formatTroubleshootingMode(results: KnowledgeSearchResult[], normalized: string): KnowledgeBotAnswer {
  const safetyNote = buildSafetyNote(normalized, results);
  const sources = results.map(r => ({ id: r.entry.id, title: r.entry.title, chapter: r.entry.chapter }));
  const steps: string[] = [];
  for (const r of results) {
    if (steps.length >= 5) break;
    const bodyLines = r.entry.body.split(/[.\n]/).map(l => l.trim()).filter(l => l.length > 10);
    steps.push(...bodyLines.slice(0, 2));
  }
  const hasMotorContext =
    normalized.includes('محرك') || normalized.includes('motor') ||
    normalized.includes('موتور') || normalized.includes('مروح') || normalized.includes('prop');
  if (hasMotorContext) steps.push('تأكد أن المراوح مفكوكة قبل أي اختبار كهربائي.');
  steps.push(followUpQuestions.troubleshooting);
  const topScore = results.length > 0 ? results[0].score : 0;
  return {
    answer: mentorPhrases.troubleshoot_intro,
    steps: steps.filter(s => s.length > 0).slice(0, 7),
    safetyNote,
    sources,
    confidence: topScore >= 7 ? 'high' : 'medium',
  };
}

function formatGeneralGuidanceMode(results: KnowledgeSearchResult[], normalized: string): KnowledgeBotAnswer {
  if (results.length === 0) {
    return { answer: mentorPhrases.no_match, steps: [], sources: [], confidence: 'low' };
  }
  const topEntry = results[0].entry;
  const topScore = results[0].score;
  const safetyNote = buildSafetyNote(normalized, results);
  const sources = results.map(r => ({ id: r.entry.id, title: r.entry.title, chapter: r.entry.chapter }));
  const bodyLines = topEntry.body.split(/[.\n]/).map(l => l.trim()).filter(l => l.length > 10);
  const numbered = bodyLines.filter(l => /^\(?\d+\)?\s*[-–:]?/.test(l) || /^[١٢٣٤٥٦٧٨٩]/.test(l));
  const steps: string[] = numbered.length >= 2
    ? numbered.slice(0, 5).map(l => l.replace(/^\(?\d+\)?\s*[-–:.]?\s*/, '').trim())
    : bodyLines.slice(0, 4);
  if (results.length > 1) {
    const second = results[1].entry;
    if (second.summary && second.summary !== topEntry.summary) steps.push(`أيضاً — ${second.summary}`);
  }
  steps.push(followUpQuestions.general_guidance);
  return {
    answer: topEntry.summary,
    steps: steps.filter(s => s.length > 0).slice(0, 6),
    safetyNote,
    sources,
    confidence: topScore >= 15 ? 'high' : topScore >= 7 ? 'medium' : 'low',
  };
}

function formatAdvancedMode(results: KnowledgeSearchResult[], normalized: string): KnowledgeBotAnswer {
  if (results.length === 0) {
    return { answer: mentorPhrases.no_match, steps: [], sources: [], confidence: 'low' };
  }
  const topEntry = results[0].entry;
  const topScore = results[0].score;
  const safetyNote = buildSafetyNote(normalized, results);
  const sources = results.map(r => ({ id: r.entry.id, title: r.entry.title, chapter: r.entry.chapter }));
  const bodyLines = topEntry.body.split(/[.\n]/).map(l => l.trim()).filter(l => l.length > 10);
  const steps: string[] = [...bodyLines.slice(0, 5)];
  if (results.length > 1) {
    const second = results[1].entry;
    if (second.summary && second.summary !== topEntry.summary) steps.push(`أيضاً — ${second.summary}`);
  }
  steps.push(followUpQuestions.advanced_technical);
  return {
    answer: topEntry.summary,
    steps: steps.filter(s => s.length > 0).slice(0, 6),
    safetyNote,
    sources,
    confidence: topScore >= 15 ? 'high' : topScore >= 7 ? 'medium' : 'low',
  };
}

// ── Answer builder ───────────────────────────────────────────────────────────

export function buildKnowledgeAnswer(query: string): KnowledgeBotAnswer {
  const normalized = normalizeQuery(query);

  // 1. Correction detection (highest priority, unchanged from K4.2)
  const correctionKey = detectCorrection(normalized);
  if (correctionKey) {
    return formatCorrectionStyle(correctionKey, searchKnowledge(query, 2));
  }

  const intent = detectIntent(normalized);

  // 2. Beginner broad / build guidance with specificity escape hatch
  if (intent === 'beginner_start' || intent === 'build_guidance') {
    if (!hasSpecificProblem(normalized)) {
      let results = searchKnowledge(query, 3);
      if (results.length < 2) {
        const supplement = searchKnowledge('بناء كواد', 3);
        const seen = new Set(results.map(r => r.entry.id));
        results = [...results, ...supplement.filter(r => !seen.has(r.entry.id))].slice(0, 3);
      }
      return intent === 'beginner_start'
        ? buildBeginnerResponse(results, normalized)
        : formatGeneralGuidanceMode(results, normalized);
    }
    // hasSpecificProblem → fall through to troubleshooting routing below
  }

  // 3. Broad Betaflight query (unchanged from K4.2)
  if (intent === 'betaflight_setup') {
    const betaflightNameNorm = new Set(
      ['betaflight', 'بيتافلايت', 'بتافلاي', 'بيتفلايت', 'بيدفلايت', 'bf', 'بيتا فلايت']
        .map(k => normalizeQuery(k))
    );
    const meaningfulNonBeta = normalized
      .split(' ')
      .filter(w => w.length >= 2 && !stopwords.has(w) && !betaflightNameNorm.has(w));
    if (meaningfulNonBeta.length === 0) {
      return buildBetaflightBroadResponse(searchKnowledge(query, 3), normalized);
    }
  }

  // 4. Vague/troubleshooting without domain context → clarification
  if (intent === 'troubleshooting' || intent === 'vague_problem') {
    if (!isDomainQuery(normalized)) return buildVagueProblemResponse();
  }

  // 5. Domain guard for null intent
  if (intent === null) {
    const probeResults = searchKnowledge(query, 1);
    if (probeResults.length === 0 && !isDomainQuery(normalized)) return buildOutOfDomainResponse();
  }

  // 6. KB search
  const results = searchKnowledge(query, 3);

  if (results.length === 0 || results[0].score < 3) {
    if (intent === 'vague_problem' || intent === 'troubleshooting') return buildVagueProblemResponse();
    if (isDomainQuery(normalized)) {
      return { answer: mentorPhrases.no_match, steps: [], sources: [], confidence: 'low' };
    }
    return buildOutOfDomainResponse();
  }

  const topScore = results[0].score;

  // Low-confidence troubleshooting/vague → clarification
  if ((intent === 'vague_problem' || intent === 'troubleshooting') && topScore < 7) {
    return buildVagueProblemResponse();
  }

  // 7. Mode-based routing (K4.3)
  const matchedCategories = [...new Set(results.map(r => r.entry.category))];
  const isAdvanced = _normalizedAdvancedTerms.some(t => normalized.includes(t));

  // "ما هو / ما هي / what is" → always concept mode, even for advanced topics
  const pureDefPhrases = ['ما هو', 'ما هي', 'what is', 'what are'].map(k => normalizeQuery(k));
  const isPureDefinition = pureDefPhrases.some(k => normalized.includes(k));

  // Troubleshooting signal words that bypass intent detection (e.g. betaflight_setup fires first)
  const troubleshootSignals = [
    'لا يعمل', 'لا تعمل', 'لا يحفظ', 'لا يدور', 'لا تدور',
    'ينقلب', 'يسخن', 'تسخن', 'لا يستجيب', 'لا يرد', 'لا يتصل', 'مشكله',
  ].map(t => normalizeQuery(t));
  const hasTroubleshootTerms = troubleshootSignals.some(t => normalized.includes(t));

  if (intent === 'definition' || isPureDefinition) {
    return { ...formatConceptMode(results, normalized), matchedCategories };
  }
  if (
    intent === 'troubleshooting' ||
    intent === 'motors_props' ||
    hasSpecificProblem(normalized) ||
    hasTroubleshootTerms
  ) {
    return { ...formatTroubleshootingMode(results, normalized), matchedCategories };
  }
  if (intent === 'component_selection' && !isFilterCutoffQuery(normalized)) {
    return { ...formatGeneralGuidanceMode(results, normalized), matchedCategories };
  }
  if (isAdvanced) {
    return { ...formatAdvancedMode(results, normalized), matchedCategories };
  }

  return { ...formatGeneralGuidanceMode(results, normalized), matchedCategories };
}
