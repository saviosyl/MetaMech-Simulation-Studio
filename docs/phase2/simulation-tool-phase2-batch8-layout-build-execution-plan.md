# MetaMech Studio — Phase 2 Batch 8 Layout Build Execution Plan (Simulation Tool Only)

Status: Execution plan (next implementation step)  
Scope: Simulation Tool page/layout build only  
Pricing lock: **1-Day Trial** + **Full Access (Monthly / Yearly)** only

## 1) What is live right now vs what is still in docs/assets

## Live now (reviewable in app)

- Existing Simulation Tool application experience (dashboard/editor/auth/billing flow).
- Approved internal admin review access unblock for `saviosyl@gmail.com` (temporary).
- All existing product UI improvements and auth flow baseline from previous phases.

## Not yet visibly wired into live website/page templates

- New Simulation marketing/product page layout sections from Phase 2 copy packs.
- Homepage Simulation marketing block built from frozen copy and captured assets.
- Dedicated pricing module presentation using the approved two-option model on visible marketing layout.

## Already prepared and ready to wire

- Frozen copy baseline (`98e48c85`).
- Captured approved visual asset set (`fc1a9255`).
- High-fidelity mockup package structure (`239d6238`).

---

## 2) Exact next build step (implementation scope)

Build visible frontend layouts for:

1. Simulation product page
2. Homepage Simulation section
3. Pricing module (reusable section)

No macro content, no product-line split, no payment/provider changes.

---

## 3) Proposed implementation units (minimal, practical)

## Unit A — Shared marketing components (Simulation-only)

Create reusable presentation components:

- `frontend/src/components/marketing/simulation/SimulationHero.tsx`
- `frontend/src/components/marketing/simulation/SimulationBenefits.tsx`
- `frontend/src/components/marketing/simulation/SimulationHowItWorks.tsx`
- `frontend/src/components/marketing/simulation/SimulationUseCases.tsx`
- `frontend/src/components/marketing/simulation/SimulationPricingModule.tsx`
- `frontend/src/components/marketing/simulation/SimulationFAQ.tsx`
- `frontend/src/components/marketing/simulation/SimulationFinalCTA.tsx`

These components consume frozen copy constants and approved asset paths.

## Unit B — Copy/asset content source

Create a single content map file:

- `frontend/src/content/simulationMarketingContent.ts`

Include:
- approved headlines/subheadlines
- section copy blocks
- CTA labels
- pricing text (2-option model only)
- asset path mapping

## Unit C — New page shells

Create:

- `frontend/src/pages/SimulationProductPage.tsx` (full page)
- `frontend/src/pages/HomePage.tsx` (homepage with Simulation section)

## Unit D — Route wiring (minimal change)

Update `frontend/src/App.tsx`:

- `/` -> `HomePage` (public)
- `/simulation` -> `SimulationProductPage` (public)
- keep `/login`, `/register`, and app protected routes unchanged

Optional (if needed later):
- `/pricing` route can reuse `SimulationPricingModule` inside a small page wrapper.

## Unit E — Styling tokens and layout consistency

Use existing theme tokens and spacing/radius system from Phase 1 UI polish.
Do not introduce a separate visual language.

---

## 4) Section-by-section build mapping

## A) Simulation product page

Wire sections in this order:

1. Hero (`sim-hero-main-light-v01.png`)
2. Trust/value intro
3. Key benefits (`sim-proof-connection-transfer-light-v01.png`)
4. How it works (`sim-proof-flow-behavior-light-v01.png`)
5. Use cases (`sim-proof-transfer-reliability-light-v01.png`)
6. Pricing (`sim-pricing-trial-fullaccess-light-v01.png`)
7. FAQ
8. Final CTA

## B) Homepage Simulation section

Place as a dedicated module on homepage:

- headline/subtext from frozen copy
- 4 short benefits
- hero visual (`sim-hero-main-light-v01.png`)
- CTA row (Start Trial, Book Demo)

## C) Pricing module

Reusable component with:

- section heading + support line
- 2 cards only:
  - 1-Day Trial
  - Full Access (Monthly / Yearly)
- yearly note + trial-upgrade line
- no extra tiers

## D) One-pager/brochure

No app-route implementation needed.
Assemble from existing assets/copy in design tool using Batch 7 structure.

---

## 5) Build acceptance checklist

- [ ] Frozen copy used without drift (`98e48c85`)
- [ ] Approved assets used (`fc1a9255`)
- [ ] Only approved pricing model shown (2 options)
- [ ] Light theme visual consistency retained
- [ ] CTA labels match approved set
- [ ] No macro/product-line split content introduced
- [ ] No payment implementation changes

---

## 6) Temporary admin review override cleanup trigger

After internal review confirmation:

1. Remove temporary review override logic from `ProtectedRoute.tsx`
2. Confirm backend-managed entitlement is used for admin review access
3. Deploy cleanup commit

Tracking file:
- `docs/phase2/simulation-tool-review-access-cleanup.md`

---

## 7) Recommended execution sequence

1. Implement Unit A + Unit B (shared sections + content map)
2. Implement Unit C + Unit D (page shells + routes)
3. Run visual QA on `/` and `/simulation`
4. Finalize brochure assembly separately using same copy/assets
5. After review sign-off, remove temporary frontend admin override

