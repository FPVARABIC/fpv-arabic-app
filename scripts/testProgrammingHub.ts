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
const indexCss = readFileSync(join(ROOT, 'src/index.css'), 'utf8');
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
  ok('the exact string "قريبًا" appears in the view (rendered badge text for Binding/INAV)', badgeCount >= 2);
  ok('a real (non-placeholder) /programming/expresslrs route now exists in App.tsx', /<Route path="\/programming\/expresslrs" element=\{<ExpressLrsView\/>\}\/>/.test(appTsx));
  ok('no placeholder route for Binding exists in App.tsx', !/\/binding/i.test(appTsx));
  ok('no placeholder route for INAV exists in App.tsx', !/\/inav/i.test(appTsx));
  ok('a real (non-placeholder) /programming/expresslrs/setup route now exists in App.tsx', /<Route path="\/programming\/expresslrs\/setup" element=\{<ExpressLrsSetupView\/>\}\/>/.test(appTsx));
  ok('a real (non-placeholder) /programming/expresslrs/troubleshooting route now exists in App.tsx', /<Route path="\/programming\/expresslrs\/troubleshooting" element=\{<ExpressLrsTroubleshootingView\/>\}\/>/.test(appTsx));
}

console.log('\n[5] Disabled cards use genuinely disabled native buttons, not fake links');
{
  ok('the view does not use an anchor-without-href pattern for disabled cards', !/<a\b(?![^>]*href)/.test(programmingViewTsx));
  ok('a native `disabled` attribute is used on the non-available card button', /disabled\s*\n\s*data-testid=\{`programming-card-\$\{card\.id\}`\}/.test(programmingViewTsx));
}

console.log('\n[6] Betaflight preservation — legacy compatibility files are structurally untouched; the live hub is now registry-driven');
{
  ok('BetaflightView.tsx still renders the exact existing heading', betaflightViewTsx.includes('Betaflight بالعربي'));
  ok('BetaflightView.tsx is now a thin wrapper that imports BetaflightHubRenderer (the old hardcoded 10-card hub was replaced)', /import\s*\{\s*BetaflightHubRenderer\s*\}\s*from\s*'\.\.\/components\/betaflight\/BetaflightHubRenderer';/.test(betaflightViewTsx));
  ok('BetaflightView.tsx drives the live hub from the real 26-page bfPageRegistry, not the legacy 10-item betaflightData array', /import\s*\{\s*bfPageRegistry\s*\}\s*from\s*'\.\.\/data\/betaflight\/pageRegistry';/.test(betaflightViewTsx) && !/from\s*'\.\.\/data\/betaflightData'/.test(betaflightViewTsx));
  ok('BetaflightDetailView.tsx still navigates back to /betaflight (back button + return button)', (betaflightDetailViewTsx.match(/navigate\('\/betaflight'\)/g) || []).length === 2);
  const sectionIds = [...betaflightDataTs.matchAll(/id:\s*'([a-z]+)', title:/g)].map(m => m[1]);
  ok('betaflightData.ts still defines exactly 10 sections (still used by BetaflightDetailView.tsx for legacy deep-link compatibility)', sectionIds.length === 10);
  ok('betaflightData.ts section order is unchanged', JSON.stringify(sectionIds) === JSON.stringify(['interface', 'firmware', 'ports', 'receiver', 'modes', 'motors', 'failsafe', 'osd', 'blackbox', 'cli']));
  ok('BetaflightDetailView.tsx still imports betaflightData for its legacy fallback branch (untouched)', /import\s*\{\s*betaflightData\s*\}\s*from\s*'\.\.\/data\/betaflightData';/.test(betaflightDetailViewTsx));
}

