# Domain Migration Plan (NOT EXECUTED)

**Status:** Documentation only. Do **not** execute until explicitly approved.  
**Date prepared:** 2026-08-11

## Target architecture

| Destination | Site | Source app in `metamech-web` |
|-------------|------|------------------------------|
| `metamechsolutions.com` | Corporate parent website | `apps/corporate` |
| `mdat.metamechsolutions.com` | MetaMech MDAT (current production content) | `apps/mdat` |
| `simulation.metamechsolutions.com` | Simulation Studio marketing | `apps/simulation` |
| `app.metamechsolutions.com` / existing studio host | Simulation application | MetaMech-Simulation-Studio (unchanged) |
| `goldmeta.app` | GoldMeta product | GOLDSMETA repo (unchanged) |

## Current state

- `metamechsolutions.com` → Cloudflare Pages project `metamech-2026` from `MetaMech_2026` (MDAT-focused site)
- Simulation app → `metamech-studio.pages.dev` / `app.metamechsolutions.com`
- GoldMeta → `goldmeta.app`

## DNS changes required (future)

1. Create `mdat` CNAME (or Pages custom domain) → MDAT Pages project.
2. Create `simulation` CNAME → Simulation marketing Pages project.
3. Point apex `metamechsolutions.com` / `www` to **new corporate** Pages project (only after MDAT subdomain is live and redirects verified).
4. Keep `app.metamechsolutions.com` on Simulation Studio app project.
5. Do **not** change `goldmeta.app` unless separately approved.

## Cloudflare configuration

1. Create separate Cloudflare Pages projects:
   - `metamech-corporate` ← `apps/corporate/out`
   - `metamech-mdat` ← `apps/mdat/out` (or continue MetaMech_2026 deploy pipeline initially)
   - `metamech-simulation-marketing` ← `apps/simulation/out`
2. Attach custom domains only after preview QA.
3. Preserve existing `_redirects` / `_headers` patterns; update for new hostnames.
4. SSL: rely on Cloudflare-managed certificates per hostname.

## Redirect plan (SEO)

| From (current) | To (future) | Type |
|----------------|-------------|------|
| `metamechsolutions.com/` (MDAT home) | `mdat.metamechsolutions.com/` | 301 |
| `metamechsolutions.com/tools*` | `mdat.metamechsolutions.com/tools*` | 301 |
| `metamechsolutions.com/pricing` | `mdat.metamechsolutions.com/pricing` | 301 |
| `metamechsolutions.com/download` | `mdat.metamechsolutions.com/download` | 301 |
| `metamechsolutions.com/blog*` | `mdat.metamechsolutions.com/blog*` | 301 |
| `metamechsolutions.com/solidworks-*` | `mdat.metamechsolutions.com/solidworks-*` | 301 |
| Selected corporate paths if overlapping | Keep on apex after cutover | — |
| `/simulation-studio*` on apex | `simulation...` or app host | 301 |

Publish updated `sitemap.xml` / `robots.txt` **after** cutover. Corporate metadata currently uses `robots: noindex` in preview builds.

## Environment variables

| Variable | Corporate | MDAT | Simulation marketing |
|----------|-----------|------|----------------------|
| `NEXT_PUBLIC_MDAT_URL` | `https://mdat.metamechsolutions.com` | — | — |
| `NEXT_PUBLIC_CORPORATE_URL` | — | `https://metamechsolutions.com` | `https://metamechsolutions.com` |
| `NEXT_PUBLIC_SIMULATION_URL` | `https://simulation.metamechsolutions.com` | — | — |
| `NEXT_PUBLIC_SIMULATION_APP_URL` | app host | app host | app host |
| `NEXT_PUBLIC_GOLDMETA_URL` | `https://goldmeta.app` | — | — |

Preserve Formspree, Stripe, GA IDs; migrate hardcoded values to env where practical before launch.

## Canonical / SEO checklist

- [ ] Update MDAT `metadataBase` / canonicals to `mdat.metamechsolutions.com`
- [ ] Enable corporate indexing (`robots` index/follow) only at launch
- [ ] Submit new sitemaps in Search Console
- [ ] Verify Open Graph / Twitter cards per host
- [ ] Monitor 404s for 2–4 weeks post-cutover

## Rollback procedure

1. Re-point apex domain custom hostname back to previous Pages project (`metamech-2026` / MetaMech_2026 deployment).
2. Disable or remove premature 301 rules that send MDAT traffic away from apex if rollback is required immediately.
3. Keep `mdat` / `simulation` subdomains available but non-authoritative until re-attempt.
4. Revert env URLs in each app to previous values.
5. Confirm trial download, pricing/Stripe, and contact Formspree on restored apex.

## Explicit non-actions for this task

- No DNS edits
- No production alias changes
- No merge to production branches
- No replacement of live root homepage
