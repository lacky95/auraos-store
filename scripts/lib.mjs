/**
 * Shared helpers for the store tooling.
 *
 * The category taxonomy is duplicated from AuraOS's `defaultIndex.ts` on
 * purpose: this repo has no dependency on the OS, and the OS merges its own
 * seed taxonomy last anyway. If the OS ever adds a category, mirror it here
 * AND in schema/entry.schema.json (the `categories` enum).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const APPS_DIR = join(ROOT, 'apps');

export const CATEGORIES = [
  { slug: 'system',       label: 'System',       description: 'Core OS services and infrastructure.' },
  { slug: 'developer',    label: 'Developer',    description: 'Tools for building and debugging.' },
  { slug: 'productivity', label: 'Productivity', description: 'Get things done.' },
  { slug: 'utility',      label: 'Utilities',    description: 'Small, single-purpose helpers.' },
  { slug: 'media',        label: 'Media',        description: 'Audio, video, and images.' },
];

/** Every apps/*.yaml as { file, name, fileId, entry }. Sorted by filename. */
export function loadEntries() {
  if (!existsSync(APPS_DIR)) return [];
  return readdirSync(APPS_DIR)
    .filter((f) => /\.ya?ml$/i.test(f))
    .sort()
    .map((f) => {
      const file = join(APPS_DIR, f);
      let entry;
      try {
        entry = parse(readFileSync(file, 'utf8'));
      } catch (err) {
        throw new Error(`${f}: not valid YAML - ${err.message}`);
      }
      return { file, name: f, fileId: basename(f).replace(/\.ya?ml$/i, ''), entry };
    });
}

/** featured.yaml -> string[] of app ids (missing file = nothing featured). */
export function loadFeatured() {
  const p = join(ROOT, 'featured.yaml');
  if (!existsSync(p)) return [];
  const doc = parse(readFileSync(p, 'utf8'));
  return Array.isArray(doc?.featured) ? doc.featured : [];
}

/* ---- tiny console helpers (ESC written as an escape, never a literal) ---- */
const ESC = String.fromCharCode(27);
const useColor = process.stdout.isTTY && !process.env['NO_COLOR'];
const paint = (code, s) => (useColor ? `${ESC}[${code}m${s}${ESC}[0m` : s);
export const red    = (s) => paint('31', s);
export const green  = (s) => paint('32', s);
export const yellow = (s) => paint('33', s);
export const dim    = (s) => paint('2',  s);
