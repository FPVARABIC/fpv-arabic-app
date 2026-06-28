/**
 * Build-time script: reads all AKL YAML files and emits aklIndex.generated.ts.
 *
 * Run with: npx tsx scripts/buildAklIndex.ts
 *
 * No external YAML parser required — uses targeted field extraction that
 * handles exactly the patterns present in AKL files. If a file is malformed
 * or missing required fields (conceptId, definition.text), it is skipped
 * with a warning; the rest of the index is still written.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ── Entry type (mirrored in aklIndex.generated.ts) ────────────────────────────

interface AklEntry {
  conceptId: string;
  shortAnswer: string;
  explanation: string;
  aliases: string[];
}

// ── YAML field extraction ──────────────────────────────────────────────────────
// Handles the specific subset of YAML used in AKL files:
//   - simple scalar:  key: value
//   - folded/literal block: key: >\n    content...\n  or key: |\n    content...
//   - list items:     - value

function extractConceptId(content: string): string {
  return content.match(/^  conceptId:\s*(\S+)/m)?.[1]?.trim() ?? '';
}

/**
 * Extracts a folded/literal block scalar value from a given top-level section.
 * E.g. extractBlockScalar(content, 'definition') finds definition.text.
 */
function extractBlockScalar(content: string, section: string): string {
  const sectionIdx = content.search(new RegExp(`^${section}:`, 'm'));
  if (sectionIdx === -1) return '';

  const afterSection = content.slice(sectionIdx);

  // Find "  text: >" or "  text: |" (2-space indent, block scalar indicator)
  const fieldMatch = /^  text:\s*[>|]/m.exec(afterSection);
  if (!fieldMatch) return '';

  const afterField = afterSection.slice(fieldMatch.index + fieldMatch[0].length);
  const collected: string[] = [];

  for (const line of afterField.split('\n')) {
    if (line.startsWith('    ')) {
      // 4-space indent = content line
      const t = line.trim();
      if (t) collected.push(t);
    } else if (line.trim() === '') {
      // blank lines within block scalar — skip
      continue;
    } else {
      // Any other indent level ends the block
      break;
    }
  }

  return collected.join(' ').trim();
}

/**
 * Extracts all list items from the `aliases:` section, combining ar/en/transliteration.
 */
function extractAliases(content: string): string[] {
  const aliasIdx = content.search(/^aliases:/m);
  if (aliasIdx === -1) return [];

  // Slice from "aliases:" to the next top-level key
  const afterHeader = content.slice(aliasIdx);
  const bodyStart = afterHeader.indexOf('\n') + 1;
  const body = afterHeader.slice(bodyStart);

  const endMatch = /^[a-zA-Z]/m.exec(body);
  const aliasSection = endMatch ? body.slice(0, endMatch.index) : body;

  const aliases: string[] = [];
  const re = /^    - (.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(aliasSection)) !== null) {
    const alias = m[1].trim();
    if (alias) aliases.push(alias);
  }
  return aliases;
}

function parseYaml(content: string): AklEntry | null {
  const conceptId = extractConceptId(content);
  const shortAnswer = extractBlockScalar(content, 'definition');
  const explanation = extractBlockScalar(content, 'beginnerExplanation');
  const aliases = extractAliases(content);

  if (!conceptId || !shortAnswer) return null;
  return { conceptId, shortAnswer, explanation, aliases };
}

// ── File discovery ─────────────────────────────────────────────────────────────

function findYamlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findYamlFiles(full));
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      results.push(full);
    }
  }
  return results;
}

// ── TypeScript output ──────────────────────────────────────────────────────────

function escapeTemplateLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function generateTs(entries: AklEntry[]): string {
  const lines: string[] = [
    '// AUTO-GENERATED — do not edit by hand.',
    '// Regenerate: npx tsx scripts/buildAklIndex.ts',
    '',
    'export interface AklIndexEntry {',
    '  conceptId: string;',
    '  /** Definition text — max 2 sentences. */',
    '  shortAnswer: string;',
    '  /** Beginner explanation — used as definition-mode step. */',
    '  explanation: string;',
    '  /** Combined ar + en + transliteration aliases for query matching. */',
    '  aliases: string[];',
    '}',
    '',
    'export const aklIndex: readonly AklIndexEntry[] = [',
  ];

  for (const e of entries) {
    const aliasLines = e.aliases
      .map(a => `    ${JSON.stringify(a)},`)
      .join('\n');
    lines.push('  {');
    lines.push(`    conceptId: ${JSON.stringify(e.conceptId)},`);
    lines.push(`    shortAnswer: \`${escapeTemplateLiteral(e.shortAnswer)}\`,`);
    lines.push(`    explanation: \`${escapeTemplateLiteral(e.explanation)}\`,`);
    lines.push('    aliases: [');
    if (aliasLines) lines.push(aliasLines);
    lines.push('    ],');
    lines.push('  },');
  }

  lines.push('];', '');
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const aklDir = join(ROOT, 'src', 'data', 'lkb', 'akl');
const outFile = join(ROOT, 'src', 'data', 'lkb', 'aklIndex.generated.ts');

const yamlFiles = findYamlFiles(aklDir).sort();
console.log(`Found ${yamlFiles.length} YAML files in ${aklDir}\n`);

const entries: AklEntry[] = [];
let skipped = 0;

for (const file of yamlFiles) {
  try {
    const content = readFileSync(file, 'utf8');
    const entry = parseYaml(content);
    if (entry) {
      entries.push(entry);
      console.log(`  ✓  ${entry.conceptId.padEnd(48)} ${entry.aliases.length} aliases`);
    } else {
      console.warn(`  ✗  SKIP ${file} — missing conceptId or definition.text`);
      skipped++;
    }
  } catch (err) {
    console.error(`  ✗  ERROR reading ${file}: ${err}`);
    skipped++;
  }
}

writeFileSync(outFile, generateTs(entries), 'utf8');

console.log(`\n─────────────────────────────────────────────`);
console.log(`Written: ${outFile}`);
console.log(`Entries: ${entries.length} concepts indexed`);
if (skipped > 0) console.warn(`Skipped: ${skipped} files`);
