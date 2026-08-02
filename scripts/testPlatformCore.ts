/**
 * Proof that the platform core is a platform core — not a phone app's insides.
 *
 * Everything asserted here is a claim `docs/platform/09-MULTIPLATFORM-ARCHITECTURE.md`
 * makes. A document that says "the data layer does not depend on React" is a
 * hope; a test that fails when someone adds the import is a guarantee. The
 * distinction matters because the cost of this being false is only discovered
 * on the day a web client is attempted, which is the most expensive possible
 * day to discover it.
 *
 * This file itself runs under plain Node: no React, no router, no DOM. If it
 * can import and exercise the whole core, so can a server, a web client, or
 * the bot.
 *
 * Run: npx tsx scripts/testPlatformCore.ts
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  resolveDestination, destinationKey, parseDestinationKey, type Destination,
} from '../src/platform/destinations';
import {
  load, save, clear, exportStore, importStore, type StoreDefinition,
} from '../src/platform/storage';
import { allKbModules, allKbArticles, resolveLinkRoute, kbLinkToDestination } from '../src/data/kb/registry';
import { kbTerms } from '../src/data/kb/glossary/terms';
import { allDxTrees } from '../src/data/kb/diagnostics/trees/index';
import { computeFindings } from '../src/data/project/verdicts';
import { search } from '../src/data/kb/search/query';
import { motors } from '../src/data/assembly/parts/motors';
import { batteries } from '../src/data/assembly/parts/batteries';
import { escs } from '../src/data/assembly/parts/escs';
import { buildStages } from '../src/data/assembly/buildStages';

const ROOT = join(import.meta.dirname, '..');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

console.log('\n[1] The data layer owes nothing to any user interface');
{
  const dataFiles = walk(join(ROOT, 'src/data'));
  ok(`the data layer is substantial enough for this to mean something (${dataFiles.length} files)`, dataFiles.length > 60);

  const offenders: string[] = [];
  for (const f of dataFiles) {
    const src = readFileSync(f, 'utf8');
    const rel = relative(ROOT, f);
    // Import statements only — the words appear legitimately in prose comments
    // about Betaflight windows and source documents.
    for (const m of src.matchAll(/^\s*import[^;]*?from\s+'([^']+)'/gmu)) {
      const spec = m[1];
      if (spec === 'react' || spec === 'react-dom' || spec === 'react-router-dom'
        || spec.startsWith('react/') || spec.includes('/components/')
        || spec.includes('/hooks/') || spec.includes('/views/')) {
        offenders.push(`${rel} → ${spec}`);
      }
    }
    if (/\.tsx$/.test(f)) offenders.push(`${rel} is a .tsx file inside the data layer`);
  }
  if (offenders.length) console.error('  UI coupling found:\n   - ' + offenders.join('\n   - '));
  ok('no file under src/data imports React, the router, a component, a hook or a view', offenders.length === 0);

  const platformFiles = walk(join(ROOT, 'src/platform'));
  const platformOffenders = platformFiles.filter(f =>
    /from\s+'(react|react-router-dom)'/.test(readFileSync(f, 'utf8')));
  ok('the platform layer is equally free of interface dependencies', platformOffenders.length === 0);
}

console.log('\n[2] The whole content core is reachable without an interface');
{
  ok(`every module loads outside React (${allKbModules.length})`, allKbModules.length >= 6);
  ok(`every article loads outside React (${allKbArticles().length})`, allKbArticles().length > 60);
  ok(`every glossary term loads outside React (${kbTerms.length})`, kbTerms.length > 100);
  ok(`every diagnostic tree loads outside React (${allDxTrees.length})`, allDxTrees.length >= 20);

  // Search must work with no router and no DOM.
  const hits = search('ESC');
  ok('search runs with no router and returns real results', hits.length > 0);
  const arabicHits = search('الفيلسيف');
  ok('…including on Arabic spelling variants', arabicHits.length > 0);
}

console.log('\n[3] The verdict engine runs on plain data');
{
  const conflicting = (() => {
    for (const m of motors) for (const b of batteries) {
      if (!m.specs.compatibleVoltages.includes(b.specs.sCount)) return { m, b };
    }
    return null;
  })();
  assert.ok(conflicting, 'expected an incompatible pair in the catalogue');

  const findings = computeFindings({
    exists: true, stageIndex: 0, totalStages: buildStages.length, parts: {},
    motor: conflicting.m, battery: conflicting.b, esc: escs[0],
  });
  ok('the engine produces findings with no React and no browser', findings.length > 0);
  ok('…and a blocker is still a blocker outside the app', findings.some(f => f.severity === 'blocker'));
  ok('…and every finding is plain serialisable data',
    JSON.parse(JSON.stringify(findings)).length === findings.length);
}

console.log('\n[4] Destinations are identities, and they resolve without a router');
{
  ok('a known article resolves through the KB checks',
    resolveDestination({ kind: 'article', id: 'esc-ratings' }, {
      articleExists: () => true, moduleIdOfArticle: () => 'esc',
    }) === '/kb/esc/esc-ratings');

  ok('an unknown article refuses rather than guessing a route',
    resolveDestination({ kind: 'article', id: 'not-a-real-article' }, {
      articleExists: () => false, moduleIdOfArticle: () => undefined,
    }) === null);

  ok('an article with no module lookup refuses rather than building a broken route',
    resolveDestination({ kind: 'article', id: 'esc-ratings' }) === null);

  ok('an empty id never resolves', resolveDestination({ kind: 'dx', id: '' }) === null);
  ok('an external link with no url never resolves',
    resolveDestination({ kind: 'external', url: '' }) === null);
  ok('a search destination carries its query safely',
    resolveDestination({ kind: 'search', query: 'ما هو ESC' }) === `/search?q=${encodeURIComponent('ما هو ESC')}`);

  // The identity must survive a round trip, because that is what a shared link,
  // a notification payload and a synced bookmark will actually carry.
  const samples: Destination[] = [
    { kind: 'article', id: 'esc-ratings' },
    { kind: 'module', id: 'rc-link' },
    { kind: 'glossary', id: 'crsf' },
    { kind: 'dx', id: 'dx-rc-no-link' },
    { kind: 'betaflight', id: 'ports' },
    { kind: 'lesson', id: 'lesson-esc-install' },
    { kind: 'roadmap', id: 'stage-3' },
    { kind: 'project' }, { kind: 'assembly' }, { kind: 'checklist' },
    { kind: 'coverage' }, { kind: 'diagnose' },
    { kind: 'search', query: 'binding' },
    { kind: 'external', url: 'https://www.expresslrs.org/' },
  ];
  const roundTripped = samples.every(d =>
    JSON.stringify(parseDestinationKey(destinationKey(d))) === JSON.stringify(d));
  ok(`every destination kind survives a key round trip (${samples.length})`, roundTripped);
  ok('a malformed key parses to null rather than a wrong destination',
    parseDestinationKey('nonsense') === null && parseDestinationKey('article:') === null);

  // A key must not be a route: routes change, identities must not.
  ok('a destination key is not a route', !destinationKey({ kind: 'article', id: 'esc-ratings' }).startsWith('/'));
}

console.log('\n[5] One resolver — content links go through the same door');
{
  const allLinks = allKbArticles().flatMap(a => a.links);
  ok(`the corpus declares a meaningful number of links (${allLinks.length})`, allLinks.length > 100);

  const broken = allLinks.filter(l => !resolveLinkRoute(l));
  if (broken.length) console.error('  broken:', broken.slice(0, 5));
  ok('every declared content link resolves', broken.length === 0);

  ok('every content link also has an abstract identity a web client could use',
    allLinks.every(l => kbLinkToDestination(l) !== null));

  ok('a link to a deleted article resolves to null, not to a broken path',
    resolveLinkRoute({ kind: 'article', targetId: 'deleted-article', label: 'x' }) === null);

  const registrySrc = readFileSync(join(ROOT, 'src/data/kb/registry.ts'), 'utf8');
  ok('the registry no longer builds route strings itself — it delegates',
    registrySrc.includes('resolveDestination') && !/return `\/kb\/\$\{a\.moduleId\}/.test(registrySrc));
}

console.log('\n[6] Local data is modelled, versioned, validated and portable');
{
  // An in-memory stand-in for localStorage, so the contract can be exercised
  // in Node exactly as a browser would exercise it.
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
  };

  interface Demo { name: string; count: number }
  const DEMO: StoreDefinition<Demo> = {
    key: 'test-demo-store',
    version: 2,
    validate: raw => {
      if (typeof raw !== 'object' || raw === null) return null;
      const r = raw as Partial<Demo>;
      if (typeof r.name !== 'string' || typeof r.count !== 'number') return null;
      return { name: r.name, count: r.count };
    },
    migrate: (data, from) => {
      if (from !== 1) return null;
      const d = data as { name?: string };
      return typeof d?.name === 'string' ? { name: d.name, count: 0 } : null;
    },
  };

  save(DEMO, { name: 'a', count: 3 });
  ok('a saved value reads back intact', JSON.stringify(load(DEMO)) === JSON.stringify({ name: 'a', count: 3 }));

  mem.set(DEMO.key, JSON.stringify({ v: 2, data: { name: 'a', count: 'three' } }));
  ok('a corrupt value is rejected whole rather than partially trusted', load(DEMO) === null);

  mem.set(DEMO.key, JSON.stringify({ v: 1, data: { name: 'old' } }));
  ok('an older schema version is migrated, not discarded',
    JSON.stringify(load(DEMO)) === JSON.stringify({ name: 'old', count: 0 }));

  mem.set(DEMO.key, JSON.stringify({ v: 99, data: { name: 'x', count: 1 } }));
  ok('a version with no migration path is refused rather than guessed', load(DEMO) === null);

  save(DEMO, { name: 'export me', count: 7 });
  const exported = exportStore(DEMO, 1700000000000);
  ok('a store exports as plain data', !!exported && exported.key === DEMO.key && exported.v === 2);
  ok('…carrying the value, not the envelope',
    JSON.stringify(exported?.data) === JSON.stringify({ name: 'export me', count: 7 }));
  ok('…and it survives JSON, which is what a file or a sync payload requires',
    JSON.stringify(JSON.parse(JSON.stringify(exported))) === JSON.stringify(exported));

  clear(DEMO);
  ok('a cleared store is genuinely gone', load(DEMO) === null);

  const restored = importStore(DEMO, JSON.parse(JSON.stringify(exported)));
  ok('an export imports back into a working store',
    JSON.stringify(restored) === JSON.stringify({ name: 'export me', count: 7 })
    && JSON.stringify(load(DEMO)) === JSON.stringify({ name: 'export me', count: 7 }));

  ok('an export belonging to another key is refused',
    importStore(DEMO, { key: 'someone-else', v: 2, data: { name: 'x', count: 1 } }) === null);
  ok('an import is not a privileged writer — a corrupt payload is still rejected',
    importStore(DEMO, { key: DEMO.key, v: 2, data: { name: 5 } }) === null);

  clear(DEMO);
}

console.log('\n[7] The project store is the platform\'s, not a screen\'s');
{
  const storeSrc = readFileSync(join(ROOT, 'src/data/project/store.ts'), 'utf8');
  ok('it lives in the data layer', storeSrc.length > 0);
  ok('it stores ids, never part objects — the decision that makes sync possible',
    /partIds:\s*Record<string, string>/.test(storeSrc) && storeSrc.includes('part.id'));
  ok('it carries a schema version', /SCHEMA_VERSION/.test(storeSrc));
  ok('it goes through the storage contract instead of touching localStorage directly',
    storeSrc.includes("from '../../platform/storage'") && !/localStorage\./.test(storeSrc));
  ok('it can export and import a project', /export function exportAssemblyProject/.test(storeSrc)
    && /export function importAssemblyProject/.test(storeSrc));

  // Nothing may reach back into the Assembly component folder for the project.
  const dataFiles = walk(join(ROOT, 'src/data'));
  const reachBack = dataFiles.filter(f => /components\/Assembly/.test(readFileSync(f, 'utf8').match(/^\s*import[^;]*$/gmu)?.join('\n') ?? ''));
  ok('no data-layer file imports from the Assembly component folder', reachBack.length === 0);
}

console.log('\n[8] Identities do not encode routes');
{
  const idBearing = [
    ...allKbArticles().map(a => a.id),
    ...allKbModules.map(m => m.id),
    ...kbTerms.map(t => t.id),
    ...allDxTrees.map(t => t.id),
  ];
  ok(`a large identity surface is checked (${idBearing.length})`, idBearing.length > 200);
  ok('no identity contains a slash, a path segment, or a URL',
    idBearing.every(id => !id.includes('/') && !id.includes('#') && !id.startsWith('http')));
  ok('every identity is non-empty and trimmed', idBearing.every(id => id.length > 0 && id === id.trim()));
  ok('identities are unique across their own kind',
    new Set(allKbArticles().map(a => a.id)).size === allKbArticles().length
    && new Set(kbTerms.map(t => t.id)).size === kbTerms.length
    && new Set(allDxTrees.map(t => t.id)).size === allDxTrees.length);
}

console.log('\n[9] Safety rules live in the data, so every surface inherits them');
{
  const propTrees = allDxTrees.filter(t => t.removeProps);
  ok(`most diagnostic trees declare their propeller posture in data (${propTrees.length}/${allDxTrees.length})`,
    propTrees.length >= allDxTrees.length / 2);
  ok('every tree declares a risk level and stop conditions in data',
    allDxTrees.every(t => !!t.risk && t.stopConditions.length > 0));
  ok('every article declares a safety level in data',
    allKbArticles().every(a => !!a.safetyLevel));

  // A surface must not be able to render a motor test without the warning,
  // because the warning is not the surface's to decide.
  const motorTrees = allDxTrees.filter(t =>
    t.nodes.some(n => n.checkClass === 'functional' && /محرك|المحركات/.test(n.how)));
  ok(`every tree whose functional check spins a motor demands props off (${motorTrees.length})`,
    motorTrees.length > 0 && motorTrees.every(t => t.removeProps));
}

console.log(`\n✅ testPlatformCore: ${passed} assertions passed\n`);
