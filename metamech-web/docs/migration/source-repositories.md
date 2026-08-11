# Source Repositories — Consolidation Log

**Consolidation date:** 2026-08-11  
**Working branch:** `cursor/metamech-corporate-site-v1-46e2`  
**Host repository for workspace:** `saviosyl/MetaMech-Simulation-Studio`  

Existing source repositories remain intact on GitHub. Nothing deleted, archived, or renamed.

| Source repo | SHA used | What was copied/reused | Destination | Changes required |
|-------------|----------|------------------------|-------------|------------------|
| MetaMech_2026 | `72fe5acd1c2d9caa1c69fb4ba070c831ddd62f4d` | Full Next.js website (app, components, public, configs) | `metamech-web/apps/mdat/` | Minor: product label “MetaMech MDAT”, link back to corporate, basePath prep docs; appearance preserved |
| MetaMech-Simulation-Studio | `d75d65ab082c986ca1139613ddadefcd1f610520` | Marketing copy + screenshots from `frontend/public/assets/simulation-tool` and `simulationMarketingContent.ts` concepts | `metamech-web/assets/simulation/`, `apps/simulation/` | Marketing-only site; app untouched |
| GOLDSMETA | `107faf13ea15e0c8189d8dc86c01199728a461b1` | Brand mark PNG | `metamech-web/assets/goldmeta/goldmeta-mark.png`, `apps/goldmeta-marketing/` | New marketing presentation; no app code moved |
| MDAT | `b91cadd63779c2cd2ecb18b1f26fd4371501d726` | Reference for trial download URL + LinkedIn banner existence | Documented; banners remain in MDAT repo | Desktop app stays separate |
| metamech-website | `c5476874da8461efb92ca7e7002421e6998d6a35` | Inventory / reference only | docs only | None |
| metamech-site | `763fb4b13c68bca52bd381bab17ed46e49418b66` | Inventory / reference only | docs only | None |
| metamech-v2 | `a7d151bc2051a1ead4992d3cb71ae09e6a8f8fb2` | Inventory / reference only | docs only | None |
| metamechsolutions-site | `1b9d7b98d5fd736984948f4926715140de8ae4be` | Inventory / reference only | docs only | None |

## History preservation note

Full Git history remains in each original repository. The consolidated workspace records exact SHAs above. A future extraction into a standalone `METAMECH-WEB` repository can use `git subtree` / filtered copy from these SHAs if history grafting is required.

## Production protection

- `MetaMech_2026` `main` was not modified by this agent (no push access; intentionally not altered).
- Live Cloudflare Pages production project was not redeployed.
- DNS was not changed.

## Questionable / excluded from monorepo copy

| Path | Reason | Action |
|------|--------|--------|
| `apps/mdat/public/models/` (~54MB GLB/GLTF) | Simulation Studio remnant assets on the corporate/MDAT site; not required for MDAT marketing pages (studio routes redirect externally) | Excluded from git via `.gitignore`; preserved in MetaMech_2026 @ `72fe5ac` |
| `apps/mdat/public/metamech-trial.rar` | Local trial archive; live download uses MDAT GitHub Releases URL | Kept for fidelity of imported public folder |
