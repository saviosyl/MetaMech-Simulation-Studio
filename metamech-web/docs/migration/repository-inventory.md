# Repository Inventory — MetaMech Website Ecosystem

**Date:** 2026-08-11  
**Scope:** Public website / marketing sources associated with MetaMech Solutions products.  
**Rule:** No repositories deleted, archived, or renamed.

---

## Summary matrix

| Repository | Purpose | Production-critical? | Move into unified web repo? |
|------------|---------|----------------------|-----------------------------|
| MetaMech_2026 | Live MDAT + corporate marketing (Next.js → Cloudflare Pages) | **Yes** | **Yes — primary source for `apps/mdat`** |
| MetaMech-Simulation-Studio | Simulation Studio app + in-app marketing | **Yes (app)** | Marketing presentation only; app stays |
| GOLDSMETA | GoldMeta iOS + Firebase backend | Product yes / web no | Marketing pages only (`apps/goldmeta-marketing`) |
| MDAT | Desktop MDAT product + LinkedIn banners | App + trial releases yes | Marketing banners/assets only |
| metamech-website | Older Vite SPA clone | No | Reference only |
| metamech-site | Older Vite SPA + GH Pages | No | Reference only |
| metamech-v2 | Static HTML / SEO pages | No | Reference only |
| metamechsolutions-site | Earliest static homepage | No | Reference only |

---

## 1. MetaMech_2026

