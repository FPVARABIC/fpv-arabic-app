import type { KnowledgeEntry } from './types';
import { allKnowledgeEntries } from './chapters';
import {
  safetyKeywords,
  synonymGroups,
  intentKeywords,
  criticalSafetyTerms,
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
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
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
    // Tags — high weight
    if (tags.some(tag => tag.includes(term) || term.includes(tag))) score += 8;
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

  // Also add individual words as terms
  const words = normalized.split(' ').filter(w => w.length >= 2);
  const allTerms = Array.from(new Set([...terms, ...words]));

  const scored: KnowledgeSearchResult[] = allKnowledgeEntries
    .map(entry => ({ entry, score: scoreEntry(entry, allTerms) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

// ── Intent detection ─────────────────────────────────────────────────────────

function detectIntent(normalized: string): keyof typeof intentKeywords | null {
  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    if (keywords.map(k => normalizeQuery(k)).some(k => normalized.includes(k))) {
      return intent as keyof typeof intentKeywords;
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

  const hasUart =
    (normalized.includes('tx') || normalized.includes('rx')) &&
    (normalized.includes('توصيل') || normalized.includes('اتصال') || normalized.includes('uart') || normalized.includes('serial'));
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

// ── Answer builder ───────────────────────────────────────────────────────────

export function buildKnowledgeAnswer(query: string): KnowledgeBotAnswer {
  const normalized = normalizeQuery(query);
  const results = searchKnowledge(query, 3);
  const intent = detectIntent(normalized);

  // No results
  if (results.length === 0 || results[0].score < 3) {
    return {
      answer: 'لا أجد إجابة مؤكدة في المرجع الحالي، لكن أستطيع مساعدتك بخطوات فحص آمنة إذا وصفت المشكلة أكثر.',
      steps: [],
      sources: [],
      confidence: 'low',
    };
  }

  const topEntry = results[0].entry;
  const topScore = results[0].score;
  const confidence: 'high' | 'medium' | 'low' =
    topScore >= 15 ? 'high' : topScore >= 7 ? 'medium' : 'low';

  const safetyNote = buildSafetyNote(normalized, results);
  const sources = results.map(r => ({
    id: r.entry.id,
    title: r.entry.title,
    chapter: r.entry.chapter,
  }));
  const matchedCategories = [...new Set(results.map(r => r.entry.category))];

  // Build answer text from the top entry
  let answer = '';
  let steps: string[] = [];

  if (confidence === 'high') {
    answer = topEntry.summary;

    // Extract steps from body: numbered lines or bullet points
    const bodyLines = topEntry.body
      .split(/[.\n]/)
      .map(l => l.trim())
      .filter(l => l.length > 10);

    // Try to pull numbered steps from the body
    const numbered = bodyLines.filter(l => /^\(?\d+\)?\s*[-–:]?/.test(l) || /^[١٢٣٤٥٦٧٨٩]/.test(l));
    if (numbered.length >= 2) {
      steps = numbered.slice(0, 5).map(l => l.replace(/^\(?\d+\)?\s*[-–:.]?\s*/, '').trim());
    } else {
      // Use first few meaningful sentences as steps
      steps = bodyLines.slice(0, 4);
    }

    // If multiple results, add insight from second entry
    if (results.length > 1) {
      const second = results[1].entry;
      if (second.summary && second.summary !== topEntry.summary) {
        steps.push(`أيضاً — ${second.summary}`);
      }
    }
  } else if (confidence === 'medium') {
    answer = `يبدو سؤالك متعلقاً بـ: ${topEntry.title}. هذا ما وجدته في المرجع:`;
    const bodyLines = topEntry.body
      .split(/[.\n]/)
      .map(l => l.trim())
      .filter(l => l.length > 10);
    steps = bodyLines.slice(0, 3);
    if (results.length > 1) {
      steps.push(`موضوع ذو صلة: ${results[1].entry.title}`);
    }
    steps.push('هل يمكنك توضيح المشكلة أكثر حتى أساعدك بشكل أدق؟');
  } else {
    answer = 'لا أجد إجابة مؤكدة في المرجع الحالي، لكن أستطيع مساعدتك بخطوات فحص آمنة إذا وصفت المشكلة أكثر.';
    steps = [];
  }

  // Override/enhance based on intent
  if (intent === 'troubleshooting' && confidence !== 'low') {
    if (!steps.some(s => s.includes('تحقق') || s.includes('افحص'))) {
      steps.unshift('ابدأ بالتحقق من التوصيلات الكهربائية والبرمجية.');
    }
  }

  return {
    answer,
    steps: steps.filter(s => s.length > 0),
    safetyNote,
    sources,
    confidence,
    matchedCategories,
  };
}
