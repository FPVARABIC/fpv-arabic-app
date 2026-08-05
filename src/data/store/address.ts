import { COUNTRY_NAME_AR, type CountryCode } from './shipping';

/**
 * A shipping address, structured.
 *
 * WHY THE STREET AND THE HOUSE NUMBER ARE SEPARATE FIELDS
 * -------------------------------------------------------
 * Because in the Netherlands, Belgium and Germany the house number is a
 * distinct field that carriers match on, and an address typed as one line is
 * routinely rejected or delivered late. One free-text box is easier to build
 * and is why parcels come back.
 *
 * WHY VALIDATION IS PER COUNTRY, PERMISSIVELY
 * -------------------------------------------
 * The brief was explicit: «من دون افتراض أن جميع الدول تستخدم الصيغة الهولندية
 * نفسها». A Dutch postcode is `1234 AB`; a German one is five digits; an Irish
 * Eircode is neither. So each country the shop ships to gets its own pattern
 * where the format is genuinely fixed, and everything else gets a length check
 * only.
 *
 * The bias is deliberately toward ACCEPTING. A regex that rejects a real
 * address loses a sale and cannot be argued with; a loose one costs a
 * clarifying message. Where a pattern is not certain, there is no pattern.
 *
 * WHAT IS DELIBERATELY NOT COLLECTED
 * ----------------------------------
 * No date of birth, no company registration, no second phone, no «how did you
 * hear about us». A shop holds what it needs to deliver a parcel and answer a
 * question about it. Everything else is a liability it chose to take on.
 */

export interface ShippingAddress {
  fullName: string;
  /** From the account, never typed. See `emailFromAccount`. */
  email: string;
  phone: string;
  country: CountryCode;
  postalCode: string;
  city: string;
  street: string;
  houseNumber: string;
  /** Flat, floor, «bis» — optional everywhere. */
  addition?: string;
  /** The customer's own words for the courier. */
  notes?: string;
}

export type AddressField = keyof ShippingAddress;

export interface AddressError {
  field: AddressField;
  messageAr: string;
}

/**
 * Postcode shapes, only where they are genuinely fixed.
 *
 * A country absent from this table is length-checked and accepted. That is the
 * safe direction: an unknown-but-valid postcode reaching a human beats a valid
 * postcode rejected by a pattern somebody guessed.
 */
const POSTCODE_PATTERNS: Record<CountryCode, { re: RegExp; exampleAr: string }> = {
  NL: { re: /^\d{4}\s?[A-Za-z]{2}$/, exampleAr: '1234 AB' },
  BE: { re: /^\d{4}$/, exampleAr: '1000' },
  DE: { re: /^\d{5}$/, exampleAr: '10115' },
  FR: { re: /^\d{5}$/, exampleAr: '75001' },
  ES: { re: /^\d{5}$/, exampleAr: '28001' },
  IT: { re: /^\d{5}$/, exampleAr: '00100' },
  AT: { re: /^\d{4}$/, exampleAr: '1010' },
  PT: { re: /^\d{4}-\d{3}$/, exampleAr: '1000-001' },
  PL: { re: /^\d{2}-\d{3}$/, exampleAr: '00-001' },
  SE: { re: /^\d{3}\s?\d{2}$/, exampleAr: '111 20' },
  DK: { re: /^\d{4}$/, exampleAr: '1050' },
  FI: { re: /^\d{5}$/, exampleAr: '00100' },
  CZ: { re: /^\d{3}\s?\d{2}$/, exampleAr: '110 00' },
  SK: { re: /^\d{3}\s?\d{2}$/, exampleAr: '811 01' },
  HU: { re: /^\d{4}$/, exampleAr: '1011' },
  GR: { re: /^\d{3}\s?\d{2}$/, exampleAr: '104 31' },
  SI: { re: /^\d{4}$/, exampleAr: '1000' },
  HR: { re: /^\d{5}$/, exampleAr: '10000' },
  BG: { re: /^\d{4}$/, exampleAr: '1000' },
  RO: { re: /^\d{6}$/, exampleAr: '010011' },
  LT: { re: /^(LT-)?\d{5}$/, exampleAr: '01100' },
  LV: { re: /^(LV-)?\d{4}$/, exampleAr: 'LV-1010' },
  EE: { re: /^\d{5}$/, exampleAr: '10111' },
  LU: { re: /^(L-)?\d{4}$/, exampleAr: '1009' },
  CY: { re: /^\d{4}$/, exampleAr: '1010' },
  MT: { re: /^[A-Za-z]{3}\s?\d{4}$/, exampleAr: 'VLT 1117' },
  // Ireland's Eircode is deliberately absent: its shape is real but unusual,
  // and rejecting a correct one is worse than accepting a typo.
};