| Field | Detail |
|-------|--------|
| **Repository name** | MetaMech_2026 |
| **Remote URL** | https://github.com/saviosyl/MetaMech_2026 |
| **Primary branch** | main |
| **HEAD SHA** | `72fe5acd1c2d9caa1c69fb4ba070c831ddd62f4d` |
| **Framework** | Next.js 14.2.18 (App Router, `output: 'export'`), React 18, Tailwind 3, TypeScript |
| **Build command** | `npm run build` → `out/` |
| **Deploy command** | Cloudflare Pages via `wrangler.toml` (`pages_build_output_dir = "out"`, project `metamech-2026`) — no CI workflow in repo |
| **Hosting destination** | Cloudflare Pages |
| **Current domain** | `metamechsolutions.com` (+ www → apex redirect) |
| **Purpose** | Production public website: MDAT product marketing, services, pricing, download, blog, Simulation Studio gateway |
| **Important routes** | `/`, `/tools*`, `/services`, `/industries`, `/pricing`, `/download`, `/about`, `/contact`, `/blog*`, `/solidworks-*`, `/privacy-policy`, `/terms`, `/simulation-studio*` |
| **Important dependencies** | next, react, gsap, lucide-react, three, @react-three/*, zustand, uuid |
| **Environment variables** | None in-repo; Formspree / Stripe / GA IDs hardcoded |
| **Backend dependencies** | Formspree `xvzzkjwd`; Stripe payment links; Revolut; GA `G-954RBCT27V`; trial zip from MDAT GitHub Releases; studio redirect to `metamech-studio.pages.dev` |
| **External links** | hi@metamechsolutions.com, LinkedIn, Stripe, Revolut, MDAT releases |
| **Production-critical** | **Yes** |
| **Unify?** | **Yes — copy into `apps/mdat` as preserved MDAT site** |

---

## 2. MetaMech-Simulation-Studio

| Field | Detail |
|-------|--------|
| **Repository name** | MetaMech-Simulation-Studio |
| **Remote URL** | https://github.com/saviosyl/MetaMech-Simulation-Studio |
| **Primary branch** | main |
| **HEAD SHA** | `d75d65ab082c986ca1139613ddadefcd1f610520` |
| **Framework** | Vite + React 18 + Three.js (frontend); Express/worker backend; Cloudflare Worker API |
| **Build command** | `cd frontend && npm run build` |
| **Deploy command** | Cloudflare Pages / Worker (`wrangler.toml`, `npm run cf:deploy`) |
| **Hosting destination** | `metamech-studio.pages.dev`, `app.metamechsolutions.com`, API `api.metamechsolutions.com` |
| **Current domain** | app / studio subdomains (not root corporate domain) |
| **Purpose** | Interactive 3D Simulation Studio application + product marketing pages |
| **Important routes** | App: editor/dashboard; Marketing: `/`, `/simulation`, `/simulation/pricing`, `/simulation/access*` |
| **Important dependencies** | three, @react-three/*, react-router-dom, zustand, axios, lucide-react, tailwind |
| **Environment variables** | `.env` / `.env.example` (API URLs, etc.) |
| **Backend dependencies** | Cloudflare Worker + D1; Stripe for simulation access |
| **External links** | Corporate contact `metamechsolutions.com/contact/` |
| **Production-critical** | **Yes (application)** |
| **Unify?** | **Marketing presentation only** into `apps/simulation`. Do not move the 3D application into the website monorepo. |

---

## 3. GOLDSMETA

| Field | Detail |
|-------|--------|
| **Repository name** | GOLDSMETA |
| **Remote URL** | https://github.com/saviosyl/GOLDSMETA |
| **Primary branch** | main |
| **HEAD SHA** | `107faf13ea15e0c8189d8dc86c01199728a461b1` |
| **Framework** | iOS SwiftUI + Firebase Cloud Functions (Express/TS) + Pine Script — **no marketing website** |
| **Build command** | Backend `npm run build`; iOS via Xcode |
| **Deploy command** | Firebase Functions / TestFlight |
| **Hosting destination** | `goldmeta.app`, `api.goldmeta.app` |
| **Current domain** | goldmeta.app |
| **Purpose** | AI Market Intelligence product |
| **Important routes** | N/A (native app) |
| **Important dependencies** | Firebase, OpenAI (backend) |
| **Environment variables** | `WEBHOOK_*`, `OPENAI_*`, `FIREBASE_PROJECT_ID`, etc. |
| **Backend dependencies** | Firebase Auth/Functions; TradingView webhooks |
| **External links** | api.goldmeta.app |
| **Production-critical** | Product yes; marketing site absent |
| **Unify?** | **Marketing presentation only** (`apps/goldmeta-marketing`). Keep app separate. Present as “A MetaMech Solutions Product”. |

---

## 4. MDAT (desktop product repo)

| Field | Detail |
|-------|--------|
| **Repository name** | MDAT |
| **Remote URL** | https://github.com/saviosyl/MDAT |
| **Primary branch** | main |
| **HEAD SHA** | `b91cadd63779c2cd2ecb18b1f26fd4371501d726` |
| **Framework** | VB.NET WinForms app + HTML marketing banners |
| **Build command** | Desktop build tooling (not website) |
| **Deploy command** | GitHub Releases for trial zip |
| **Hosting destination** | Releases + license workers |
| **Current domain** | Linked from metamechsolutions.com; workers `metamech-license-server.saviosyl.workers.dev`, `mdat-sync-api.saviosyl.workers.dev`, `mdat-macro-delivery.saviosyl.workers.dev` |
| **Purpose** | MetaMech Mechanical Design Automation Tools product |
| **Important routes** | N/A (desktop); website consumes release download URL |
| **Important dependencies** | SolidWorks automation stack |
| **Environment variables** | License/API worker config |
| **Backend dependencies** | Cloudflare Workers for license/sync/macros |
| **External links** | metamechsolutions.com |
| **Production-critical** | **Yes (product + trial artifact)** |
| **Unify?** | Marketing banners/assets only — **do not** move desktop app |

---

## 5. metamech-website

| Field | Detail |
|-------|--------|
| **Repository name** | metamech-website |
| **Remote URL** | https://github.com/saviosyl/metamech-website |
| **Primary branch** | main |
| **HEAD SHA** | `c5476874da8461efb92ca7e7002421e6998d6a35` |
| **Framework** | Vite 7 + React 19 + Tailwind + Radix/shadcn |
| **Build command** | `npm run build` |
| **Deploy command** | None in-repo |
| **Hosting destination** | Unknown / not production |
| **Current domain** | Content references metamechsolutions.com |
| **Purpose** | Older corporate MDAT SPA |
| **Important routes** | Hash sections: `#tools`, `#roi`, `#pricing`, `#checkout`, `#services`, `#trial`, `#contact` |
| **Important dependencies** | gsap, radix-ui, react-hook-form, zod, recharts |
| **Environment variables** | None; Web3Forms key hardcoded |
| **Backend dependencies** | Web3Forms, Stripe, Revolut |
| **External links** | metamechsolutions.com mailto |
| **Production-critical** | No |
| **Unify?** | Reference only (superseded by MetaMech_2026) |

---

## 6. metamech-site

| Field | Detail |
|-------|--------|
| **Repository name** | metamech-site |
| **Remote URL** | https://github.com/saviosyl/metamech-site |
| **Primary branch** | main |
| **HEAD SHA** | `763fb4b13c68bca52bd381bab17ed46e49418b66` |
| **Framework** | Vite + React 18 under `app/` |
| **Build command** | `cd app && npm run build` |
| **Deploy command** | `.github/workflows/deploy.yml` → GitHub Pages |
| **Hosting destination** | GitHub Pages |
| **Current domain** | Content references metamechsolutions.com |
| **Purpose** | Older corporate SPA + trial package hosting attempt |
| **Important routes** | `#home`, `#tools`, `#how`, `#pricing`, `#trial`, `#renewals`, `#contact` |
| **Important dependencies** | React, Vite |
| **Environment variables** | Formspree default in source |
| **Backend dependencies** | Formspree `xvzzkjwd`, Stripe |
| **External links** | Trial zip / QuickStart PDF in public |
| **Production-critical** | No (likely build-broken util path) |
| **Unify?** | Reference only |

---

## 7. metamech-v2

| Field | Detail |
|-------|--------|
| **Repository name** | metamech-v2 |
| **Remote URL** | https://github.com/saviosyl/metamech-v2 |
| **Primary branch** | main |
| **HEAD SHA** | `a7d151bc2051a1ead4992d3cb71ae09e6a8f8fb2` |
| **Framework** | Static HTML |
| **Build command** | None |
| **Deploy command** | None (static host assumed) |
| **Hosting destination** | Likely Cloudflare Pages historically (`_headers`, sitemap) |
| **Current domain** | Sitemap/robots: https://metamechsolutions.com |
| **Purpose** | Early corporate + SEO landing pages |
| **Important routes** | `/`, `/products/*`, `/services/*`, `/blog/*` |
| **Important dependencies** | None |
| **Environment variables** | None |
| **Backend dependencies** | Formspree, Stripe |
| **External links** | metamechsolutions.com |
| **Production-critical** | No |
| **Unify?** | Reference only |

---

## 8. metamechsolutions-site

| Field | Detail |
|-------|--------|
| **Repository name** | metamechsolutions-site |
| **Remote URL** | https://github.com/saviosyl/metamechsolutions-site |
| **Primary branch** | main |
| **HEAD SHA** | `1b9d7b98d5fd736984948f4926715140de8ae4be` |
| **Framework** | Static HTML (single page) |
| **Build command** | None |
| **Deploy command** | None |
| **Hosting destination** | Unknown |
| **Current domain** | Content references metamechsolutions.com |
| **Purpose** | Earliest homepage clone |
| **Important routes** | `/` only |
| **Important dependencies** | None |
| **Environment variables** | None |
| **Backend dependencies** | Formspree placeholders, Revolut |
| **External links** | metamechsolutions.com |
| **Production-critical** | No |
| **Unify?** | Reference only |

---

## Shared production integrations to preserve

| Integration | Value / note |
|-------------|--------------|
| Contact email | hi@metamechsolutions.com |
| Formspree | `https://formspree.io/f/xvzzkjwd` |
| Google Analytics | `G-954RBCT27V` |
| MDAT trial download | `https://github.com/saviosyl/MDAT/releases/latest/download/MetaMech-Trial.zip` |
| Stripe MDAT | Standard / Premium payment links (Premium Plus still `#`) |
| Revolut | revolut.me/saviosyl |
| Simulation app | `https://metamech-studio.pages.dev` / `app.metamechsolutions.com` |
| GoldMeta product | `goldmeta.app` |

## Cloudflare / hosting notes

- Corporate/MDAT production: Cloudflare Pages project `metamech-2026` (`MetaMech_2026/wrangler.toml`)
- Simulation Studio: Cloudflare Pages + Worker (`MetaMech-Simulation-Studio/wrangler.toml`, `cloudflare-worker/`)
- Firebase: GOLDSMETA backend only
- No DNS changes in this consolidation

## Canonical workspace decision

See `canonical-repository-decision.md`.

Prepared unified workspace path (this repo):

```text
metamech-web/
  apps/corporate/
  apps/mdat/
  apps/simulation/
  apps/goldmeta-marketing/
  packages/{ui,brand,shared}/
  assets/{metamech,mdat,simulation,goldmeta}/
  docs/{architecture,migration,deployment}/
```
