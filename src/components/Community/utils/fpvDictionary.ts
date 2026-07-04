/*
 * Single source of truth for FPV terminology.
 * Designed to be shared by: Community Search, Arabic Expert,
 * Drone Builder, Lessons, future AI Assistant.
 * (Future consumers — do NOT wire them in now; V1 consumer is
 * Community Search only.)
 * Do not duplicate FPV vocabulary anywhere else.
 */

// V1 scope guard: term key, arabic, keywords, aliases — no definitions, no
// explanations. Adding richer fields later (definitions, difficulty level,
// related lessons, etc.) must be additive to each entry, never a refactor of
// this shape or of the one-term-declared-once rule below.
export const FPV_DICTIONARY = {
  motor: {
    arabic: 'محرك',
    keywords: ['motor', 'motors', 'محرك', 'محركات'],
    aliases: ['brushless motor'],
  },
  esc: {
    arabic: 'ESC',
    keywords: ['esc', 'escs'],
    aliases: ['electronic speed controller', 'electronic speed controllers'],
  },
  fc: {
    arabic: 'فلايت كنترولر',
    keywords: ['fc', 'flight controller'],
    aliases: ['flight controller board'],
  },
  receiver: {
    arabic: 'ريسيفر',
    keywords: ['receiver', 'rx', 'ريسيفر', 'مستقبل'],
    aliases: ['rc receiver'],
  },
  gps: {
    arabic: 'جي بي إس',
    keywords: ['gps'],
    aliases: ['global positioning system'],
  },
  uart: {
    arabic: 'يوارت',
    keywords: ['uart'],
    aliases: ['serial port'],
  },
  elrs: {
    arabic: 'إي إل آر إس',
    keywords: ['elrs'],
    aliases: ['expresslrs'],
  },
  osd: {
    arabic: 'أو إس دي',
    keywords: ['osd'],
    aliases: ['on screen display'],
  },
  failsafe: {
    arabic: 'فيلسيف',
    keywords: ['failsafe', 'fail-safe'],
    aliases: [],
  },
  capacitor: {
    arabic: 'مكثف',
    keywords: ['capacitor', 'cap', 'مكثف'],
    aliases: [],
  },
  'smoke-stopper': {
    arabic: 'مانع الدخان',
    keywords: ['smoke stopper', 'smoke-stopper'],
    aliases: ['smoke diverter'],
  },
  'dji-o4': {
    arabic: 'دي جي آي أو 4',
    keywords: ['dji o4', 'o4', 'dji'],
    aliases: ['dji o4 air unit'],
  },
  vtx: {
    arabic: 'في تي إكس',
    keywords: ['vtx'],
    aliases: ['video transmitter'],
  },
  betaflight: {
    arabic: 'بيتافلايت',
    keywords: ['betaflight'],
    aliases: [],
  },
  lipo: {
    arabic: 'ليبو',
    keywords: ['lipo', 'lipos', 'ليبو'],
    aliases: ['lithium polymer battery'],
  },
  '6s': {
    arabic: '6 إس',
    keywords: ['6s'],
    aliases: [],
  },
  '4s': {
    arabic: '4 إس',
    keywords: ['4s'],
    aliases: [],
  },
  propeller: {
    arabic: 'مروحة',
    keywords: ['propeller', 'prop', 'props', 'مروحة', 'مراوح'],
    aliases: [],
  },
  frame: {
    arabic: 'إطار',
    keywords: ['frame', 'إطار', 'فريم'],
    aliases: [],
  },
  soldering: {
    arabic: 'لحام',
    keywords: ['soldering', 'solder', 'لحام'],
    aliases: [],
  },
  kv: {
    arabic: 'كي في',
    keywords: ['kv'],
    aliases: ['motor kv rating'],
  },
} as const;

// TODO: Ahmed will extend vocabulary
