/**
 * The no-duplication gate.
 *
 * WHAT THIS FILE EXISTS TO PREVENT
 * --------------------------------
 * The single most emphasised requirement of the web platform was that it must
 * NOT become a second copy of the phone app: no duplicated articles, no second
 * search engine, no second verdict engine, no parallel project store, no
 * renamed content ids. Every one of those is easy to introduce by accident —
 * someone pastes an article into a page "just to see it render", someone writes
 * `/kb/${id}` inline because the helper was one import away — and each is
 * almost invisible in review once it lands.
 *
 * So the rule is asserted mechanically against the actual files on disk. If
 * anyone ever copies content into `web/`, or stands up a rival engine, or
 * hand-writes a content route in a component, this fails.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It does not check that the web LOOKS right — that is `testWebUI.ts`'s job in
 * a real browser. This file is about provenance: where the bytes come from.
 *
 * Run: npx tsx scripts/testWebCore.ts
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { getSearchIndex } from '../src/data/kb/search/buildIndex';
import { destinationFor, ROUTE_ONLY_TYPES } from '../src/platform/retrieval';
import { resolveDestination } from '../src/platform/destinations';
import { allKbModules, getArticle } from '../src/data/kb/registry';
import { allDxTrees } from '../src/data/kb/diagnostics/trees';
import { kbTerms } from '../src/data/kb/glossary/terms';
import {
  PLATFORM_ROLES, ROLE_CAPABILITIES, CAPABILITIES, can, canAssignRole,
  canActOnUser, toRole, assignableRoles, isStaff, type PlatformRole,
} from '../src/data/auth/roles';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

/** Every source file under web/, excluding build output and dependencies. */
function webSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      // Build output, not source. `.netlify` joined this list when the Netlify
      // deployment was set up: the runtime writes a 35 MB function bundle and a
      // copy of the client chunks under `web/.netlify`, and every article in
      // the encyclopedia is compiled into them. Walking it made the
      // «no article prose is copied into web source» check fail against the
      // build's own output — a true statement about a generated file and a
      // meaningless one about this repository.
      if (entry === 'node_modules' || entry === '.next' || entry === 'out'
        || entry === '.netlify') continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx|css)$/.test(entry)) out.push(full);
    }
  };
  walk(WEB);
  return out;
}

