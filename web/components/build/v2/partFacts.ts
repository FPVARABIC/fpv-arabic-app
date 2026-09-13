import type { BasePart } from '@core/data/assembly/types';
import { videoSystemOf } from '@core/data/assembly/recommendation/proposeBuild';

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
  /**
   * The spec key, EXACTLY as the catalogue spells it.
   *
   * Every key here is verified against real parts by
   * `scripts/testBuildV2Proposal.ts`. It has to be: a key that matches nothing
   * does not fail, it renders NOTHING, and a card with no rows looks like a
   * part we have no data for rather than a name we spelled wrong. Three of the
   * eight required categories shipped exactly that way — `currentA` for
   * `currentRatingA`, `uarts` for `uartCount`, `blades` for `bladeCount` —
   * and the suite stayed green because its only guard was a page-wide total.
   */
  key: string;
  labelAr: string;
  /** Rendered value, or undefined to drop the row entirely. */
  format?: (raw: unknown) => string | undefined;
  /**
   * Where to read it from, when it does not live in `specs`.
   *
   * The video ecosystem is the reason this exists. «DJI» / «Walksnail» /
   * «HDZero» / «Analog» is the single most important fact about an air unit —
   * it is what the owned-goggles question was ABOUT — and it is not a spec
   * key at all: it is `part.protocolOrSystem`, which the engine reads through
   * `videoSystemOf`. Copying that field name into a string here would be a
   * second spelling of a domain fact, which is the class of bug this whole
   * file just had. So the accessor is the engine's own.
   */
  from?: (part: BasePart) => unknown;
}

const inch = (raw: unknown) => (typeof raw === 'number' ? `${raw} إنش` : undefined);
const plain = (raw: unknown) =>
  (typeof raw === 'string' || typeof raw === 'number') && String(raw).trim() !== ''
    ? String(raw) : undefined;
const amps = (raw: unknown) => (typeof raw === 'number' ? `${raw}A` : undefined);

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
    { key: 'bladeCount', labelAr: 'عدد الشفرات', format: plain },
  ],
  /*
   * THE TWO NUMBERS THE MANUAL CHECK IS ABOUT.
   *
   * `current-headroom` asks the reader to weigh what the motor will pull
   * against what this ESC can take. The ESC half of that is documented, on
   * every ESC we stock — and it was on screen nowhere, because this list asked
   * for `currentA` and the catalogue writes `currentRatingA`. Burst is a
   * SEPARATE row and never merged into the continuous figure: they are
   * different promises, one sustained and one for a moment, and a card showing
   * «65A» without saying which one has answered the reader's question wrongly.
   */
  escs: [
    { key: 'currentRatingA', labelAr: 'التيار المستمر', format: amps },
    { key: 'burstCurrentRatingA', labelAr: 'تيار الذروة', format: amps },
    { key: 'firmware', labelAr: 'البرنامج الثابت', format: plain },
  ],
  /*
   * Mounting first, because it is the fact that decides whether the stack goes
   * together at all — `stack-mount` is the blocker that withdrew the racing
   * type from the whole product, and the card was silent about it.
   */
  flightControllers: [
    { key: 'mountingSizeMm', labelAr: 'نمط التثبيت', format: plain },
    { key: 'mcu', labelAr: 'المعالج', format: plain },
    { key: 'uartCount', labelAr: 'منافذ UART', format: plain },
  ],
  receivers: [
    { key: 'protocol', labelAr: 'المنظومة', format: plain },
    { key: 'frequencyGHz', labelAr: 'التردد', format: r => (typeof r === 'number' ? `${r} GHz` : undefined) },
  ],
  /*
   * `system` was never a key on any video unit. The ecosystem lives on the
   * part, and `videoSystemOf` is how the engine reads it — so that is how this
   * reads it too. `powerMw` was invented outright; nothing stocks it.
   */
  videoUnits: [
    { key: 'protocolOrSystem', labelAr: 'المنظومة', from: videoSystemOf, format: plain },
    { key: 'operatingVoltageRange', labelAr: 'مدى جهد التشغيل', format: plain },
  ],
  batteries: [
    { key: 'sCount', labelAr: 'عدد الخلايا', format: r => (typeof r === 'number' ? `${r}S` : undefined) },
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
    const value = (s.format ?? plain)(s.from ? s.from(part) : specs[s.key]);
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
