import type { BasePart } from '@core/data/assembly/types';

/**
 * THE TWO OR THREE THINGS WORTH SAYING ABOUT A PART — AND NOTHING ELSE
 * ===================================================================
 *
 * A `BasePart` carries id, tier, both names, brand, a price range, a spec bag
 * whose keys differ per category, compatibility tags, three prose fields, a
 * review date, a confidence label and quick tags. Rendering all of it produces
 * the database table this journey exists to replace.
 *
 * So each category names the handful of specs that actually mean something to
 * a beginner choosing it, in Arabic, and everything else stays out of the UI:
 *
 *   · no ids — `frame-aos5-evo-mid` is a database key, not information
 *   · no tier — the reader answered the budget question; repeating the answer
 *     back as a property of the part reads as a justification
 *   · no compatibility tags — those are the engine's inputs, not facts a
 *     reader acts on
 *   · nothing empty. A row reading «الوزن: —» is worse than no row.
 *
 * The English product name IS shown, because it is what a reader types into a
 * shop, and it is isolated LTR so Arabic punctuation cannot reorder it.
 */

interface SpecSpec {
  key: string;
  labelAr: string;
  /** Rendered value, or undefined to drop the row entirely. */
  format?: (raw: unknown) => string | undefined;
}

const inch = (raw: unknown) => (typeof raw === 'number' ? `${raw} إنش` : undefined);
const plain = (raw: unknown) =>
  (typeof raw === 'string' || typeof raw === 'number') && String(raw).trim() !== ''
    ? String(raw) : undefined;

/**
 * Curated per category. A category missing from this map shows no specs at
 * all, which is the right failure: an unreviewed category should stay silent
 * rather than dump its raw keys.
 */
const CATEGORY_SPECS: Record<string, readonly SpecSpec[]> = {
  frames: [
    { key: 'sizeInch', labelAr: 'مقاس الإطار', format: inch },
    { key: 'stackSizeMm', labelAr: 'مقاسات الستاك', format: plain },
  ],
  motors: [
    { key: 'statorSize', labelAr: 'حجم الستاتور', format: plain },
    { key: 'kv', labelAr: 'KV', format: plain },
  ],
  propellers: [
    { key: 'sizeInch', labelAr: 'قطر المروحة', format: inch },
    { key: 'blades', labelAr: 'عدد الشفرات', format: plain },
  ],
  escs: [
    { key: 'currentA', labelAr: 'التيار المستمر', format: r => (typeof r === 'number' ? `${r}A` : undefined) },
    { key: 'mountingMm', labelAr: 'نمط التثبيت', format: plain },
    { key: 'protocol', labelAr: 'البروتوكول', format: plain },
  ],
  flightControllers: [
    { key: 'mountingMm', labelAr: 'نمط التثبيت', format: plain },
    { key: 'gyro', labelAr: 'الجيروسكوب', format: plain },
    { key: 'uarts', labelAr: 'منافذ UART', format: plain },
  ],
  receivers: [
    { key: 'protocol', labelAr: 'المنظومة', format: plain },
    { key: 'antenna', labelAr: 'الهوائي', format: plain },
  ],
  videoUnits: [
    { key: 'system', labelAr: 'المنظومة', format: plain },
    { key: 'powerMw', labelAr: 'قدرة الإرسال', format: r => (typeof r === 'number' ? `${r}mW` : undefined) },
  ],
  batteries: [
    { key: 'cellCount', labelAr: 'عدد الخلايا', format: r => (typeof r === 'number' ? `${r}S` : undefined) },
    { key: 'capacityMah', labelAr: 'السعة', format: r => (typeof r === 'number' ? `${r}mAh` : undefined) },
    { key: 'cRating', labelAr: 'معدل C', format: plain },
  ],
};

export interface PartFact { labelAr: string; value: string; }

/** At most three, never an empty one, in the order the category declares. */
export function partFacts(category: string, part: BasePart): readonly PartFact[] {
  const specs = (part as unknown as { specs?: Record<string, unknown> }).specs ?? {};
  const out: PartFact[] = [];
  for (const s of CATEGORY_SPECS[category] ?? []) {
    const value = (s.format ?? plain)(specs[s.key]);
    if (value !== undefined && value !== '') out.push({ labelAr: s.labelAr, value });
    if (out.length === 3) break;
  }
  return out;
}

/**
 * The one curated sentence the catalogue already writes for a beginner.
 *
 * `quickTags.whyTag` is short and was authored for exactly this position.
 * `whyChoose` is a paragraph — it belongs behind a disclosure, not on a card.
 * Neither is invented here; if a part has no tag, the card simply has no line.
 */
export const partWhyTag = (part: BasePart): string | undefined =>
  part.quickTags?.whyTag?.trim() || undefined;

export const partNoteTag = (part: BasePart): string | undefined =>
  part.quickTags?.noteTag?.trim() || undefined;