const trim = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '';

/**
 * Validate and normalise, returning EVERY problem rather than the first.
 *
 * A form that reveals one error per submission makes somebody submit five
 * times to learn five things the server knew at once.
 */
export function validateAddress(
  raw: Partial<Record<AddressField, unknown>>,
  opts: { shippableCountries?: CountryCode[] } = {},
): { ok: true; value: ShippingAddress } | { ok: false; errors: AddressError[] } {
  const errors: AddressError[] = [];

  const fullName = trim(raw.fullName, 120);
  const email = trim(raw.email, 200).toLowerCase();
  const phone = trim(raw.phone, 32);
  const country = trim(raw.country, 2).toUpperCase();
  const postalCode = trim(raw.postalCode, 16).toUpperCase();
  const city = trim(raw.city, 80);
  const street = trim(raw.street, 160);
  const houseNumber = trim(raw.houseNumber, 20);
  const addition = trim(raw.addition, 60);
  const notes = trim(raw.notes, 600);

  if (fullName.length < 3) {
    errors.push({ field: 'fullName', messageAr: 'اكتب اسمك كاملاً كما يظهر على الطرد.' });
  }

  // A shape check, not a deliverability check. Only sending mail proves that.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.push({ field: 'email', messageAr: 'بريد إلكتروني غير صالح.' });
  }

  if ((phone.match(/\d/g) ?? []).length < 7) {
    errors.push({ field: 'phone', messageAr: 'اكتب رقم هاتف صحيحاً — يحتاجه الناقل عند التسليم.' });
  }

  if (!/^[A-Z]{2}$/.test(country)) {
    errors.push({ field: 'country', messageAr: 'اختر بلد الشحن.' });
  } else if (opts.shippableCountries && !opts.shippableCountries.includes(country)) {
    errors.push({
      field: 'country',
      messageAr: `لا نشحن إلى ${COUNTRY_NAME_AR[country] ?? country} حالياً.`,
    });
  }

  const pattern = POSTCODE_PATTERNS[country];
  if (!postalCode) {
    errors.push({ field: 'postalCode', messageAr: 'اكتب الرمز البريدي.' });
  } else if (pattern && !pattern.re.test(postalCode)) {
    errors.push({
      field: 'postalCode',
      messageAr: `الرمز البريدي لا يطابق صيغة ${COUNTRY_NAME_AR[country] ?? country} — مثال: ${pattern.exampleAr}`,
    });
  }

  if (city.length < 2) errors.push({ field: 'city', messageAr: 'اكتب المدينة.' });
  if (street.length < 2) errors.push({ field: 'street', messageAr: 'اكتب اسم الشارع.' });
  if (!houseNumber) {
    errors.push({ field: 'houseNumber', messageAr: 'اكتب رقم المنزل — بدونه لا يصل الطرد.' });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fullName, email, phone, country, postalCode, city, street, houseNumber,
      ...(addition ? { addition } : {}),
      ...(notes ? { notes } : {}),
    },
  };
}

/** One line, for a label or an admin table. */
export function formatAddress(a: ShippingAddress): string {
  const house = a.addition ? `${a.houseNumber} ${a.addition}` : a.houseNumber;
  return `${a.street} ${house}, ${a.postalCode} ${a.city}, ${COUNTRY_NAME_AR[a.country] ?? a.country}`;
}
