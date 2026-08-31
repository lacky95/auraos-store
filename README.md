# AuraOS Store

The official app catalogue for [AuraOS](https://github.com/lacky95/auraos).

This repository **is** the store. It holds one YAML file per app describing
where that app lives; `index.yaml` is generated from those files and served to
every AuraOS instance.

We host the catalogue, not the code: each app stays in its author's own git repo
or container registry. That keeps the store cheap to run, keeps publishers in
control of their releases, and makes review — not hosting — the thing we
actually provide.

## Using the store

Register it in a running AuraOS:

```sh
aura nexus registry add official \
  https://raw.githubusercontent.com/<OWNER>/auraos-store/main/index.yaml \
  --kind git-index --priority 10
```

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
| `index.yaml` | **Generated.** Never edit by hand |
| `schema/entry.schema.json` | JSON Schema for one entry |
| `scripts/validate.mjs` | Schema, consistency and reachability checks |
| `scripts/build-index.mjs` | `apps/*.yaml` → `index.yaml` |
| `POLICY.md` | What we accept, and what we do not promise |

## Working on the tooling

```sh
npm install
node scripts/validate.mjs --no-network   # schema + consistency only
node scripts/validate.mjs                # + reachability (needs network)
node scripts/build-index.mjs             # regenerate index.yaml
node scripts/build-index.mjs --check     # fail if index.yaml is stale
```

Licensed Apache-2.0.
