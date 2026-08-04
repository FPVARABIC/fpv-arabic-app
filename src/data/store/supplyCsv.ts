/**
 * The supply table as a spreadsheet, out and back in.
 *
 * WHY CSV
 * -------
 * Because the person filling this in is going to open it in Excel or Google
 * Sheets, paste a column of prices from a supplier's site, and send it back.
 * Any richer format is a format they have to be taught, and the teaching costs
 * more than the format saves. Every field here is a number, a date or a short
 * string; nothing needs nesting.
 *
 * WHY IT IS PARSED HERE AND NOT IN THE ACTION
 * -------------------------------------------
 * So it can be tested without a server, a session or a database — and so the
 * preview the operator sees and the write the server performs come out of the
 * SAME parse. A preview produced by different code from the write is a preview
 * that lies, and the whole point of a preview is that it does not.
 *
 * WHAT IT REFUSES
 * ---------------
 * Row by row, never the file. A spreadsheet with fifty good rows and two typos
 * should import forty-eight and tell you about two — refusing the lot means
 * finding the typos by bisection, which is how people give up and paste into
 * the panel one product at a time instead.
 */

import type { Availability } from './types';

/** The columns, in order. The header the template ships with. */
export const SUPPLY_CSV_COLUMNS = [
  'variantId',
  'productNameEn',
  'variantNameAr',
  'supplierId',
  'supplierUrl',
  'unitCost',
  'inboundShipping',
  'currency',
  'availability',
  'verified',
  'notesAr',
] as const;

export type SupplyCsvColumn = (typeof SUPPLY_CSV_COLUMNS)[number];

/**
 * Which columns the importer actually reads.
 *
 * `productNameEn` and `variantNameAr` are exported for the human — a
 * spreadsheet of bare ids is one nobody can fill in — and ignored on the way
 * back, because they are the catalogue's to change and not the operator's. An
 * import that renamed products from a spreadsheet would be an import that can
 * rewrite the shop.
 */
export const EDITABLE_COLUMNS: readonly SupplyCsvColumn[] = [
  'supplierId', 'supplierUrl', 'unitCost', 'inboundShipping',
  'currency', 'availability', 'verified', 'notesAr',
];

export interface SupplyCsvRow {
  variantId: string;
  productNameEn: string;
  variantNameAr: string;
  supplierId: string;
  supplierUrl: string;
  /** Major units as a person types them: «29.99». Never minor units. */
  unitCost: string;
  inboundShipping: string;
  currency: string;
  availability: string;
  verified: string;
  notesAr: string;
}

/** One line of CSV, with the quoting rules a spreadsheet expects. */
function cell(value: string): string {
  // A field containing a comma, a quote or a newline must be quoted, and inner
  // quotes doubled. Arabic notes contain commas constantly.
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: SupplyCsvRow[]): string {
  const lines = [SUPPLY_CSV_COLUMNS.join(',')];
  for (const r of rows) {
    lines.push(SUPPLY_CSV_COLUMNS.map(c => cell(r[c] ?? '')).join(','));
  }
  // A BOM, so Excel opens Arabic as UTF-8 instead of as mojibake. Without it
  // every note in the file becomes unreadable the moment somebody double-clicks
  // it on Windows, and they conclude the export is broken.
  return `﻿${lines.join('\r\n')}\r\n`;
}

/**
 * A CSV back into rows, tolerating what spreadsheets actually produce.
 *
 * Handles quoted fields, doubled quotes, CRLF and LF, a BOM, and trailing blank
 * lines. Does NOT handle a file whose header is missing or reordered — that is
 * refused whole, because a misaligned header silently writes supplier ids into
 * the cost column, and a bad price nobody notices is worse than a refusal.
 */
export function parseCsv(text: string): { rows: Record<string, string>[]; errorAr?: string } {
  const clean = text.replace(/^﻿/, '');
  const records = splitRecords(clean);
  if (records.length === 0) return { rows: [], errorAr: 'الملف فارغ.' };

  const header = records[0].map(h => h.trim());
  const missing = SUPPLY_CSV_COLUMNS.filter(c => !header.includes(c));
  if (missing.length > 0) {
    return {
      rows: [],
      errorAr: `الملف ينقصه أعمدة: ${missing.join('، ')}. نزّل القالب واملأه بدل تعديل الترويسة.`,
    };
  }

  const rows: Record<string, string>[] = [];
  for (const record of records.slice(1)) {
    if (record.every(v => v.trim() === '')) continue;
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = (record[i] ?? '').trim(); });
    rows.push(row);
  }
  return { rows };
}

