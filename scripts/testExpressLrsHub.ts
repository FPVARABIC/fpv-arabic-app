/**
 * Real source-structure assertions for the ExpressLRS landing page
 * (src/views/ExpressLrsView.tsx, src/App.tsx).
 *
 * Like scripts/testProgrammingHub.ts, this is deliberately a source-structure
 * test, not a behavioral one — the page is a small static content shell with
 * no runtime logic to drive. It reads the real source files on disk and
 * asserts on their structure directly. scripts/testExpressLrsHubUI.ts proves
 * the same content and honesty-of-interaction claims in a real browser.
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
const viewTsx = readFileSync(join(ROOT, 'src/views/ExpressLrsView.tsx'), 'utf8');
const betaflightViewTsx = readFileSync(join(ROOT, 'src/views/BetaflightView.tsx'), 'utf8');
const betaflightDetailViewTsx = readFileSync(join(ROOT, 'src/views/BetaflightDetailView.tsx'), 'utf8');
const betaflightDataTs = readFileSync(join(ROOT, 'src/data/betaflightData.ts'), 'utf8');

console.log('\n[1] /programming/expresslrs route exists; both /setup and /troubleshooting child routes now exist');
{
  // The three screens moved from eager `import` to `lazy(() => import(...))`
  // when they began reading the user's project and resolving links through the
  // KB registry: keeping them eager pulled the parts catalogue and the whole
  // encyclopedia into the first load. What matters to this test is unchanged —
  // App.tsx still brings each of them in from its own module file — so the
  // assertion follows the import, not the keyword.
  ok('App.tsx loads ExpressLrsView from its module', /import\('\.\/views\/ExpressLrsView'\)/.test(appTsx));
  ok('App.tsx loads ExpressLrsSetupView from its module', /import\('\.\/views\/ExpressLrsSetupView'\)/.test(appTsx));
  ok('App.tsx loads ExpressLrsTroubleshootingView from its module', /import\('\.\/views\/ExpressLrsTroubleshootingView'\)/.test(appTsx));
  ok('…and each is code-split rather than eagerly bundled',
    /const ExpressLrsView = lazy\(/.test(appTsx)
    && /const ExpressLrsSetupView = lazy\(/.test(appTsx)
    && /const ExpressLrsTroubleshootingView = lazy\(/.test(appTsx));
  ok('App.tsx registers /programming/expresslrs rendering ExpressLrsView', /<Route path="\/programming\/expresslrs" element=\{<ExpressLrsView\/>\}\/>/.test(appTsx));
  ok('App.tsx registers /programming/expresslrs/setup rendering ExpressLrsSetupView', /<Route path="\/programming\/expresslrs\/setup" element=\{<ExpressLrsSetupView\/>\}\/>/.test(appTsx));
  ok('App.tsx registers /programming/expresslrs/troubleshooting rendering ExpressLrsTroubleshootingView', /<Route path="\/programming\/expresslrs\/troubleshooting" element=\{<ExpressLrsTroubleshootingView\/>\}\/>/.test(appTsx));
  ok('/programming still exists unchanged', /<Route path="\/programming" element=\{<ProgrammingView\/>\}\/>/.test(appTsx));
  ok('/betaflight still exists unchanged', /<Route path="\/betaflight" element=\{<BetaflightView\/>\}\/>/.test(appTsx));
  ok('/betaflight/:sectionId still exists unchanged', /<Route path="\/betaflight\/:sectionId" element=\{<BetaflightDetailView\/>\}\/>/.test(appTsx));
}

console.log('\n[2] BottomNavigation.tsx was not touched by this phase');
{
  ok('BottomNavigation.tsx still has no /programming/expresslrs-specific entry (the existing /programming prefix already covers it)', !/expresslrs/i.test(bottomNavTsx));
  ok('the Programming nav item\'s activeMatchPrefixes are unchanged', /activeMatchPrefixes:\s*\['\/programming',\s*'\/betaflight'\]/.test(bottomNavTsx));
}

console.log('\n[3] Page uses AppShell + Header, with a locally-scoped light wrapper (no global CSS)');
{
  ok('the view imports AppShell', /import\s*\{\s*AppShell\s*\}\s*from\s*'\.\.\/components\/AppShell';/.test(viewTsx));
  ok('the view imports Header', /import\s*\{\s*Header\s*\}\s*from\s*'\.\.\/components\/Header';/.test(viewTsx));
  ok('Header is given the exact title "ExpressLRS"', /<Header title="ExpressLRS"\/>/.test(viewTsx));
  ok('the light wrapper is a local element (not imported from a shared/global component)', !/import.*AssemblyLayout/.test(viewTsx));
  ok('the light wrapper sets an explicit light background (#f8fafc)', /background:\s*'#f8fafc'/.test(viewTsx));
  ok('no import from src/index.css or any other global stylesheet was added', !/import\s*['"].*\.css['"]/.test(viewTsx));
}

console.log('\n[4] Exact page content: subtitle and description');
{
  // Strip JSX comment blocks first so a mention of "<h1" inside prose
  // explaining the design decision doesn't get counted as real markup.
  const viewTsxNoComments = viewTsx.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  ok('subtitle text matches exactly', viewTsx.includes('إعداد وربط نظام ExpressLRS خطوة بخطوة'));
  ok('description text matches exactly', viewTsx.includes('كل ما تحتاجه لإعداد ExpressLRS من تحديث الأجهزة وحتى حل المشاكل.'));
  ok('the body does not repeat "ExpressLRS" as a second <h1> (Header already owns the page heading)', (viewTsxNoComments.match(/<h1\b/g) || []).length === 0);
}

console.log('\n[5] Exactly two structural sections, exact order, exact content');
{
  const sectionsBlockMatch = viewTsx.match(/const sections: ExpressLrsSection\[\] = \[([\s\S]*?)\n\];/);
  ok('a `sections` array literal is defined', sectionsBlockMatch !== null);
  const sectionsSrc = sectionsBlockMatch ? sectionsBlockMatch[1] : '';

  const idOrder = [...sectionsSrc.matchAll(/id:\s*'([a-z]+)'/g)].map(m => m[1]);
  ok('exactly two sections are defined', idOrder.length === 2);
  ok('section order is setup, troubleshooting', JSON.stringify(idOrder) === JSON.stringify(['setup', 'troubleshooting']));

  ok('section 1 title is exactly "الإعداد والبرمجة"', /id:\s*'setup'[\s\S]*?title:\s*'الإعداد والبرمجة'/.test(sectionsSrc));
  ok('section 1 description matches exactly', sectionsSrc.includes('ابدأ من تحديث الأجهزة، ثم الربط، ثم إعداد Betaflight، ثم التحقق النهائي.'));
  ok('section 1 supporting label is exactly "10 خطوات عملية"', /id:\s*'setup'[\s\S]*?supportingLabel:\s*'10 خطوات عملية'/.test(sectionsSrc));

  ok('section 2 title is exactly "حل المشاكل"', /id:\s*'troubleshooting'[\s\S]*?title:\s*'حل المشاكل'/.test(sectionsSrc));
  ok('section 2 description matches exactly', sectionsSrc.includes('إذا واجهت مشكلة، ابدأ من هنا وشخّص السبب خطوة بخطوة.'));
  ok('section 2 supporting label is exactly "تشخيص منظم"', /id:\s*'troubleshooting'[\s\S]*?supportingLabel:\s*'تشخيص منظم'/.test(sectionsSrc));

  ok('the setup section has a `route` field pointing at /programming/expresslrs/setup', /id:\s*'setup'[\s\S]*?route:\s*'\/programming\/expresslrs\/setup'/.test(sectionsSrc));
  ok('the troubleshooting section now has a `route` field pointing at /programming/expresslrs/troubleshooting', /id:\s*'troubleshooting'[\s\S]*?route:\s*'\/programming\/expresslrs\/troubleshooting'/.test(sectionsSrc));
}

console.log('\n[6] Both sections are now real interactive controls, honestly (no fake handlers)');
{
  ok('the view imports useNavigate', /import\s*\{\s*useNavigate\s*\}\s*from\s*'react-router-dom';/.test(viewTsx));
  ok('a real <button> is rendered when a section has a route', /if\s*\(section\.route\)\s*\{[\s\S]*?<button/.test(viewTsx));
  ok('the interactive branch navigates via navigate(section.route!)', /onClick=\{\(\)\s*=>\s*navigate\(section\.route!\)\}/.test(viewTsx));
  ok('the generic non-interactive <div> branch still exists in source (still reachable for any future section without a route)', /<div\s*\n\s*key=\{section\.id\}\s*\n\s*data-testid=\{`expresslrs-section-\$\{section\.id\}`\}/.test(viewTsx));
  ok('no <a> element is used for a section', !/<a\b/.test(viewTsx));
  ok('no role="button" is used anywhere (native <button> is used instead)', !/role="button"/.test(viewTsx));
  ok('no disabled attribute is used anywhere on this page (nothing here is a disabled control)', !/disabled/.test(viewTsx));
  ok('no "قريبًا" label appears anywhere on this page (ExpressLRS is available, these are structural sections, not a future feature)', !/قريبًا/.test(viewTsx));
  ok('each section renders its title in a semantic subheading (<h2>, once in source, applied per mapped section)', /<h2\b[^>]*>\{section\.title\}<\/h2>/.test(viewTsx));
}

console.log('\n[7] No detailed setup/troubleshooting flow content lives in this hub page (it lives in dedicated views/data files)');
{
  ok('no numbered step-by-step content beyond the "10 خطوات عملية" summary label exists', !/الخطوة\s*\d/.test(viewTsx));
  ok('no troubleshooting decision-tree/diagnostic question content exists in this file', !/(هل تواجه|جرّب التالي|إذا لم يعمل)/.test(viewTsx));
}

console.log('\n[8] Betaflight preservation — content files are structurally untouched');
{
  ok('BetaflightView.tsx still renders the exact existing heading', betaflightViewTsx.includes('Betaflight بالعربي'));
  ok('BetaflightView.tsx still navigates to /betaflight/${section.id} for each of the 10 sections', betaflightViewTsx.includes('navigate(`/betaflight/${section.id}`)'));
  ok('BetaflightDetailView.tsx still navigates back to /betaflight (back button + return button)', (betaflightDetailViewTsx.match(/navigate\('\/betaflight'\)/g) || []).length === 2);
  const sectionIds = [...betaflightDataTs.matchAll(/id:\s*'([a-z]+)', title:/g)].map(m => m[1]);
  ok('betaflightData.ts still defines exactly 10 sections', sectionIds.length === 10);
}

console.log(`\nAll ${passed} assertions passed.`);
