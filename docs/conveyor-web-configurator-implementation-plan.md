# Web-Based Configurable Conveyor Assembly Plan

## 1) Purpose

Build a production workflow where a user configures a conveyor in the browser, sees an immediate 3D preview, and receives manufacturing outputs generated from SOLIDWORKS:

- Updated CAD files (parts + assembly)
- Drawings/PDFs
- Bill of Materials (BOM) in structured format
- Optional pricing and quote artifacts

This plan is tailored to the current MetaMech repository and uses its existing parametric + BOM logic as the digital rules baseline.

## 2) Current Assets in This Repository (Reusable)

The repository already contains core logic needed for a robust configurator:

- **Param model contract**: `ConveyorParams` in
  `frontend/src/features/assets/parametric/conveyor/conveyorTypes.ts`
- **3D assembly builder**: `buildConveyor(...)` in
  `frontend/src/features/assets/parametric/conveyor/conveyorBuilder.ts`
- **Support placement rules**: `computeSupportPositions(...)` in
  `frontend/src/features/assets/parametric/conveyor/conveyorSupports.ts`
- **BOM engine + scaling rules**: `generateBOM(...)` in
  `frontend/src/lib/bom/bomEngine.ts`
- **Part master data**: `partsCatalog` in
  `frontend/src/lib/bom/partsCatalog.ts`
- **Part geometry generation pipeline**: `scripts/generate-conveyor-parts.mjs`

These modules should be treated as the source for initial parameter dictionaries, validation ranges, and BOM scaling behavior before SOLIDWORKS is connected.

## 3) Target Outcomes

### Outcome A: Parametric SOLIDWORKS Master Assembly

Create a SOLIDWORKS master assembly controlled by global variables/equations for:

- Length, width, height, incline
- Drive type/position
- Support spacing + support style
- Side guides and belt options
- Optional accessories

The model must rebuild deterministically and expose properties required for downstream BOM extraction.

### Outcome B: Web Configurator + Automation Service

Create a web + backend flow where:

1. User edits parameters in UI
2. 3D preview updates instantly (MetaMech Three.js model)
3. User submits configuration
4. Backend invokes automation (DriveWorks or SOLIDWORKS API)
5. Authoritative BOM and deliverables are returned/downloadable

## 4) Delivery Path Options

### Option 1: DriveWorks-Led (Fastest path to production)

Use DriveWorks Solo/Pro + DriveWorks Live for rules/forms/publishing.

**Pros**
- Fastest to deploy
- Native SOLIDWORKS integration
- Built-in workflow/document generation
- Scales better for unattended generation than ad hoc macros

**Cons**
- Licensing cost
- Rule ownership tied to DriveWorks project

### Option 2: Custom Automation (Maximum control)

