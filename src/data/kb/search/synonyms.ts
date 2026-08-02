/**
 * Synonym / transliteration / abbreviation expansion.
 *
 * The real Arabic FPV vocabulary is trilingual in practice: the English term
 * ("Flight Controller"), its Arabic transliteration written in Arabic letters
 * ("فلايت كنترولر"), and a genuine Arabic translation ("متحكم الطيران") are all
 * used by the same person in the same sentence. On top of that, community
 * shorthand ("FC", "كنترول") is what actually gets typed into a search box.
 *
 * Every group below maps to one canonical token set. A query token matching ANY
 * member expands to the whole group, so all four spellings reach the same
 * content. Groups are stored normalized (see normalize.ts) at module load.
 */

import { normalizeText } from './normalize';

/**
 * Each entry is one concept. Order inside a group does not matter; the whole
 * group is the expansion. Multi-word members are matched as phrases too.
 */
const RAW_GROUPS: string[][] = [
  // ── Flight controller ──
  ['flight controller', 'fc', 'flightcontroller', 'متحكم الطيران', 'متحكم طيران', 'كنترولر', 'كونترولر',
   'فلايت كنترولر', 'فلايت كونترولر', 'فلايت كنترول', 'بورد', 'board', 'لوحة التحكم', 'اللوحة'],
  ['mcu', 'processor', 'معالج', 'المعالج', 'شريحة', 'chip'],
  ['gyro', 'gyroscope', 'جيرو', 'جيروسكوب', 'حساس الدوران'],
  ['accelerometer', 'accel', 'acc', 'مسرع', 'المسرع', 'حساس التسارع', 'اكسلرومتر'],
  ['barometer', 'baro', 'بارومتر', 'حساس الضغط', 'حساس الارتفاع'],
  ['magnetometer', 'mag', 'compass', 'بوصلة', 'كومباس', 'مغناطيسي'],
  ['blackbox', 'black box', 'بلاك بوكس', 'الصندوق الأسود', 'سجل الطيران', 'logging'],
  ['bootloader', 'dfu', 'بوت لودر', 'بوتلودر', 'وضع التحديث'],
  ['pinout', 'pin out', 'بين اوت', 'مخطط اللوحة', 'مخطط المنافذ', 'توزيع المنافذ'],
  ['aio', 'all in one', 'اول ان ون', 'اي اي او', 'لوحة مدمجة'],
  ['stack', 'ستاك', 'مجموعة', 'طقم اللوحات'],
  ['target', 'تارجت', 'هدف الفيرموير'],
  ['firmware', 'فيرموير', 'فيرمور', 'برنامج اللوحة', 'الفيرم'],

  // ── ESC & motors ──
  ['esc', 'electronic speed controller', 'اي اس سي', 'منظم السرعة', 'اسي', 'الاي اس سي'],
  ['motor', 'motors', 'محرك', 'محركات', 'موتور', 'موتورات'],
  ['kv', 'كي في', 'كيلوفولت'],
  ['stator', 'ستيتور', 'الجزء الثابت'],
  ['propeller', 'prop', 'props', 'مروحة', 'مراوح', 'بروب', 'بروبلر'],
  ['dshot', 'دي شوت', 'دشوت'],
  ['bidirectional dshot', 'bidir dshot', 'dshot ثنائي', 'دي شوت ثنائي'],
  ['rpm filter', 'rpm filtering', 'فلتر ار بي ام', 'فلترة الدوران'],
  ['blheli', 'بي ال هيلي', 'بلهيلي'],
  ['am32', 'اي ام 32'],

  // ── Power ──
  ['battery', 'batteries', 'بطارية', 'بطاريات', 'ليبو', 'lipo', 'li po'],
  ['voltage', 'volt', 'جهد', 'فولت', 'فولتية'],
  ['current', 'amp', 'ampere', 'تيار', 'امبير'],
  ['bec', 'ubec', 'بي اي سي', 'منظم جهد', 'ريجوليتر', 'regulator'],
  ['capacitor', 'cap', 'مكثف', 'كباستر', 'كابستور'],
  ['vbat', 'في بات', 'جهد البطارية'],
  ['ground', 'gnd', 'ارضي', 'الارضي', 'جراوند', 'قراوند'],
  ['current sensor', 'حساس التيار', 'مستشعر التيار'],
  ['smoke stopper', 'سموك ستوبر', 'حامي القصر'],
  ['multimeter', 'ملتيميتر', 'افوميتر', 'مقياس'],
  ['short circuit', 'short', 'قصر', 'قصر كهربائي', 'شورت'],

  // ── Radio ──
  ['receiver', 'rx', 'مستقبل', 'ريسيفر', 'الريسيفر'],
  ['transmitter', 'tx', 'radio', 'جهاز الارسال', 'الريموت', 'راديو', 'الجهاز'],
  ['expresslrs', 'elrs', 'اكسبرس ال ار اس', 'اليكسبرس', 'ايلارس'],
  ['crossfire', 'tbs crossfire', 'كروسفاير'],
  ['crsf', 'سي ار اس اف'],
  ['sbus', 'اس باص', 'اس بص'],
  ['binding', 'bind', 'ربط', 'باندنق', 'بايند'],
  ['failsafe', 'فيل سيف', 'فيلسيف', 'الحماية عند فقدان الاشارة'],
  ['telemetry', 'تليمتري', 'تلمتري', 'بيانات العودة'],
  ['link quality', 'lq', 'جودة الاتصال'],
  ['rssi', 'ار اس اس اي', 'قوة الاشارة'],

  // ── Video ──
  ['vtx', 'video transmitter', 'في تي اكس', 'مرسل الفيديو', 'مرسل فيديو'],
  ['camera', 'cam', 'كاميرا', 'الكاميرا'],
  ['goggles', 'نظارة', 'النظارات', 'نظارات', 'قوقلز'],
  ['osd', 'او اس دي', 'العرض على الشاشة'],
  ['smartaudio', 'smart audio', 'سمارت اوديو'],
  ['msp displayport', 'displayport', 'ديسبلاي بورت'],
  ['antenna', 'هوائي', 'انتينا', 'الهوائي'],
  ['analog', 'انالوق', 'تناظري'],
  ['digital', 'ديجيتال', 'رقمي'],

  // ── Navigation ──
  ['gps', 'جي بي اس', 'جيبياس', 'تحديد المواقع'],
  ['gps rescue', 'rth', 'return to home', 'العودة للمنزل', 'العوده التلقائية'],
  ['satellites', 'sats', 'اقمار', 'الاقمار'],

  // ── Ports & buses ──
  ['uart', 'يو ارت', 'يوارت', 'منفذ تسلسلي', 'المنافذ'],
  ['i2c', 'اي تو سي', 'اي 2 سي'],
  ['spi', 'اس بي اي'],
  ['usb', 'يو اس بي'],
  ['softserial', 'soft serial', 'سوفت سيريال'],

  // ── Software ──
  ['betaflight', 'bf', 'بيتافلايت', 'بيتا فلايت', 'بتافلايت'],
  ['inav', 'اي ناف', 'اينااف'],
  ['ardupilot', 'اردو بايلوت', 'اردوبايلوت'],
  ['configurator', 'كونفيقريتر', 'كونفيجريتر', 'برنامج الاعداد'],
  ['cli', 'سي ال اي', 'سطر الاوامر'],
  ['edgetx', 'opentx', 'ايدج تي اكس', 'ادجtx'],

  // ── Frame & build ──
  ['frame', 'فريم', 'الهيكل', 'هيكل'],
  ['soldering', 'solder', 'لحام', 'اللحام', 'كاوية'],
  ['arm', 'arming', 'تسليح', 'ارم', 'التسليح'],
  ['propwash', 'prop wash', 'بروب واش'],
  ['vibration', 'اهتزاز', 'الاهتزاز', 'رجة'],

  // ── Tuning ──
  ['pid', 'بي اي دي', 'بيد'],
  ['rates', 'ريتس', 'معدلات'],
  ['filter', 'filters', 'فلتر', 'فلاتر', 'مرشح'],
];

