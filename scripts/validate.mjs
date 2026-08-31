#!/usr/bin/env node
/**
 * Validate every apps/*.yaml.
 *
 * Run offline (schema + local consistency only) with --no-network; CI runs the
 * full set, which also proves the source actually exists and really is an
 * AuraOS app.
 *
 * Exit code 1 = errors. Warnings never fail the build, but the capability
 * warnings below are what a human reviewer must look at before merging.
 */
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import Ajv from 'ajv/dist/2020.js';   // schema declares draft 2020-12
import addFormats from 'ajv-formats';
import { loadEntries, loadFeatured, ROOT, red, green, yellow, dim } from './lib.mjs';

const NETWORK = !process.argv.includes('--no-network');

const errors = [];
const warnings = [];
const err  = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

/* Capabilities that hand an app real power over the host or other apps.
 * `docker` is effectively host root (the socket), `*` grants every installed
 * tool, and a dataProvider claims a global authority other apps can read. */
const RISKY_TOOLS = new Set(['docker', '*']);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(readFileSync(join(ROOT, 'schema/entry.schema.json'), 'utf8'));
const validateEntry = ajv.compile(schema);

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000, ...opts,
  }).trim();
}
function have(bin) {
  try { sh('sh', ['-c', `command -v ${bin}`]); return true; } catch { return false; }
}

/** Read an app.manifest.json from a git source without a full clone when we can. */
async function fetchGitManifest(gitRef, tag) {
  const m = /^github\.com\/([^/]+)\/([^/]+)$/.exec(gitRef);
  if (m) {
    const url = `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${tag}/app.manifest.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (res.ok) return JSON.parse(await res.text());
    if (res.status === 404) throw new Error(`no app.manifest.json at ${gitRef}@${tag} (404)`);
  }
  // Non-GitHub host, or raw fetch failed: shallow clone.
  const dir = mkdtempSync(join(tmpdir(), 'aura-store-'));
  try {
    sh('git', ['clone', '--depth', '1', '--branch', tag, `https://${gitRef}`, dir], { timeout: 60_000 });
    const p = join(dir, 'app.manifest.json');
    if (!existsSync(p)) throw new Error(`no app.manifest.json at the repo root of ${gitRef}@${tag}`);
    return JSON.parse(readFileSync(p, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function inspectManifest(file, entry, manifest) {
  if (manifest.id !== entry.id) {
    err(file, `manifest id "${manifest.id}" does not match entry id "${entry.id}"`);
  }
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
  const risky = tools.filter((t) => RISKY_TOOLS.has(t));
  if (risky.length) {
    warn(file, `REVIEW: requests privileged tools [${risky.join(', ')}] - "docker" is host root via the socket, "*" grants every tool`);
  }
  if (manifest.dataProvider) {
    warn(file, `REVIEW: declares dataProvider authority "${manifest.dataProvider.authority ?? '?'}" - readable by other apps`);
  }
  const perms = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  if (perms.length) warn(file, `declares permissions [${perms.join(', ')}]`);
}

/* ---- main ------------------------------------------------------------ */
let entries;
try {
  entries = loadEntries();
} catch (e) {
  console.error(red(`FAIL  ${e.message}`));
  process.exit(1);
}

if (entries.length === 0) {
  console.log(yellow('No entries in apps/ - nothing to validate.'));
}

const seen = new Map();

for (const { name, fileId, entry } of entries) {
  if (entry === null || typeof entry !== 'object') { err(name, 'file is empty or not a YAML mapping'); continue; }

  if (!validateEntry(entry)) {
    for (const e of validateEntry.errors) {
      err(name, `schema${e.instancePath || ''} ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : ''}`);
    }
    continue; // later checks assume a well-formed entry
  }

  // id <-> filename <-> uniqueness
  if (entry.id !== fileId) err(name, `id "${entry.id}" must equal the filename (expected apps/${entry.id}.yaml)`);
  if (seen.has(entry.id)) err(name, `duplicate id, already defined in ${seen.get(entry.id)}`);
  else seen.set(entry.id, name);

  // channels must match the declared source kinds
  const channels = entry.channels ?? {};
  if (!channels.stable) {
    warn(name, 'no "stable" channel - the resolver defaults to stable, so bare-id installs will fail');
  }
  for (const [chan, spec] of Object.entries(channels)) {
    if (spec['git-tag'] && !entry.sources.git) err(name, `channel "${chan}" sets git-tag but there is no git source`);
    if (spec['oci-tag'] && !entry.sources.oci) err(name, `channel "${chan}" sets oci-tag but there is no oci source`);
  }

  if (!NETWORK) continue;

  // --- reachability + "is it really this app" -------------------------
  if (entry.sources.git) {
    const ref = entry.sources.git.ref;
    let tags = '';
    try {
      tags = sh('git', ['ls-remote', '--tags', '--heads', `https://${ref}`]);
    } catch {
      err(name, `git source unreachable: https://${ref}`);
    }
    if (tags) {
      for (const [chan, spec] of Object.entries(channels)) {
        const tag = spec['git-tag'];
        if (!tag) continue;
        const hit = new RegExp(`refs/(tags|heads)/${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\^\\{\\})?$`, 'm').test(tags);
        if (!hit) err(name, `channel "${chan}" git-tag "${tag}" not found in ${ref}`);
      }
      const probeTag = channels.stable?.['git-tag'] ?? entry.sources.git['default-branch'] ?? 'HEAD';
      try {
        inspectManifest(name, entry, await fetchGitManifest(ref, probeTag));
      } catch (e) {
        err(name, `could not read app.manifest.json - ${e.message}`);
      }
    }
  }

  if (entry.sources.oci) {
    if (!have('oras')) {
      warn(name, 'oras not installed - skipped OCI reachability check');
    } else {
      for (const [chan, spec] of Object.entries(channels)) {
        const tag = spec['oci-tag'];
        if (!tag) continue;
        try {
          sh('oras', ['manifest', 'fetch', `${entry.sources.oci.ref}:${tag}`]);
        } catch {
          err(name, `channel "${chan}" oci-tag "${tag}" not fetchable from ${entry.sources.oci.ref}`);
        }
      }
    }
  }
}

// featured.yaml must only reference apps we actually list
for (const id of loadFeatured()) {
  if (!seen.has(id)) err('featured.yaml', `"${id}" is featured but has no apps/${id}.yaml`);
}

/* ---- report ---------------------------------------------------------- */
for (const w of warnings) console.log(yellow(`WARN  ${w}`));
for (const e of errors)   console.log(red(`FAIL  ${e}`));

console.log('');
console.log(dim(`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} checked${NETWORK ? '' : ' (offline)'}`));
if (errors.length) {
  console.log(red(`${errors.length} error(s), ${warnings.length} warning(s)`));
  process.exit(1);
}
console.log(green(`OK - 0 errors, ${warnings.length} warning(s)`));