/** A CSV document into records, character by character. */
function splitRecords(text: string): string[][] {
  const out: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { record.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { record.push(field); out.push(record); record = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || record.length > 0) { record.push(field); out.push(record); }
  return out;
}

/** What one row would do, decided before anything is written. */
export type RowVerdict =
  | { kind: 'apply'; variantId: string; unitCostMinor: number; inboundShippingMinor: number;
    supplierId: string; supplierUrl: string; availability: Availability; verified: boolean;
    notesAr: string }
  | { kind: 'skip'; variantId: string; reasonAr: string }
  | { kind: 'reject'; variantId: string; reasonAr: string };

export interface ValidationContext {
  /** Variant ids that exist. A row naming anything else is rejected. */
  knownVariantIds: Set<string>;
  knownSupplierIds: Set<string>;
}

/**
 * Every row judged, with nothing written.
 *
 * This IS the preview. The action calls it, shows the result, and then applies
 * exactly the rows it returned as `apply` — so what the operator approved and
 * what happens cannot differ.
 */
export function validateRows(
  rows: Record<string, string>[], ctx: ValidationContext,
): RowVerdict[] {
  const seen = new Set<string>();
  return rows.map(row => {
    const variantId = (row.variantId ?? '').trim();
    if (!variantId) return { kind: 'reject', variantId: '', reasonAr: 'لا معرّف خيار في هذا الصفّ.' };
    if (!ctx.knownVariantIds.has(variantId)) {
      return { kind: 'reject', variantId, reasonAr: 'لا يوجد خيار شراء بهذا المعرّف.' };
    }
    if (seen.has(variantId)) {
      // Two rows for one variant means the file disagrees with itself, and
      // last-wins would silently pick one.
      return { kind: 'reject', variantId, reasonAr: 'المعرّف مكرَّر في الملف.' };
    }
    seen.add(variantId);

    // A row with no cost is a row the operator has not got to yet. Skipping is
    // right: an import should never blank a price somebody already entered.
    if (!row.unitCost?.trim()) {
      return { kind: 'skip', variantId, reasonAr: 'بلا تكلفة — تُرك كما هو.' };
    }

    const unitCostMinor = toMinor(row.unitCost);
    if (unitCostMinor === null || unitCostMinor <= 0) {
      return { kind: 'reject', variantId, reasonAr: `تكلفة غير صالحة: «${row.unitCost}».` };
    }
    // Empty shipping means zero, because «no shipping line» and «free shipping»
    // are the same thing to a supplier, and demanding a 0 is busywork.
    const shippingRaw = row.inboundShipping?.trim() || '0';
    const inboundShippingMinor = toMinor(shippingRaw);
    if (inboundShippingMinor === null || inboundShippingMinor < 0) {
      return { kind: 'reject', variantId, reasonAr: `شحن غير صالح: «${shippingRaw}».` };
    }

    const supplierId = (row.supplierId ?? '').trim();
    if (!supplierId) return { kind: 'reject', variantId, reasonAr: 'لا مورد.' };
    if (!ctx.knownSupplierIds.has(supplierId)) {
      return { kind: 'reject', variantId, reasonAr: `مورد غير معروف: «${supplierId}».` };
    }

    const currency = (row.currency ?? '').trim().toUpperCase() || 'USD';
    if (currency !== 'USD') {
      return { kind: 'reject', variantId, reasonAr: 'العملة يجب أن تكون USD في هذه المرحلة.' };
    }

    const availability = (row.availability ?? '').trim() || 'in-stock';
    if (!isAvailability(availability)) {
      return { kind: 'reject', variantId, reasonAr: `حالة توفّر غير معروفة: «${availability}».` };
    }

    const url = (row.supplierUrl ?? '').trim();
    if (url && !/^https?:\/\//.test(url)) {
      return { kind: 'reject', variantId, reasonAr: 'رابط المورد يجب أن يبدأ بـ http أو https.' };
    }

    return {
      kind: 'apply',
      variantId,
      unitCostMinor,
      inboundShippingMinor,
      supplierId,
      supplierUrl: url.slice(0, 500),
      availability,
      // «Verified» means a person looked at the supplier's listing. A
      // spreadsheet cannot claim that on their behalf unless they typed it.
      verified: /^(1|true|yes|نعم|صح)$/i.test((row.verified ?? '').trim()),
      notesAr: (row.notesAr ?? '').trim().slice(0, 500),
    };
  });
}

/** «29.99» → 2999, refusing anything that is not a plain amount. */
function toMinor(major: string): number | null {
  // A spreadsheet cheerfully produces «$29.99», «29,99» and « 29.99 ». The
  // first two are refused rather than guessed at: «29,99» is twenty-nine in
  // some locales and two thousand nine hundred in others.
  const t = major.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

function isAvailability(v: string): v is Availability {
  return ['in-stock', 'limited', 'made-to-order', 'needs-confirmation',
    'out-of-stock', 'discontinued', 'coming-soon'].includes(v);
}
