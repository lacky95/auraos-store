#!/usr/bin/env node
/**
 * Build index.yaml (+ index.json) from apps/*.yaml + featured.yaml.
 *
 * The output shape is AuraOS's `IndexDocument` (packages/core/src/nexus/types.ts):
 *   { schema, apps[], featured[], categories[] }
 * CatalogAggregator parses it leniently, but we emit the full document so the
 * store degrades predictably.
 *
 * index.json is the SAME document, for consumers with no YAML parser - chiefly
 * index.html, the store's own web front page, which fetches it at runtime.
 * AuraOS always reads index.yaml; the JSON twin exists so the web page needs
 * neither a build step nor a client-side YAML library.
 *
 * Both files are GENERATED - never hand-edit them. CI rebuilds them on merge,
 * and `--check` fails if either committed copy is stale.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { loadEntries, loadFeatured, CATEGORIES, ROOT, red, green, dim } from './lib.mjs';

const CHECK = process.argv.includes('--check');
const OUT = join(ROOT, 'index.yaml');
const OUT_JSON = join(ROOT, 'index.json');

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

// JSON has no comment syntax, so the "generated" warning has to live inside the
// document. `_generated` is an unknown key to AuraOS's lenient parser and to
// index.html alike, which is why it is safe to carry.
const json = JSON.stringify(
  { _generated: 'Built from apps/*.yaml by scripts/build-index.mjs - do not edit.', ...doc },
  null, 2) + '\n';

if (CHECK) {
  for (const [file, want] of [[OUT, yaml], [OUT_JSON, json]]) {
    const name = file.slice(ROOT.length + 1);
    if (!existsSync(file)) {
      console.log(red(`FAIL  ${name} is missing - run: node scripts/build-index.mjs`));
      process.exit(1);
    }
    if (readFileSync(file, 'utf8') !== want) {
      console.log(red(`FAIL  ${name} is stale - run: node scripts/build-index.mjs`));
      process.exit(1);
    }
  }
  console.log(green(`OK - index.yaml + index.json are up to date (${apps.length} app(s))`));
  process.exit(0);
}

writeFileSync(OUT, yaml);
writeFileSync(OUT_JSON, json);
console.log(green('Wrote index.yaml + index.json') + dim(` - ${apps.length} app(s), ${featured.length} featured`));
