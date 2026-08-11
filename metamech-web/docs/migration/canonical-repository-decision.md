# Canonical Website Repository Decision

**Date:** 2026-08-11

## Preferred conceptual name

`METAMECH-WEB`

## Inspection outcome

| Candidate | Suitable as canonical website repo? | Notes |
|-----------|-------------------------------------|-------|
| **MetaMech_2026** | **Yes — best existing candidate** | Production Next.js + Cloudflare Pages site for `metamechsolutions.com`. Contains MDAT marketing, blog, pricing, download, contact. |
| MetaMech-Simulation-Studio | No (as whole repo) | Large 3D application. Must not become the website monorepo root conceptually, and must not be redesigned. |
| metamech-website / metamech-site / metamech-v2 / metamechsolutions-site | No | Superseded clones / static ancestors. |
| GOLDSMETA / MDAT | No | Product apps, not website hosts. |

## Constraint from this Cloud Agent environment

- Writable remote: **only** `saviosyl/MetaMech-Simulation-Studio`
- Push to `MetaMech_2026`: **403 denied**
- Create new GitHub repo `METAMECH-WEB`: **not permitted** by integration token

## Decision for this task

1. Treat **MetaMech_2026** as the conceptual production source of truth for the current live website (untouched; no deploy; no merge).
2. Prepare the unified canonical **workspace** at:

   `MetaMech-Simulation-Studio/metamech-web/`

3. Structure that workspace as the future `METAMECH-WEB` layout:

   ```text
   metamech-web/
     apps/corporate/
     apps/mdat/
     apps/simulation/
     apps/goldmeta-marketing/
     packages/ui/
     packages/brand/
     packages/shared/
     assets/...
     docs/...
   ```

4. Do **not** move Simulation Studio backend/editor into the website workspace.
5. Document exact source SHAs so a later split into a standalone `METAMECH-WEB` GitHub repository is mechanical and safe.

## Why not rewrite production in place

The live root domain currently serves MDAT content. Replacing it with the new corporate homepage before subdomain preparation would break SEO, downloads, pricing, and trial flows. This task isolates the new corporate site and preserves MDAT for future `mdat.metamechsolutions.com`.
