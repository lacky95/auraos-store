# Submitting an app

Adding your app to the store is one YAML file and a pull request.

## 1. Publish your app somewhere

The store never hosts your code — it points at it. Pick the lane that matches
what your app needs to run:

| Your app | What to do | Entry points at |
|---|---|---|
| Runs from source, only needs `npm install` | Push it to a git repo with `app.manifest.json` **at the repo root**, and tag a release. AuraOS installs dependencies on first launch. | `sources.git` |
| Needs a real build (`next build`, bundling, compiled assets) | Build it in **your own CI**, then publish the built app as an OCI artifact (below). | `sources.oci` |
| Is a service, a binary, or an existing container image | Wrap it with `runtime: "raw"` and an `entrypoint.sh`, then publish as OCI. | `sources.oci` |

We do not build submissions. You publish, we list.

### Publishing an OCI artifact

From your app directory, with [`oras`](https://oras.land) installed
(`aura cap install oras`):

```sh
npm ci && npm run build
aura nexus app publish --kind oci --to ghcr.io/<you> -y
```

That pushes a bundle to `ghcr.io/<you>/aura-apps/<your.app.id>` tagged with your
version, your channel, and `latest`. Make the package **public** so the store
can read it.

There is a reusable GitHub Action in this repo
(`.github/workflows/publish-app.yml`) that does build → push for you; see the
header of that file for how to call it from your own repository.

## 2. Add your entry

Create `apps/<your.app.id>.yaml`. The filename must equal the `id`, and the `id`
must equal the one in your `app.manifest.json`.

```yaml
id: com.example.hello           # reverse-domain; == filename == manifest id
name: Hello
description: One line, max 200 characters.
publisher: Example Ltd
homepage: https://example.com
icon: HEL                      # 1-3 character glyph, NOT a URL
categories: [utility]           # system | developer | productivity | utility | media
tags: [demo]
screenshots:                    # absolute https - AuraOS hosts no images
  - https://example.com/shot-1.png
sources:
  git:
    ref: github.com/example/hello         # no scheme, no .git
    default-branch: main
  # or, for a prebuilt app:
  # oci:
  #   ref: ghcr.io/example/aura-apps/com.example.hello   # NO tag here
channels:
  stable:
    git-tag: v1.0.0             # use oci-tag for an OCI source
```

A copy you can start from lives in [`docs/example-entry.yaml`](docs/example-entry.yaml).

**`stable` is required in practice** — installing by bare id (`aura nexus app
install com.example.hello`) resolves the `stable` channel.

## 3. Check it locally

```sh
npm install
node scripts/validate.mjs        # exactly what CI runs
```

## 4. Open the pull request

CI will verify that:

- the entry matches the schema, and `id` == filename;
- nobody else already owns that id;
- the source is reachable and every channel tag really exists;
- the repo/artifact actually contains a valid `app.manifest.json` whose `id`
  matches your entry;
- `icon` is the same 1-3 character glyph as your `app.manifest.json`, and
  screenshots are absolute `https://` URLs.

A human then reads the PR. Anything requesting privileged capabilities — the
`docker` tool, `*` (all tools), or a `dataProvider` authority — is flagged for
closer review, because those grant real power over the host and other apps.

## Updating or removing your app

Releasing a new version is a one-line PR bumping the channel tag. To remove your
app, delete its file. You own your entry via `.github/CODEOWNERS`.

## House rules

Read [POLICY.md](POLICY.md) before submitting — especially the section on what
review does and does not guarantee.
