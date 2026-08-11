# Current Route Map — Production MetaMech Website

**Source repository:** `saviosyl/MetaMech_2026`  
**Source SHA:** `72fe5acd1c2d9caa1c69fb4ba070c831ddd62f4d`  
**Current domain:** `https://metamechsolutions.com`  
**Date:** 2026-08-11  

Classification legend:

- **KEEP** — retain as-is in MDAT site
- **KEEP-AS-MDAT** — retain for future `mdat.metamechsolutions.com`
- **MODIFY** — minor branding/nav updates only
- **MOVE** — conceptually relocates under parent brand later
- **NEW** — created on corporate site
- **REDIRECT-LATER** — future redirect after approved domain migration
- **REVIEW** — needs human decision before migration

No routes were removed during this audit.

---

## Production routes (MetaMech_2026)

| Current URL | Page / component | Purpose | SEO title | SEO description | Important CTA | Form | Download | API | Proposed future destination | Class |
|-------------|------------------|---------|-----------|-----------------|---------------|------|----------|-----|-------------------------------|-------|
| `/` | `app/page.tsx` + `HeroSection` | MDAT homepage | SolidWorks Automation Tools — Save 85% Design Time \| MetaMech | Automates BOM, PDF merge, batch STEP/DXF; free 3-day trial… | Download Trial / Pricing / Simulation Studio | — | Trial via download page | GA | `mdat.metamechsolutions.com/` (corporate homepage becomes NEW `/`) | KEEP-AS-MDAT + REDIRECT-LATER |
| `/about` | `app/about/page.tsx` | Company about (MDAT-focused) | About MetaMech Solutions — SolidWorks Automation from Ireland | Ireland-based engineering automation… | Download / Contact | — | — | — | MDAT about + corporate About NEW | KEEP-AS-MDAT / REVIEW |
| `/tools` | `app/tools/page.tsx` | Tools index | SolidWorks Automation Tools — BOM, PDF Merge, STEP Export \| MetaMech | Explore BOM / PDF / export tools… | Download / Pricing | — | — | — | `mdat.../tools` | KEEP-AS-MDAT |
| `/tools/bom` | `app/tools/bom/page.tsx` | BOM product page | SolidWorks BOM Automation… | Automate BOM in 30 seconds… | Download / Pricing / Contact | — | — | — | `mdat.../tools/bom` | KEEP-AS-MDAT |
| `/tools/pdf-merge` | `app/tools/pdf-merge/page.tsx` | PDF merge page | SolidWorks PDF Merge… | Merge drawings with index/bookmarks… | Download / Pricing / Contact | — | — | — | `mdat.../tools/pdf-merge` | KEEP-AS-MDAT |
| `/tools/file-export` | `app/tools/file-export/page.tsx` | STEP/DXF export | SolidWorks Batch Export… | Batch STEP/DXF… | Download / Pricing / Contact | — | — | — | `mdat.../tools/file-export` | KEEP-AS-MDAT |
| `/services` | `app/services/page.tsx` | Engineering services | Engineering Services — SolidWorks Design & CAD Automation \| MetaMech | Mechanical design, CAD automation… | Contact / Tools | — | — | — | Corporate Services + MDAT keep | REVIEW / MOVE |
| `/industries` | `app/industries/page.tsx` | Industry use cases | Industries — SolidWorks Automation for Medical, Automotive… | Industry use cases… | Download / Contact | — | — | — | `mdat.../industries` | KEEP-AS-MDAT |
| `/pricing` | `app/pricing/page.tsx` + `CheckoutForm` | MDAT pricing / checkout | MetaMech Pricing — SolidWorks Automation from €999/year | Trial / Standard / Premium / Plus… | Checkout / Contact | CheckoutForm → Formspree + Stripe/Revolut | — | Formspree / Stripe | `mdat.../pricing` | KEEP-AS-MDAT |
| `/download` | `app/download/page.tsx` | Trial lead + download | *(layout default)* | *(layout default)* | Unlock Download | Trial lead → Formspree | MDAT GitHub Release zip | Formspree | `mdat.../download` | KEEP-AS-MDAT |
| `/contact` | `app/contact/page.tsx` + `ContactForm` | Contact / demo | Contact MetaMech — Get a Demo… | Demo/support/custom project… | mailto / form submit | ContactForm → Formspree | — | Formspree | Corporate Contact NEW + MDAT keep | KEEP-AS-MDAT / REVIEW |
| `/blog` | `app/blog/page.tsx` | Blog index | Blog — SolidWorks Automation Tips… | Expert articles… | Article links | — | — | — | `mdat.../blog` | KEEP-AS-MDAT |
| `/blog/*` (14 posts) | `app/blog/*/page.tsx` | SEO articles | Per-post titles | Per-post descriptions | Download / Pricing / Tools | — | — | — | `mdat.../blog/*` | KEEP-AS-MDAT |
| `/solidworks-macros` | `app/solidworks-macros/page.tsx` | SEO landing | SolidWorks Macros — Ready-Made Automation Macros \| MetaMech | Macro-level automation… | Download / Contact | — | — | — | `mdat.../solidworks-macros` | KEEP-AS-MDAT |
| `/solidworks-design-automation` | `app/solidworks-design-automation/page.tsx` | SEO landing | SolidWorks Design Automation — The Complete Platform \| MetaMech | Full platform SEO page… | Download / Pricing / Contact | — | — | — | `mdat.../solidworks-design-automation` | KEEP-AS-MDAT |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | Legal | Privacy Policy | Data collection… | mailto | — | — | — | Both sites / shared legal | KEEP / REVIEW |
| `/terms` | `app/terms/page.tsx` | Legal | Terms of Service | Terms for tools… | mailto | — | — | — | Both sites / shared legal | KEEP / REVIEW |
| `/simulation-studio` | `app/simulation-studio/page.tsx` | Studio login gateway | *(inherit)* | *(inherit)* | Login → studio app | Client-side login gate | — | Redirect to studio host | `simulation.metamechsolutions.com` + app host | MODIFY / REDIRECT-LATER |
| `/simulation-studio/dashboard` | `.../dashboard/page.tsx` | Redirect shim | *(inherit)* | *(inherit)* | Redirect | — | — | studio `/dashboard` | App host | REDIRECT-LATER |
| `/simulation-studio/editor` | `.../editor/page.tsx` | Redirect shim | *(inherit)* | *(inherit)* | Redirect | — | — | studio `/demo` | App host | REDIRECT-LATER |

