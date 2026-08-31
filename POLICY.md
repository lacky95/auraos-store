# Store policy

## What this store is

A curated list of pointers. Each entry says "this app exists, and here is where
to get it." The code stays in the author's repository or registry; we host only
the catalogue.

## What review does — and does not — mean

When we merge an entry we have checked that:

- the metadata is well-formed and the categories are real;
- the `id` is a valid reverse-domain name and is not already claimed;
- the source resolves and the declared channel tags exist;
- the target really contains an AuraOS app whose manifest `id` matches;
- any privileged capability request has been seen by a human.

We have **not** audited the app's source code, and we do not rebuild or sign it.
A listed app is not a vouched-for app. Publishers can push new tags at any time
without touching this repository, so what you install tomorrow may differ from
what we reviewed today.

Treat installing a third-party app as running that author's code on your
machine — because that is what it is.

## Current status: first-party only

> **The store is not yet open to third-party submissions.**
>
> AuraOS's Nexus UI currently passes `autoApprove: true` when you install from
> the Browse tab or update an app
> (`apps/com.aura.nexus/src/pages/index.astro`, `app.astro`, `installed.astro`),
> so a one-click install grants every tool and permission the app declares
> **without showing you what they are**. The permission diff is computed
> server-side and shown by the CLI, but not by the store UI.
>
> That is acceptable while the only catalogue is your own. It is not acceptable
> for a public store: `docker` in an app's `tools[]` is effectively host root via
> the socket.
>
> **Third-party submissions open once AuraOS surfaces the permission diff in the
> Nexus UI before install.** Until then this index carries first-party apps only.

## App ids and ownership

- Ids are reverse-domain (`com.example.myapp`) and are permanent once published.
- You should control the domain you name, or own the corresponding
  repository. Impersonating another project's namespace is grounds for rejection.
- Ownership is recorded in `.github/CODEOWNERS`; you get review rights over your
  own entry.
- Transfers are done by PR, with agreement from the current owner.

## What we reject

- Malware, credential harvesting, cryptominers, or anything covert.
- Apps that impersonate another project, author, or brand.
- Entries whose source cannot be reached or verified.
- Privileged capability requests (`docker`, `*`, `dataProvider`) without a clear
  reason in the app's description or the PR.
- Unlawful content, or content that would make the store legally untenable.

Sitting still counts too: entries whose sources have been unreachable for an
extended period may be removed to keep the catalogue honest.

## Removal

We can remove an entry at any time — for a policy breach, a security report, or
because the source has rotted. Removal deletes the listing, not the app: anyone
holding the original ref can still install it directly. Authors may remove their
own entry by PR at any time.

## Security reports

Report a malicious or compromised listing by opening a **security advisory** on
this repository rather than a public issue. Include the app id, the source ref,
and what you observed. Confirmed malicious entries are removed without notice.

## Changes

This policy will change as the store grows — particularly the first-party-only
restriction above, and the addition of digest pinning and signature verification
once AuraOS supports them.
