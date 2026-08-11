# Product Destination Audit (QA pass)

**Date:** 2026-08-11  
**Branch tip at write time:** see `git rev-parse HEAD` on `cursor/metamech-corporate-site-v1-46e2`

## Summary

| Product | Marketing CTA (preview default) | Application / product destination | Verified? | Owner confirmation needed? |
|---------|----------------------------------|-----------------------------------|-----------|----------------------------|
| MetaMech MDAT | `NEXT_PUBLIC_MDAT_URL` → `http://localhost:3000` (local `apps/mdat`) | Future: `mdat.metamechsolutions.com` (not attached) | Local preview yes; production still apex MetaMech_2026 | No for local; yes before cutover |
| Simulation Studio marketing | `NEXT_PUBLIC_SIMULATION_URL` → `http://localhost:3002` | Future: `simulation.metamechsolutions.com` | Local preview yes | Yes before cutover |
| Simulation Studio application | `NEXT_PUBLIC_SIMULATION_APP_URL` → `https://metamech-studio.pages.dev` | Also referenced as `app.metamechsolutions.com` in Simulation Studio docs | Source-configured yes | Confirm preferred public app host |
| GoldMeta | Internal `/products/goldmeta/` when env unset; optional `NEXT_PUBLIC_GOLDMETA_URL` | Appears in GOLDSMETA source as `goldmeta.app` / `api.goldmeta.app` | **HTTP unreachable during QA** (`curl` no response) | **YES — owner must confirm public destination** |

## Corporate CTAs

| Location | Target |
|----------|--------|
| Product showcase “Explore MDAT” | `/products/mdat/` then external `NEXT_PUBLIC_MDAT_URL` |
| Product showcase “Explore Simulation Studio” | `/products/simulation-studio/` then `NEXT_PUBLIC_SIMULATION_URL` |
| Product showcase “Explore GoldMeta” | `/products/goldmeta/` then optional `NEXT_PUBLIC_GOLDMETA_URL` |
| Hero Engineering CTA | `/products/mdat/` |
| Hero Interactive 3D CTA | `/products/simulation-studio/` |
| Contact form | Formspree `https://formspree.io/f/xvzzkjwd` (existing) |
| Footer email | `mailto:hi@metamechsolutions.com` |

## GoldMeta note

`goldmeta.app` and `api.goldmeta.app` appear in the GOLDSMETA iOS/API source, but neither public host responded during this QA pass.  
**Do not invent a product domain.** Keep `NEXT_PUBLIC_GOLDMETA_URL` optional; corporate pages default to the internal product presentation route until the owner confirms the live destination.