### Known issues (do not fix via redesign of MDAT in this phase)

- Internal links to `/features` appear broken on about / solidworks pages
- Sitemap missing 4 blog posts
- Download page metadata inherits layout defaults

---

## Simulation Studio marketing routes (application repo — not production root)

Source: `MetaMech-Simulation-Studio` @ `d75d65ab082c986ca1139613ddadefcd1f610520`

| Current URL | Page | Purpose | Proposed future destination | Class |
|-------------|------|---------|-----------------------------|-------|
| `/` (studio host) | `HomePage` / `SimulationHomepageSection` | Simulation marketing home | `simulation.metamechsolutions.com/` | KEEP / MOVE |
| `/simulation` | `SimulationProductPage` | Product marketing | `simulation.../` or `/product` | KEEP |
| `/simulation/pricing` | `SimulationPricingPage` | Pricing | `simulation.../pricing` | KEEP |
| `/simulation/access*` | Access funnel | Auth / trial | Remain on app host | KEEP |

---

## New corporate routes (to be created — not live)

Future domain: `metamechsolutions.com` (**not activated in this task**)

| Route | Purpose | Class |
|-------|---------|-------|
| `/` | Corporate homepage (interactive service hero) | NEW |
| `/products` | Product index (MDAT, Simulation Studio, GoldMeta) | NEW |
| `/products/mdat` | Bridge to MDAT site | NEW |
| `/products/simulation-studio` | Bridge to Simulation marketing/app | NEW |
| `/products/goldmeta` | GoldMeta as MetaMech product | NEW |
| `/services` | Parent services (Software, AI, Engineering, Web) | NEW |
| `/work` | Selected work (own products) | NEW |
| `/about` | Parent brand positioning | NEW |
| `/contact` | Start a Project enquiry | NEW |

---

## GoldMeta

No public marketing website routes in `GOLDSMETA` repo. Corporate site will add presentation pages only. Product remains `goldmeta.app`.