export interface SynonymTable {
  /** normalized token/phrase → canonical group id (index into `groups`). */
  lookup: Map<string, number>;
  /** group id → all normalized members. */
  groups: string[][];
}

function buildTable(): SynonymTable {
  const groups: string[][] = [];
  const lookup = new Map<string, number>();
  for (const raw of RAW_GROUPS) {
    const members = Array.from(new Set(raw.map(normalizeText).filter(Boolean)));
    if (members.length === 0) continue;
    const gid = groups.length;
    groups.push(members);
    for (const m of members) {
      // First writer wins: a token that legitimately belongs to two groups
      // (rare, e.g. 'mag') keeps its first, most specific assignment.
      if (!lookup.has(m)) lookup.set(m, gid);
    }
  }
  return { lookup, groups };
}

export const synonymTable: SynonymTable = buildTable();

/**
 * Expands one normalized token (or multi-word phrase) into its full synonym
 * group. Returns `[token]` unchanged when the token is not in any group.
 */
export function expandToken(normalizedToken: string): string[] {
  const gid = synonymTable.lookup.get(normalizedToken);
  if (gid === undefined) return [normalizedToken];
  return synonymTable.groups[gid];
}

/**
 * Expands a whole normalized query. Multi-word synonym phrases are detected
 * first (longest match, up to 3 words) so "فلايت كنترولر" is treated as one
 * concept instead of two unrelated tokens.
 */
export function expandQueryTokens(tokens: string[]): { expanded: Set<string>; groupIds: Set<number> } {
  const expanded = new Set<string>();
  const groupIds = new Set<number>();
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let span = Math.min(3, tokens.length - i); span >= 1; span--) {
      const phrase = tokens.slice(i, i + span).join(' ');
      const gid = synonymTable.lookup.get(phrase);
      if (gid !== undefined) {
        groupIds.add(gid);
        for (const m of synonymTable.groups[gid]) expanded.add(m);
        expanded.add(phrase);
        i += span;
        matched = true;
        break;
      }
    }
    if (!matched) {
      expanded.add(tokens[i]);
      i += 1;
    }
  }
  return { expanded, groupIds };
}
