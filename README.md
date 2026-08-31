# AuraOS Store

The official app catalogue for [AuraOS](https://github.com/lacky95/auraos).

This repository **is** the store. It holds one YAML file per app describing
where that app lives; `index.yaml` is generated from those files and served to
every AuraOS instance. `index.html` is the store's public web front page —
served at **[nexus.aura.lakner.io](https://nexus.aura.lakner.io)**, it renders
the catalogue straight from `index.json` with no build step and no server.

We host the catalogue, not the code: each app stays in its author's own git repo
or container registry. That keeps the store cheap to run, keeps publishers in
control of their releases, and makes review — not hosting — the thing we
actually provide.

## Using the store

Register it in a running AuraOS:

```sh
aura nexus registry add official \
  https://nexus.aura.lakner.io/index.yaml \
  --kind git-index --priority 10
```

The raw GitHub URL
(`https://raw.githubusercontent.com/<OWNER>/auraos-store/main/index.yaml`) works
identically if you would rather not depend on the hosted domain. Either way the
`.yaml` suffix puts `CatalogAggregator` on its direct-`fetch` path, so AuraOS
never clones this repo.

Then browse it in the **Nexus** app, or:

```sh
aura nexus search
aura nexus app info    com.example.hello
aura nexus app install com.example.hello
```

Priority `10` sits behind the built-in `local` registry (priority 0), so an app
you are developing locally still shadows the published one.

## Submitting an app

See **[CONTRIBUTING.md](CONTRIBUTING.md)**. In short: add `apps/<your.app.id>.yaml`,
open a PR, and CI checks it.

## Repository layout

| Path | What it is |
|---|---|
| `apps/<id>.yaml` | One file per app — **the source of truth** |
| `featured.yaml` | Hand-curated featured list |
| `index.yaml` | **Generated.** Never edit by hand — what AuraOS reads |
| `index.json` | **Generated.** The same document, for `index.html` |
| `index.html` | The public store page. Static; fetches `index.json` at runtime |
| `schema/entry.schema.json` | JSON Schema for one entry |
| `scripts/validate.mjs` | Schema, consistency and reachability checks |
| `scripts/build-index.mjs` | `apps/*.yaml` → `index.yaml` |
| `POLICY.md` | What we accept, and what we do not promise |

## Working on the tooling

```sh
npm install
node scripts/validate.mjs --no-network   # schema + consistency only
node scripts/validate.mjs                # + reachability (needs network)
node scripts/build-index.mjs             # regenerate index.yaml + index.json
node scripts/build-index.mjs --check     # fail if either is stale
```

### Hosting the page

`index.html`, `index.json` and `index.yaml` are plain static files at the repo
root, so any static host works — GitHub Pages from the repository root, or a
bucket behind `nexus.aura.lakner.io`. There is nothing to build: CI regenerates
the two index files on merge, and the page reads them relatively, so it works
from a subpath as well as from a domain root.

Licensed Apache-2.0.