console.log('\n[7] Programming hub dark shell — visual redesign structure');
{
  ok('ProgrammingView renders the new .programming-shell wrapper', /className="programming-shell/.test(programmingViewTsx));
  ok('ProgrammingView no longer uses the shared light <Header> component (custom dark header instead, avoiding the white/dark seam)', !/<Header\b/.test(programmingViewTsx));
  ok('.programming-shell is defined in index.css with an opaque (non-transparent) background', /\.programming-shell\s*\{[^}]*background:/s.test(indexCss));
  ok('.programming-card shared panel class is defined in index.css', /\.programming-card\s*\{/.test(indexCss));
  ok('.programming-card-icon shared icon-tile class is defined in index.css', /\.programming-card-icon\s*\{/.test(indexCss));
  ok('.programming-status shared badge class is defined in index.css', /\.programming-status\s*\{/.test(indexCss));
  ok('ProgrammingView binds card.accentKey dynamically to the shared programming-card--* class (one system, not four unrelated designs)', /programming-card--\$\{card\.accentKey\}/.test(programmingViewTsx));
  for (const key of ['betaflight', 'expresslrs', 'binding', 'inav']) {
    ok(`.programming-card--${key} accent variant is defined in index.css`, new RegExp(`\\.programming-card--${key}\\b`).test(indexCss));
  }
  ok('exactly one h1 is rendered in the source (single literal <h1)', (programmingViewTsx.match(/<h1\b/g) || []).length === 1);
  ok('the h1 text is "البرمجة" (existing meaning preserved)', /<h1[^>]*>البرمجة<\/h1>/.test(programmingViewTsx));
}

console.log('\n[8] Binding/INAV are genuine announcement cards — no click handler, no route, no chevron');
{
  // Isolate the disabled-card render branch (shared by Binding and INAV — both
  // are driven by the same `!card.available` JSX branch, not per-card markup).
  // Anchored on the `disabled` boolean JSX prop (unique to this branch — the
  // enabled branch has no such prop) back to its enclosing `return (`, through
  // its own closing `</button>` — so it can never bleed into the enabled
  // branch's onClick/navigate/ChevronLeft above it.
  const disabledPropIndex = programmingViewTsx.indexOf('\n                disabled\n');
  const branchStart = disabledPropIndex > -1 ? programmingViewTsx.lastIndexOf('return (', disabledPropIndex) : -1;
  const disabledBranchEnd = disabledPropIndex > -1 ? programmingViewTsx.indexOf('</button>', disabledPropIndex) : -1;
  const disabledBranch = branchStart > -1 && disabledBranchEnd > -1
    ? programmingViewTsx.slice(branchStart, disabledBranchEnd)
    : '';
  ok('the disabled-card branch is present', disabledBranch.length > 0);
  ok('the disabled-card branch has no onClick handler', !/onClick/.test(disabledBranch));
  ok('the disabled-card branch never calls navigate(...)', !/navigate\(/.test(disabledBranch));
  ok('the disabled-card branch does not render a ChevronLeft affordance', !/ChevronLeft/.test(disabledBranch));
  ok('the disabled-card branch renders the "قريبًا" status badge', /قريبًا/.test(disabledBranch));
  ok('the disabled-card branch does not reduce the whole card via a low opacity style (no blanket opacity/fade)', !/opacity:\s*0\.\d/.test(disabledBranch));
}

console.log('\n[9] Icon system — lucide-react only, no raw emoji');
{
  ok('lucide-react is imported for icons', /from\s*'lucide-react'/.test(programmingViewTsx));
  ok('no second icon library is imported', !/from\s*'(react-icons|@heroicons|@mui\/icons-material|@fortawesome)/.test(programmingViewTsx));
  const EMOJI_RANGE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  ok('no raw emoji characters in ProgrammingView.tsx', !EMOJI_RANGE.test(programmingViewTsx));
  ok('decorative card icons are aria-hidden (both the enabled and disabled render branches)', (programmingViewTsx.match(/<Icon size=\{22\} aria-hidden\/>/g) || []).length === 2);
  ok('the chevron affordance icon is aria-hidden', /<ChevronLeft[^>]*aria-hidden/.test(programmingViewTsx));
}

console.log('\n[10] Scope — only the expected files are dirty; no Betaflight/ExpressLRS content file was touched');
{
  const { execSync } = await import('node:child_process');
  const diffNames = execSync('git diff --name-only HEAD', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const untrackedNames = execSync('git ls-files --others --exclude-standard', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const allChanged = [...diffNames, ...untrackedNames];
  const ALLOWED_SCOPE = new Set([
    'scripts/testProgrammingHub.ts',
    'scripts/testProgrammingHubUI.ts',
    'src/index.css',
    'src/views/ProgrammingView.tsx',
  ]);
  const outOfScope = allChanged.filter(f => !ALLOWED_SCOPE.has(f));
  ok('no file outside the known Programming-hub-redesign scope is dirty', outOfScope.length === 0);
  if (outOfScope.length > 0) console.log('  OUT OF SCOPE:', outOfScope);
  ok('no Betaflight data/component/page file appears in the diff', !allChanged.some(f => f.startsWith('src/data/betaflight/') || f.startsWith('src/components/betaflight/') || f === 'src/views/BetaflightView.tsx' || f === 'src/views/BetaflightDetailView.tsx'));
  ok('no ExpressLRS data/view file appears in the diff', !allChanged.some(f => f.startsWith('src/data/expresslrs/') || f.startsWith('src/components/expresslrs/') || f.startsWith('src/views/ExpressLrs')));
}

console.log(`\nAll ${passed} assertions passed.`);
