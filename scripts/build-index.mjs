#!/usr/bin/env node
/**
 * Build index.yaml from apps/*.yaml + featured.yaml.
 *
 * The output shape is AuraOS's `IndexDocument` (packages/core/src/nexus/types.ts):
 *   { schema, apps[], featured[], categories[] }
 * CatalogAggregator parses it leniently, but we emit the full document so the
 * store degrades predictably.
 *
 * index.yaml is GENERATED - never hand-edit it. CI rebuilds it on merge, and
 * `--check` fails if the committed copy is stale.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { loadEntries, loadFeatured, CATEGORIES, ROOT, red, green, dim } from './lib.mjs';

const CHECK = process.argv.includes('--check');
const OUT = join(ROOT, 'index.yaml');

/** Emit keys in a stable, human-readable order so diffs stay reviewable. */
const KEY_ORDER = ['id', 'name', 'description', 'publisher', 'homepage', 'icon',
                   'categories', 'tags', 'screenshots', 'sources', 'channels'];
function ordered(entry) {
  const out = {};
  for (const k of KEY_ORDER) if (entry[k] !== undefined) out[k] = entry[k];
  for (const k of Object.keys(entry)) if (!(k in out)) out[k] = entry[k]; // never drop unknown keys
  return out;
}

const apps = loadEntries()
  .map(({ entry }) => ordered(entry))
  .sort((a, b) => a.id.localeCompare(b.id));

const featured = loadFeatured().filter((id) => apps.some((a) => a.id === id));

const doc = { schema: 1, apps, featured, categories: CATEGORIES };

const header = [
  '# GENERATED FILE - DO NOT EDIT.',
  '#',
  '# Built from apps/*.yaml by scripts/build-index.mjs.',
  '# Edit the per-app file and open a PR; CI regenerates this on merge.',
  '#',
  `# apps: ${apps.length}`,
  '',
].join('\n');

const yaml = header + stringify(doc, { lineWidth: 0 });

if (CHECK) {
  if (!existsSync(OUT)) {
    console.log(red('FAIL  index.yaml is missing - run: node scripts/build-index.mjs'));
    process.exit(1);
  }
  if (readFileSync(OUT, 'utf8') !== yaml) {
    console.log(red('FAIL  index.yaml is stale - run: node scripts/build-index.mjs'));
    process.exit(1);
  }
  console.log(green(`OK - index.yaml is up to date (${apps.length} app(s))`));
  process.exit(0);
}

writeFileSync(OUT, yaml);
console.log(green(`Wrote index.yaml`) + dim(` - ${apps.length} app(s), ${featured.length} featured`));
