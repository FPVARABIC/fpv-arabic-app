/**
 * Real source-structure assertions for the Programming hub
 * (src/views/ProgrammingView.tsx, src/App.tsx, src/components/BottomNavigation.tsx).
 *
 * There is no runtime "engine" here comparable to the lesson journey
 * architecture — the hub is a small static card list — so this script reads
 * the real source files on disk and asserts on their structure directly
 * (source-structure testing) rather than importing and executing React
 * component code. scripts/testProgrammingHubUI.ts proves the same behaviors
 * are actually wired up and interactive in a real browser.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const appTsx = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
const bottomNavTsx = readFileSync(join(ROOT, 'src/components/BottomNavigation.tsx'), 'utf8');
const programmingViewTsx = readFileSync(join(ROOT, 'src/views/ProgrammingView.tsx'), 'utf8');
const betaflightViewTsx = readFileSync(join(ROOT, 'src/views/BetaflightView.tsx'), 'utf8');
const betaflightDetailViewTsx = readFileSync(join(ROOT, 'src/views/BetaflightDetailView.tsx'), 'utf8');
const betaflightDataTs = readFileSync(join(ROOT, 'src/data/betaflightData.ts'), 'utf8');

console.log('\n[1] /programming route exists and is registered before /betaflight');
{
  ok('App.tsx imports ProgrammingView', /import\s*\{\s*ProgrammingView\s*\}\s*from\s*'\.\/views\/ProgrammingView';/.test(appTsx));
  ok('App.tsx imports ExpressLrsView', /import\s*\{\s*ExpressLrsView\s*\}\s*from\s*'\.\/views\/ExpressLrsView';/.test(appTsx));
  ok('App.tsx registers a /programming route rendering ProgrammingView', /<Route path="\/programming" element=\{<ProgrammingView\/>\}\/>/.test(appTsx));
  ok('App.tsx still registers /betaflight unchanged', /<Route path="\/betaflight" element=\{<BetaflightView\/>\}\/>/.test(appTsx));
  ok('App.tsx still registers /betaflight/:sectionId unchanged', /<Route path="\/betaflight\/:sectionId" element=\{<BetaflightDetailView\/>\}\/>/.test(appTsx));
}

console.log('\n[2] Bottom-nav label, icon, and route');
{
  ok('bottom label is exactly "البرمجة"', /label:\s*'البرمجة'/.test(bottomNavTsx));
  ok('"Betaflight" is no longer used as the bottom-nav label', !/label:\s*'Betaflight'/.test(bottomNavTsx));
  ok('CircuitBoard remains imported from lucide-react', /import\s*\{[^}]*\bCircuitBoard\b[^}]*\}\s*from\s*'lucide-react';/.test(bottomNavTsx));
  ok('CircuitBoard remains the icon for the Programming nav item', /icon:\s*CircuitBoard,\s*label:\s*'البرمجة'/.test(bottomNavTsx));
  ok('the Programming nav item points at /programming', /label:\s*'البرمجة',\s*path:\s*'\/programming'/.test(bottomNavTsx));
  ok('Programming tab active-match includes /programming', /activeMatchPrefixes:\s*\['\/programming',\s*'\/betaflight'\]/.test(bottomNavTsx));
  ok('Programming tab active-match includes /betaflight', /activeMatchPrefixes:\s*\['\/programming',\s*'\/betaflight'\]/.test(bottomNavTsx));
  ok('the other four nav items are untouched (الرئيسية/home)', /label:\s*'الرئيسية',\s*path:\s*'\/home'/.test(bottomNavTsx));
  ok('the other four nav items are untouched (البناء/roadmap)', /label:\s*'البناء',\s*path:\s*'\/roadmap'/.test(bottomNavTsx));
  ok('the other four nav items are untouched (الدروس/lessons)', /label:\s*'الدروس',\s*path:\s*'\/lessons'/.test(bottomNavTsx));
  ok('the other four nav items are untouched (التجميع/assembly)', /label:\s*'التجميع',\s*path:\s*'\/assembly'/.test(bottomNavTsx));
}

console.log('\n[3] Hub contains exactly four cards, in the required order, with the required statuses');
{
  const cardBlockMatch = programmingViewTsx.match(/const cards: ProgrammingCard\[\] = \[([\s\S]*?)\n\];/);
  ok('a `cards` array literal is defined', cardBlockMatch !== null);
  const cardsSrc = cardBlockMatch ? cardBlockMatch[1] : '';

  const idOrder = [...cardsSrc.matchAll(/id:\s*'([a-z]+)'/g)].map(m => m[1]);
  ok('hub defines exactly four cards', idOrder.length === 4);
  ok('card order is betaflight, expresslrs, binding, inav', JSON.stringify(idOrder) === JSON.stringify(['betaflight', 'expresslrs', 'binding', 'inav']));

  ok('Betaflight card title is exactly "Betaflight" (not Arabized)', /id:\s*'betaflight'[\s\S]*?title:\s*'Betaflight'/.test(cardsSrc));
  ok('ExpressLRS card title is exactly "ExpressLRS" (not Arabized)', /id:\s*'expresslrs'[\s\S]*?title:\s*'ExpressLRS'/.test(cardsSrc));
  ok('Binding card title is exactly "Binding" (not Arabized)', /id:\s*'binding'[\s\S]*?title:\s*'Binding'/.test(cardsSrc));
  ok('INAV card title is exactly "INAV" (not Arabized)', /id:\s*'inav'[\s\S]*?title:\s*'INAV'/.test(cardsSrc));

  ok('Betaflight card is available: true', /id:\s*'betaflight'[\s\S]*?available:\s*true/.test(cardsSrc));
  ok('ExpressLRS card is available: true', /id:\s*'expresslrs'[\s\S]*?available:\s*true/.test(cardsSrc));
  ok('Binding card is available: false', /id:\s*'binding'[\s\S]*?available:\s*false/.test(cardsSrc));
  ok('INAV card is available: false', /id:\s*'inav'[\s\S]*?available:\s*false/.test(cardsSrc));

  ok('the Betaflight card has a route field', /id:\s*'betaflight'[\s\S]*?route:\s*'\/betaflight'/.test(cardsSrc));
  ok('the ExpressLRS card has a route field pointing at /programming/expresslrs', /id:\s*'expresslrs'[\s\S]*?route:\s*'\/programming\/expresslrs'/.test(cardsSrc));
  ok('Binding card has no route field (no placeholder route)', !/route:/.test(cardsSrc.slice(cardsSrc.indexOf("id: 'binding'"), cardsSrc.indexOf("id: 'inav'"))));
  ok('INAV card has no route field (no placeholder route)', !/route:/.test(cardsSrc.slice(cardsSrc.indexOf("id: 'inav'"))));

  ok('Betaflight description matches the approved wording', cardsSrc.includes('إعداد المتحكم، المنافذ، المستقبل، والأنظمة الأساسية للطيران.'));
  ok('ExpressLRS description matches the approved wording', cardsSrc.includes('إعداد وربط نظام ExpressLRS والتحكم في إعدادات الاتصال.'));
  ok('Binding description matches the approved wording', cardsSrc.includes('ربط جهاز الإرسال بالمستقبل والتحقق من الاتصال.'));
  ok('INAV description matches the approved wording', cardsSrc.includes('إعداد نظام INAV للملاحة والمهام المتقدمة.'));
}

console.log('\n[4] "قريبًا" badge text (Binding/INAV only) and no placeholder routes for still-unavailable tools');
{
  const badgeCount = (programmingViewTsx.match(/قريبًا/g) || []).length;
  ok('the exact string "قريبًا" appears in the view (rendered badge text for Binding/INAV)', badgeCount >= 1);
  ok('a real (non-placeholder) /programming/expresslrs route now exists in App.tsx', /<Route path="\/programming\/expresslrs" element=\{<ExpressLrsView\/>\}\/>/.test(appTsx));
  ok('no placeholder route for Binding exists in App.tsx', !/\/binding/i.test(appTsx));
  ok('no placeholder route for INAV exists in App.tsx', !/\/inav/i.test(appTsx));
  ok('a real (non-placeholder) /programming/expresslrs/setup route now exists in App.tsx', /<Route path="\/programming\/expresslrs\/setup" element=\{<ExpressLrsSetupView\/>\}\/>/.test(appTsx));
  ok('no ExpressLRS troubleshooting child route exists yet', !/\/programming\/expresslrs\/troubleshooting/i.test(appTsx));
}

console.log('\n[5] Disabled cards use genuinely disabled native buttons, not fake links');
{
  ok('the view does not use an anchor-without-href pattern for disabled cards', !/<a\b(?![^>]*href)/.test(programmingViewTsx));
  ok('a native `disabled` attribute is used on the non-available card button', /disabled\s*\n\s*data-testid=\{`programming-card-\$\{card\.id\}`\}/.test(programmingViewTsx));
}

console.log('\n[6] Betaflight preservation — content files are structurally untouched');
{
  ok('BetaflightView.tsx still renders the exact existing heading', betaflightViewTsx.includes('Betaflight بالعربي'));
  ok('BetaflightView.tsx still navigates to /betaflight/${section.id} for each of the 10 sections', betaflightViewTsx.includes('navigate(`/betaflight/${section.id}`)'));
  ok('BetaflightDetailView.tsx still navigates back to /betaflight (back button + return button)', (betaflightDetailViewTsx.match(/navigate\('\/betaflight'\)/g) || []).length === 2);
  const sectionIds = [...betaflightDataTs.matchAll(/id:\s*'([a-z]+)', title:/g)].map(m => m[1]);
  ok('betaflightData.ts still defines exactly 10 sections', sectionIds.length === 10);
  ok('betaflightData.ts section order is unchanged', JSON.stringify(sectionIds) === JSON.stringify(['interface', 'firmware', 'ports', 'receiver', 'modes', 'motors', 'failsafe', 'osd', 'blackbox', 'cli']));
}

console.log(`\nAll ${passed} assertions passed.`);