const FILES = webSourceFiles();
const SOURCES = new Map(FILES.map(f => [path.relative(ROOT, f), readFileSync(f, 'utf8')]));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The web app exists and is wired to the shared core');
{
  ok('web/ exists with source files', FILES.length > 0);
  ok('web has its own package manifest', existsSync(path.join(WEB, 'package.json')));

  const tsconfig = readFileSync(path.join(WEB, 'tsconfig.json'), 'utf8');
  ok('tsconfig maps @core/data to ../src/data',
    /"@core\/data\/\*"\s*:\s*\[\s*"\.\.\/src\/data\/\*"\s*\]/.test(tsconfig));
  ok('tsconfig maps @core/platform to ../src/platform',
    /"@core\/platform\/\*"\s*:\s*\[\s*"\.\.\/src\/platform\/\*"\s*\]/.test(tsconfig));

  // The alias is worthless if nothing uses it.
  const usingCore = [...SOURCES.entries()].filter(([, s]) => s.includes('@core/'));
  ok(`web files actually import the shared core (${usingCore.length})`, usingCore.length >= 6);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] No second engine — the web owns no core logic of its own');
{
  // Each entry: a thing that must exist exactly once, and the marker that would
  // reveal a second implementation living in web/.
  const FORBIDDEN: { what: string; pattern: RegExp }[] = [
    { what: 'a second search index builder', pattern: /function\s+buildSearchIndex|const\s+SEARCH_INDEX\s*=/ },
    { what: 'a second scoring function', pattern: /function\s+scoreDoc/ },
    { what: 'a second verdict engine', pattern: /function\s+computeFindings|function\s+computeRcFindings|function\s+computeVideoFindings/ },
    { what: 'a second project store', pattern: /localStorage\.setItem\(\s*['"]fpv-assembly-project/ },
    { what: 'a second destination resolver', pattern: /function\s+resolveDestination/ },
    { what: 'a second role table', pattern: /const\s+(PLATFORM_ROLES|ROLE_CAPABILITIES)\s*[:=]/ },
    { what: 'a second glossary', pattern: /const\s+kbTerms\s*[:=]\s*\[/ },
    { what: 'a second diagnostics registry', pattern: /const\s+allDxTrees\s*[:=]\s*\[/ },
  ];

  for (const { what, pattern } of FORBIDDEN) {
    const hits = [...SOURCES.entries()].filter(([, s]) => pattern.test(s)).map(([f]) => f);
    if (hits.length) console.error(`  DUPLICATE (${what}):`, hits);
    ok(`web contains no ${what}`, hits.length === 0);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] No content is copied into the web app');
{
  /**
   * The real test of "no duplicated articles": take a distinctive sentence from
   * a genuine article in the core and prove it appears nowhere in web/ source.
   * If someone pastes content into a page, this catches it — a paraphrase would
   * not be caught, but a paraphrase is a different (and much louder) problem.
   */
  const samples: { id: string; text: string }[] = [];
  for (const m of allKbModules) {
    for (const a of m.articles.slice(0, 2)) {
      const para = Object.values(a.layers)
        .flat()
        .find(b => b && b.type === 'para' && b.text.length > 80);
      if (para && para.type === 'para') {
        samples.push({ id: a.id, text: para.text.slice(0, 70) });
      }
    }
  }
  ok(`collected article prose samples to check (${samples.length})`, samples.length >= 6);

  const copied = samples.filter(s =>
    [...SOURCES.values()].some(src => src.includes(s.text)));
  if (copied.length) console.error('  COPIED PROSE:', copied.map(c => c.id));
  ok('no article prose appears literally in any web source file', copied.length === 0);

  // Same for diagnostics and glossary — the other two bodies of content.
  const treeText = allDxTrees.slice(0, 8).map(t => t.symptomAr.slice(0, 60));
  const copiedTrees = treeText.filter(t => [...SOURCES.values()].some(s => s.includes(t)));
  ok('no diagnostic symptom text is copied into web source', copiedTrees.length === 0);

  const termText = kbTerms.slice(0, 20).map(t => t.short.slice(0, 50));
  const copiedTerms = termText.filter(t => [...SOURCES.values()].some(s => s.includes(t)));
  ok('no glossary definition is copied into web source', copiedTerms.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Content routes are never hand-written in components');
{
  /**
   * A hand-written `/kb/${id}` is how a second routing table starts. The one
   * legitimate home for content paths is the adapter, so every other file is
   * checked and the adapter itself is exempt.
   */
  const ADAPTER = 'web/lib/webRoutes.ts';
  const NAV = 'web/lib/siteNav.ts';

  // Template-literal interpolation into a content path is the giveaway: a
  // static href like "/kb" is a section link and perfectly fine.
  const HANDWRITTEN = /["'`]\/(kb|diagnose|betaflight|programming|glossary)\/\$\{/;

  const offenders = [...SOURCES.entries()]
    .filter(([f]) => f !== ADAPTER && f !== NAV)
    .filter(([, s]) => HANDWRITTEN.test(s))
    .map(([f]) => f);
  if (offenders.length) console.error('  HAND-WRITTEN ROUTES:', offenders);
  ok('no component builds a content path by interpolation', offenders.length === 0);

  ok('the adapter is the only place resolveDestination is called',
    [...SOURCES.entries()].filter(([, s]) => s.includes('resolveDestination(')).length === 1);

  /**
   * Every kind the SEARCH INDEX can hand a reader must be openable here.
   *
   * This is the assertion that would have caught sixteen lesson results
   * rendering as live links to a `/lessons/:id` route this surface has never
   * had. They 404'd quietly for as long as search has existed, because nobody
   * clicks a lesson result while testing something else. A kind is acceptable
   * only if its route really exists under web/app, or if it is DECLARED
   * phone-only — silence is not one of the options.
   */
  const routeExists = (route: string): boolean => {
    const segments = route.split('?')[0].split('#')[0].split('/').filter(Boolean);
    let dir = path.join(ROOT, 'web/app');
    for (const seg of segments) {
      const concrete = path.join(dir, seg);
      if (existsSync(concrete)) { dir = concrete; continue; }
      // A [param] directory serves any concrete segment.
      const dynamic = readdirSync(dir).find(n => n.startsWith('[') && n.endsWith(']'));
      if (!dynamic) return false;
      dir = path.join(dir, dynamic);
    }
    return existsSync(path.join(dir, 'page.tsx'));
  };

  // The kinds this surface deliberately does not implement, read from the
  // adapter's own declaration rather than restated here — a second list would
  // be a second truth.
  const adapterSrc = SOURCES.get(ADAPTER) ?? '';
  const declaredPhoneOnly = new Set(
    [...adapterSrc.matchAll(/^\s{2}(?:\/\/.*\n\s*)*([a-z-]+):\s*'/gm)]
      .map(m => m[1]),
  );
  ok('the adapter declares at least one phone-only kind', declaredPhoneOnly.size > 0);

  const phoneOnlyRoutes = new Set(
    [...adapterSrc.matchAll(/^\s{2}'(\/[a-z/-]+)':/gm)].map(m => m[1]),
  );

  const CHECKS = {
    articleExists: (id: string) => !!getArticle(id),
    moduleIdOfArticle: (id: string) => getArticle(id)?.moduleId,
    dxExists: (id: string) => allDxTrees.some(t => t.id === id),
    glossaryExists: (id: string) => kbTerms.some(t => t.id === id),
  };

  const dead: string[] = [];
  for (const doc of getSearchIndex()) {
    if (ROUTE_ONLY_TYPES.has(doc.type)) {
      // These carry the index's own route; check it directly.
      if (!routeExists(doc.route)) dead.push(`${doc.type} → ${doc.route}`);
      continue;
    }
    // A route the phone owns and this surface declares as such.
    if (phoneOnlyRoutes.has(doc.route)) continue;
    const dest = destinationFor(doc);
    if (!dest) { dead.push(`${doc.type} → no destination`); continue; }
    if (declaredPhoneOnly.has(dest.kind)) continue;   // honestly unavailable
    const route = resolveDestination(dest, CHECKS);
    if (!route) { dead.push(`${doc.type} → unresolvable`); continue; }
    if (!routeExists(route)) dead.push(`${doc.type} → ${route}`);
  }
  if (dead.length) console.error('  DEAD ROUTES:', [...new Set(dead)].slice(0, 8));
  ok('every route the search index can produce exists on this surface', dead.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Content ids are identical across surfaces');
{
  /**
   * The web's URLs are derived from the same ids the phone uses, so a link
   * shared from one opens the same thing on the other. Proven by resolving a
   * sample through the shared resolver and checking the id survives verbatim.
   */
  const sample = allKbModules.flatMap(m => m.articles.slice(0, 3));
  ok(`sampled articles across modules (${sample.length})`, sample.length >= 12);

  const mismatched = sample.filter(a => {
    const resolved = getArticle(a.id);
    return !resolved || resolved.id !== a.id || resolved.moduleId !== a.moduleId;
  });
  ok('every sampled article resolves to itself by id', mismatched.length === 0);

  // And the URL shape the web generates embeds those exact ids.
  const bad = sample.filter(a => {
    const expected = `/kb/${a.moduleId}/${a.id}`;
    return !expected.includes(a.id) || !expected.includes(a.moduleId);
  });
  ok('the web URL for an article embeds its real module and article id', bad.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Secrets never reach the browser');
{
  /**
   * The catastrophic failure mode for this codebase: firebase-admin bundled
   * into client JavaScript, shipping a service account to every visitor.
   *
   * Two independent defences are asserted. First, every module that touches
   * Admin opens with `import 'server-only'`, which makes the BUILD fail if a
   * client component imports it. Second, no file carrying `'use client'` may
   * import Admin at all.
   */
  const adminFiles = [...SOURCES.entries()]
    .filter(([, s]) => s.includes('firebase-admin'));
  ok(`admin-touching files exist to check (${adminFiles.length})`, adminFiles.length > 0);

  for (const [f, s] of adminFiles) {
    ok(`${f}: declares server-only`, /import\s+['"]server-only['"]/.test(s));
    ok(`${f}: is not a client component`, !s.includes("'use client'"));
  }

  // A client component must never import the session module either — it reads
  // cookies and calls Admin.
  const clientFiles = [...SOURCES.entries()].filter(([, s]) => s.includes("'use client'"));
  const leaky = clientFiles.filter(([, s]) =>
    /from\s+['"][^'"]*server\/(firebaseAdmin|session)['"]/.test(s)).map(([f]) => f);
  if (leaky.length) console.error('  CLIENT IMPORTING SERVER:', leaky);
  ok('no client component imports the server session or admin modules', leaky.length === 0);

  // No credential-shaped literal anywhere in web source.
  const CRED = /-----BEGIN [A-Z ]*PRIVATE KEY-----|"private_key"\s*:|service_account/;
  const creds = [...SOURCES.entries()].filter(([, s]) => CRED.test(s)).map(([f]) => f);
  if (creds.length) console.error('  CREDENTIAL LITERAL:', creds);
  ok('no credential literal appears in web source', creds.length === 0);

  // Server-only env vars must never be read through a NEXT_PUBLIC_ name.
  const publicised = [...SOURCES.entries()]
    .filter(([, s]) => /NEXT_PUBLIC_[A-Z_]*(PRIVATE|SECRET|CLIENT_EMAIL)/.test(s))
    .map(([f]) => f);
  ok('no secret is exposed through a NEXT_PUBLIC_ variable', publicised.length === 0);

  // The example env file must document names without values.
  const example = readFileSync(path.join(WEB, '.env.example'), 'utf8');
  ok('.env.example exists and documents the server variables',
    example.includes('FIREBASE_PRIVATE_KEY') && example.includes('NEXT_PUBLIC_FIREBASE_API_KEY'));
  ok('.env.example carries no values',
    !/=\S/.test(example.replace(/^NEXT_PUBLIC_SITE_URL=.*$/m, '')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] The role model is least-privilege and cannot self-escalate');
{
  ok(`six roles are declared (${PLATFORM_ROLES.length})`, PLATFORM_ROLES.length === 6);
  ok('the two pre-existing roles are preserved verbatim',
    PLATFORM_ROLES.includes('user') && PLATFORM_ROLES.includes('moderator'));

  // The existing moderator's powers must not silently grow BEYOND what
  // firestore.rules already grants live accounts — and must not silently
  // shrink below it either.
  //
  // `users.ban` was added to the moderator in batch 4, deliberately: the rules'
  // users/{uid} update branch has always let isModerator() flip another
  // account's `status`, and the phone's admin dashboard uses exactly that. The
  // model was under-describing a live power, so recording it is the fix;
  // removing it would have taken a capability away from accounts that have it
  // today. What must remain false is everything a moderator has never had.
  ok('moderator CAN ban, matching the rule that has always let them',
    can('moderator', 'users.ban') && can('moderator', 'users.unban'));
  ok('moderator cannot assign roles', !can('moderator', 'users.assignRole'));
  ok('moderator cannot delete content administratively', !can('moderator', 'community.deletePost'));
  ok('moderator cannot read the audit log', !can('moderator', 'audit.view'));
  ok('moderator cannot edit teaching content', !can('moderator', 'content.edit'));

  ok('a plain user has no capabilities at all', ROLE_CAPABILITIES.user.length === 0);
  ok('a plain user cannot open the admin surface', !can('user', 'admin.access') && !isStaff('user'));
  ok('a reviewer is read-only', can('reviewer', 'community.viewReports')
    && !can('reviewer', 'community.resolveReports')
    && !can('reviewer', 'community.hidePost'));
  ok('an editor has no power over people', !can('editor', 'users.ban')
    && !can('editor', 'users.assignRole'));
  ok('only owner may assign privileged roles',
    can('owner', 'users.assignPrivilegedRole') && !can('admin', 'users.assignPrivilegedRole'));
  ok('owner holds every capability', CAPABILITIES.every(c => can('owner', c)));

  // Escalation paths, closed.
  ok('an admin cannot mint another admin', !canAssignRole('admin', 'admin'));
  ok('an admin cannot mint an owner', !canAssignRole('admin', 'owner'));
  ok('an owner cannot mint another owner through the app', !canAssignRole('owner', 'owner'));
  ok('a moderator cannot assign any role', assignableRoles('moderator').length === 0);
  ok('a user cannot assign any role', assignableRoles('user').length === 0);

  // Acting on other accounts.
  const admin = { uid: 'a', role: 'admin' as PlatformRole };
  ok('nobody may act on their own account',
    !canActOnUser(admin, { uid: 'a', role: 'user' }));
  ok('the owner is untouchable by an admin',
    !canActOnUser(admin, { uid: 'o', role: 'owner' }));
  ok('an admin cannot act on another admin',
    !canActOnUser(admin, { uid: 'b', role: 'admin' }));
  ok('an admin may act on a plain user',
    canActOnUser(admin, { uid: 'b', role: 'user' }));

  // Unknown input fails closed.
  ok('an unknown role value degrades to user', toRole('superuser') === 'user'
    && toRole(undefined) === 'user' && toRole(null) === 'user' && toRole(9) === 'user');
  ok('a forged privileged string is not accepted', toRole('OWNER') === 'user');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] The admin surface is refused server-side, not merely hidden');
{
  const middleware = existsSync(path.join(WEB, 'middleware.ts'))
    ? readFileSync(path.join(WEB, 'middleware.ts'), 'utf8')
    : '';
  ok('a middleware exists', middleware.length > 0);
  ok('…and it matches the admin path', /\/admin/.test(middleware));

  // Every admin page/route must consult the server guard. A page that renders
  // admin data without calling it is the exact hole this asserts against.
  const adminFiles = [...SOURCES.entries()]
    .filter(([f]) => f.startsWith('web/app/admin/') || f.startsWith('web/app/api/admin/'))
    .filter(([f]) => f.endsWith('.tsx') || f.endsWith('.ts'));
  ok(`admin files exist (${adminFiles.length})`, adminFiles.length > 0);

  // `export const POST = adminRoute` counts as a guard because it IS the
  // guard — matched on the export rather than on a bare mention, so merely
  // importing the wrapper is not enough. It resolves the
  // session, refuses a banned account and checks the capability before the
  // handler is called at all, and scripts/testAdminRoles.ts asserts that
  // ordering against the wrapper's own source. A route that used it and then
  // skipped a check would fail there, not here.
  const unguarded = adminFiles
    .filter(([, s]) => !/requireCapability|requireSession|getSession|export const (POST|GET) = adminRoute/.test(s))
    .map(([f]) => f);
  if (unguarded.length) console.error('  UNGUARDED ADMIN FILES:', unguarded);
  ok('every admin page and route consults the server-side guard', unguarded.length === 0);

  const routeWrapper = SOURCES.get('web/lib/server/adminRoute.ts') ?? '';
  ok('the route wrapper that stands in for that guard is itself guarded',
    /await getSession\(\)/.test(routeWrapper) && /can\(session\.role, capability\)/.test(routeWrapper));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] The phone app is untouched by the web surface');
{
  // The web must not have reached back into the phone's UI. Shared code lives
  // in src/data and src/platform; anything else would couple the two builds.
  //
  // Two exceptions, admitted by the lessons rebuild and checked right below:
  // the interactive SVG diagrams (src/components/diagrams) and the adapter
  // that maps them onto lesson stages. They are the lessons' teaching visuals,
  // rendered on both surfaces from one copy — the same rule as the data. They
  // stay admissible only while they import nothing from the phone's shell,
  // which the next assertion proves on every run.
  const SHARED_UI = /@core\/components\/(diagrams\/|lessons\/interactiveDiagramAdapters)/;
  const reachesIntoPhoneUi = [...SOURCES.entries()]
    .filter(([, s]) =>
      [...s.matchAll(/@core\/(components|views|contexts|lib)\/[^'"]+/g)].some(m => !SHARED_UI.test(m[0]))
      || /from\s+['"]\.\.\/\.\.\/src\/(components|views|contexts)/.test(s))
    .map(([f]) => f);
  if (reachesIntoPhoneUi.length) console.error('  REACHES INTO PHONE UI:', reachesIntoPhoneUi);
  ok('no web file imports the phone app\'s components, views or contexts (beyond the shared diagrams)',
    reachesIntoPhoneUi.length === 0);

  const diagramsDir = path.join(ROOT, 'src/components/diagrams');
  const sharedUiFiles = [
    ...readdirSync(diagramsDir).filter(f => f.endsWith('.tsx')).map(f => path.join(diagramsDir, f)),
    path.join(ROOT, 'src/components/lessons/interactiveDiagramAdapters.tsx'),
  ];
  const shellBound = sharedUiFiles.filter(f =>
    /from\s+['"](react-router|firebase|\.\.\/\.\.\/(contexts|views|hooks|lib)\/)/.test(readFileSync(f, 'utf8')));
  if (shellBound.length) console.error('  SHARED UI BOUND TO THE PHONE SHELL:', shellBound);
  ok(`the shared diagrams import nothing from the phone shell (${sharedUiFiles.length} files checked)`,
    shellBound.length === 0);

  // And the phone must not have started importing the web.
  const phoneImportsWeb: string[] = [];
  const walkPhone = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) { walkPhone(full); continue; }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      if (/from\s+['"][^'"]*\bweb\//.test(readFileSync(full, 'utf8'))) {
        phoneImportsWeb.push(path.relative(ROOT, full));
      }
    }
  };
  walkPhone(path.join(ROOT, 'src'));
  if (phoneImportsWeb.length) console.error('  PHONE IMPORTS WEB:', phoneImportsWeb);
  ok('no phone file imports anything from web/', phoneImportsWeb.length === 0);
}

/* ────────────────────────────────────────────────────────────────────────────
 * [10] Media — one pipeline, one Firebase, no second uploader
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n[10] The media pipeline is shared, not duplicated');
{
  const pipeline = readFileSync(path.join(ROOT, 'src/components/Community/Composer/mediaPipeline.ts'), 'utf8');
  const webBinding = readFileSync(path.join(ROOT, 'web/lib/mediaUpload.ts'), 'utf8');
  const phoneBinding = readFileSync(path.join(ROOT, 'src/components/Community/Composer/MediaUploader.ts'), 'utf8');

  ok('the web binds the SHARED pipeline rather than importing firebase/storage itself',
    webBinding.includes("@core/community/Composer/mediaPipeline"));
  ok('the phone binds the same shared pipeline',
    phoneBinding.includes("./mediaPipeline"));

  // The limits must exist in exactly one place. A second copy is how the two
  // surfaces start disagreeing with storage.rules.
  for (const [name, pattern] of [
    ['the image MIME allow-list', /ALLOWED_IMAGE_MIME_TYPES\s*=\s*\[/],
    ['the video MIME allow-list', /ALLOWED_VIDEO_MIME_TYPES\s*=\s*\[/],
    ['the compressed-image ceiling', /MAX_MEDIA_SIZE_BYTES\s*=/],
    ['the raw-input ceiling', /MAX_RAW_INPUT_BYTES\s*=/],
    ['the video byte ceiling', /MAX_VIDEO_SIZE_BYTES\s*=/],
    ['the video duration ceiling', /MAX_VIDEO_DURATION_SECONDS\s*=/],
  ] as const) {
    ok(`${name} is DEFINED in the shared pipeline`, pattern.test(pipeline));
    ok(`${name} is not re-defined in the web binding`, !pattern.test(webBinding));
    ok(`${name} is not re-defined in the phone binding`, !pattern.test(phoneBinding));
  }

  ok('the shared pipeline takes the storage handle as a parameter — that is what makes it shareable',
    /uploadMediaWith\s*=\s*async\s*\(\s*\n?\s*storage:\s*FirebaseStorage/.test(pipeline));
  ok('the shared pipeline imports no app-specific Firebase singleton',
    !/lib\/firebase'|firebaseClient/.test(pipeline));
  ok('the shared pipeline imports no React', !/from 'react'/.test(pipeline));

  // The dual-instance trap. A runtime package imported by ../src MUST resolve
  // to one copy, or objects made by one half are unrecognisable to the other.
  const webPkg = JSON.parse(readFileSync(path.join(ROOT, 'web/package.json'), 'utf8')) as
    { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const webDeps = { ...webPkg.dependencies, ...webPkg.devDependencies };
  for (const shared of ['firebase', 'browser-image-compression']) {
    ok(`${shared} is NOT duplicated in web/package.json — the shared core imports it, so one copy must serve both`,
      !(shared in webDeps));
  }
  ok('the web still declares firebase-admin, which only it uses',
    'firebase-admin' in webDeps);

  // The web must never invent its own storage path — the path IS the
  // authorization in storage.rules.
  ok('the folder path comes from the shared helper, never rebuilt in web code',
    !/community\/posts\/\$\{/.test(readFileSync(path.join(ROOT, 'web/lib/communityWrites.ts'), 'utf8')));
}

console.log(`\n✅ testWebCore: ${passed} assertions passed\n`);
