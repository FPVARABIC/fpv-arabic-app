/**
 * Build-time script: reads app data sources and emits appManifest.generated.ts.
 *
 * Run with: npx tsx scripts/buildAppManifest.ts
 *
 * Extracts ONLY structural metadata (id, title, route, type, conceptIds, order).
 * Content fields (explanation, steps, importantPoints, etc.) are never copied.
 * conceptIds arrays are empty in Phase 0 — they are populated in future phases
 * when source data files gain conceptId annotations.
 *
 * If a resource is removed from its source data file it automatically disappears
 * from the manifest on next build — no manual cleanup required.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lessonsData } from '../src/data/lessonsData';
import { roadmapData } from '../src/data/roadmapData';
import { betaflightData } from '../src/data/betaflightData';
import { checklistsData } from '../src/data/checklistsData';
import { troubleshootingData } from '../src/data/troubleshootingData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'src', 'data', 'manifest');
const OUT_FILE = join(OUT_DIR, 'appManifest.generated.ts');

// ── Resource type ──────────────────────────────────────────────────────────────

type ResourceType =
  | 'lesson'
  | 'roadmap_step'
  | 'betaflight_section'
  | 'checklist_group'
  | 'troubleshooting_item';

interface RawResource {
  id: string;
  title: string;
  route: string;
  type: ResourceType;
  conceptIds: string[];
  order?: number;
}

// ── Extract structural fields only ─────────────────────────────────────────────

const resources: RawResource[] = [];

// Lessons → /lessons/:id (has a dedicated detail view)
for (const l of lessonsData) {
  resources.push({
    id: l.id,
    title: l.title,
    route: `/lessons/${l.id}`,
    type: 'lesson',
    conceptIds: [],
    order: l.number,
  });
}

// Roadmap steps → /roadmap (single-view, no detail route)
for (const s of roadmapData) {
  resources.push({
    id: s.id,
    title: s.title,
    route: '/roadmap',
    type: 'roadmap_step',
    conceptIds: s.conceptIds ?? [],
    order: s.number,
  });
}

// Betaflight sections → /betaflight/:id (has a dedicated detail view)
for (const b of betaflightData) {
  resources.push({
    id: b.id,
    title: b.title,
    route: `/betaflight/${b.id}`,
    type: 'betaflight_section',
    conceptIds: [],
  });
}

// Checklist groups → /checklists (single-view, no detail route)
for (const c of checklistsData) {
  resources.push({
    id: c.id,
    title: c.title,
    route: '/checklists',
    type: 'checklist_group',
    conceptIds: [],
  });
}

// Troubleshooting items → /troubleshooting (single-view, no detail route)
for (const t of troubleshootingData) {
  resources.push({
    id: t.id,
    title: t.problem,
    route: '/troubleshooting',
    type: 'troubleshooting_item',
    conceptIds: [],
  });
}

// ── TypeScript generation ──────────────────────────────────────────────────────

function renderResource(r: RawResource): string {
  const order = r.order !== undefined ? `, order: ${r.order}` : '';
  return (
    `  { id: ${JSON.stringify(r.id)}, ` +
    `title: ${JSON.stringify(r.title)}, ` +
    `route: ${JSON.stringify(r.route)}, ` +
    `type: '${r.type}', ` +
    `conceptIds: ${JSON.stringify(r.conceptIds)}${order} }`
  );
}

function generateTs(): string {
  const byType = (t: ResourceType) => resources.filter(r => r.type === t);

  const sections: string[] = [];
  sections.push(...byType('lesson').map(r => renderResource(r)));
  sections.push(...byType('roadmap_step').map(r => renderResource(r)));
  sections.push(...byType('betaflight_section').map(r => renderResource(r)));
  sections.push(...byType('checklist_group').map(r => renderResource(r)));
  sections.push(...byType('troubleshooting_item').map(r => renderResource(r)));

  return [
    '// AUTO-GENERATED — do not edit by hand.',
    '// Source: scripts/buildAppManifest.ts',
    '// Regenerate: npm run predev  (or npm run build)',
    '',
    "export type AppResourceType =",
    "  | 'lesson'",
    "  | 'roadmap_step'",
    "  | 'betaflight_section'",
    "  | 'checklist_group'",
    "  | 'troubleshooting_item';",
    '',
    'export interface AppResource {',
    '  readonly id: string;',
    '  readonly title: string;',
    '  readonly route: string;',
    '  readonly type: AppResourceType;',
    '  /** Phase 0: always empty. Populated once source data gains conceptId annotations. */',
    '  readonly conceptIds: readonly string[];',
    '  readonly order?: number;',
    '}',
    '',
    'export const appManifest: readonly AppResource[] = [',
    sections.join(',\n'),
    '];',
    '',
    `export const MANIFEST_RESOURCE_COUNT = ${resources.length};`,
    '',
  ].join('\n');
}

// ── Write ──────────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, generateTs(), 'utf8');

const counts: Record<string, number> = {};
for (const r of resources) counts[r.type] = (counts[r.type] ?? 0) + 1;

console.log(`[buildAppManifest] ${resources.length} resources → ${OUT_FILE}`);
for (const [type, count] of Object.entries(counts)) {
  console.log(`  ${type.padEnd(26)} ${count}`);
}