Use SOLIDWORKS API (C# add-in/service or VBA macro host) + custom backend.

**Pros**
- Full control over API, schema, storage, integrations
- No dependency on DriveWorks runtime

**Cons**
- Higher implementation + maintenance effort
- Need to engineer queueing, retries, and generation pipeline

### Recommendation

Adopt a **hybrid sequence**:

1. Build canonical parameter/rule dictionary in this repo
2. Implement custom backend contract first
3. Connect either DriveWorks or API executor behind the same backend interface

This keeps the frontend and integration APIs stable regardless of CAD automation stack.

## 5) Reference System Architecture

```text
Browser (React + Three.js)
  ├─ Parameter form + validation
  ├─ Real-time preview (existing parametric conveyor builder)
  └─ Submit configuration
        |
        v
Backend API (Node/TypeScript)
  ├─ Validate + normalize parameters
  ├─ Preliminary BOM (repo rules)
  ├─ Queue generation job
  └─ Poll/notify status + results
        |
        v
Automation Worker (Windows + SOLIDWORKS license)
  ├─ DriveWorks runtime OR SOLIDWORKS API executor
  ├─ Regenerate CAD + drawings
  ├─ Extract authoritative BOM
  └─ Publish artifacts (S3/fileshare)
        |
        v
Result API
  ├─ Authoritative BOM JSON/CSV
  ├─ Drawings PDF
  ├─ CAD package (optional)
  └─ Metadata (job id, revision, timestamp)
```

## 6) Parameter Contract and Validation

Define a shared backend/frontend schema mirroring `ConveyorParams` with strict ranges (seeded from `CONVEYOR_LIMITS`).

Example canonical payload:

```json
{
  "conveyorType": "belt",
  "driveType": "end",
  "widthMm": 600,
  "lengthMm": 3000,
  "heightMm": 800,
  "angleDeg": 0,
  "supportSpacingMm": 1500,
  "supportType": "floor",
  "sideGuidesEnabled": true,
  "sideGuideHeightMm": 60,
  "speedMpm": 20
}
```

Validation rules should include:

- min/max numeric bounds
- discrete enum checks
- cross-field constraints (example: hanger params required only when `supportType = ceiling-hanger`)
- hard failure for non-manufacturable combinations

## 7) Rule Mapping Strategy (MetaMech -> SOLIDWORKS)

Translate existing software rules to CAD equations/custom properties:

- **Support placement**
  - Use logic equivalent to `computeSupportPositions(length, spacing)`
  - Capture end offsets and middle support calculation
- **BOM scaling**
  - Support station count based on length
  - Connection sets scaled by length ratio
  - Belt length from loop + wrap allowance
- **Discrete configurations**
  - conveyor type variants (`belt`, `roller`, `modular`, `cleated`)
  - feature suppression/unsuppression by selected mode

For SOLIDWORKS implementation:

- Drive main dimensions via global variables/equations
- Use pattern-driven counts where possible
- Push calculated counts to custom properties (for BOM tables and exports)
- Keep one shared "rule dictionary" so web estimates and CAD outputs stay aligned

## 8) Backend API Contract (Proposed)

### `POST /api/configurations/preview`

- Validates params
- Returns normalized params + preview BOM (from repo engine)

### `POST /api/configurations/generate`

- Creates generation job
- Returns `jobId`

### `GET /api/configurations/generate/:jobId`

- Returns status: `queued | running | failed | completed`
- On completion returns artifact URLs + authoritative BOM

### `GET /api/configurations/generate/:jobId/bom.csv`

- Download authoritative BOM CSV

## 9) Implementation Workstreams

### Workstream A — CAD Parameterization

Deliverables:

- Master assembly structured by subassemblies (head, tail, mids, supports, accessories)
- Equation set for all externally configurable dimensions
- Controlled configurations for discrete modes
- Drawing templates linked to custom properties

Exit criteria:

- Rebuild passes for all test vectors
- No dangling references after parameter changes

### Workstream B — Automation Runtime

Deliverables:

- Executor service (DriveWorks or SOLIDWORKS API)
- Parameter ingest + mapping layer
- BOM extraction/export (JSON + CSV)
- Artifact packaging/publishing
- Error telemetry and logs

Exit criteria:

- Repeatable generation on same input
- Recoverable failure behavior with clear diagnostics

### Workstream C — Web Configurator

Deliverables:

- Config UI (sliders/dropdowns/toggles)
- Real-time 3D preview using existing MetaMech builder
- Live estimate panel (BOM + optional pricing)
- Job submission + status tracking + download center

Exit criteria:

- UI constraints prevent invalid submissions
- Successful end-to-end generation from browser

### Workstream D — Business Integrations (Optional)

Deliverables:

- Pricing table integration
- ERP/CRM push hooks
- Approval workflow states

Exit criteria:

- Quote and BOM values match released pricing source of truth

## 10) Infrastructure and Operations

- Host web app + API on cloud platform (AWS/GCP/Azure)
- Run CAD automation worker on Windows host with valid SOLIDWORKS licensing
- Add job queue (e.g., Redis queue) to serialize generation safely
- Store artifacts in object storage with retention policies
- Add audit trail: who generated what, with which parameters/revision

## 11) Test Plan

Test categories:

1. **Parameter validation tests**
   - min/max edges
   - invalid enum values
   - incompatible option combinations
2. **Rule regression tests**
   - support counts vs expected vectors
   - BOM line quantities vs known fixtures
3. **CAD generation tests**
   - rebuild integrity
   - drawing export success
   - BOM extraction completeness
4. **E2E tests**
   - UI submit -> queued -> completed -> artifact download
5. **Load/queue tests**
   - concurrent submissions without SOLIDWORKS contention failures

## 12) Acceptance Criteria

The solution is complete when:

- Browser users can configure conveyor dimensions/options with live 3D preview
- Submitted configuration generates SOLIDWORKS outputs and an authoritative BOM
- BOM quantities correctly scale with length/spacing/options
- Drawings/PDF exports are available for generated jobs
- Validation blocks invalid combinations before generation
- Job queueing prevents automation server overload and ensures deterministic output

## 13) Generalization Pattern (Beyond Conveyors)

The same framework can be reused for any "same-but-different" product family:

1. Define product-specific parameter schema
2. Build one master CAD model with rule-driven dimensions/features
3. Encode BOM and document rules in one centralized dictionary
4. Expose a web form + 3D preview
5. Route generation through the same automation job API

Only the rule set, CAD template, and UX form fields need to change per product line.

