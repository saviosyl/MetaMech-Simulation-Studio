# MetaMech Accepted 3D Asset Pipeline (SOLIDWORKS -> Blender -> GLB)

This document defines the **accepted, practical pipeline** for bringing CAD models into MetaMech Simulation Studio using Blender as the cleanup/export stage.

## 1) What MetaMech expects today

### Final runtime/import format
- **Runtime mesh format:** `.glb`
- **Behavior/config metadata:** JSON metadata stored with the asset record (nodes, moving parts, transport path, normalization fields)

### Units
- Authoring metadata in editor is handled in **mm**.
- Runtime world uses **meters**.
- The editor stores normalization fields and runtime applies them:
  - `sourceUnit` (`mm|cm|m|unknown`)
  - `scaleCorrection`
  - `nativeBounds`
  - `normalizedBoundsMm`
  - `pivotOffset` (mm)

### Orientation and grounding
- MetaMech assumes scene-up in viewer/runtime as **Y-up**.
- Grounding is derived from `nativeBounds.min.y` and applied in runtime so base sits on grid (plus optional `pivotOffset`).
- Orientation should be made consistent in Blender before export to avoid confusing node placement.

### Origin/pivot behavior
- Origin/pivot matters:
  - Editor preview applies centering/grounding and optional `pivotOffset`.
  - Runtime also applies normalized grounding and pivot offset from metadata.
- If origin is far from geometry, placement and camera/framing become harder and may require manual correction.

### Geometry vs simulation behavior data
- Mesh geometry remains in GLB.
- Simulation authoring data is separate metadata:
  - nodes
  - moving parts
  - transport path
  - normalization/calibration fields

### Blender as standard stage
- Yes. For SOLIDWORKS users without direct GLB export, Blender should be treated as the **standard cleanup/export stage**.

---

## 2) Recommended file path: SOLIDWORKS -> Blender -> GLB

## Step A — Export from SOLIDWORKS

Use one of:
1. **STEP** (`.step`/`.stp`) if geometry integrity is best in your setup
2. **OBJ** (`.obj`) if you need predictable mesh import and material assignment
3. **STL** (`.stl`) as fallback (geometry only, no materials, often triangulated heavily)

Practical recommendation:
- Prefer **STEP -> Blender (via converter/addon)** when available and stable.
- Otherwise use **OBJ** for easier Blender cleanup than STL.

Export guidance:
- Keep model centered near CAD origin if possible.
- Avoid exporting unnecessary tiny hardware details if they are not needed in simulation.

---

## Step B — Prepare in Blender (required checklist)

Before export to GLB:

1. **Import model**
   - Import OBJ/STL/STEP-converted mesh into Blender.

2. **Set scene units for sanity**
   - Scene Units: Metric.
   - Keep a clear understanding of whether the imported model dimensions are mm/cm/m.

3. **Fix orientation**
   - Ensure conveyor/system faces your intended forward direction consistently for your library.
   - Use one internal convention and stick to it (for example: flow direction along +X in Blender object space for conveyor-like assets).

4. **Fix scale**
   - Validate real dimensions using Blender measure tool or object dimensions.
   - Apply object scaling so dimensions are real (no hidden 100x scale).
   - **Apply transforms** (`Ctrl+A` -> Rotation & Scale).

5. **Set origin/pivot**
   - Put origin at a practical placement point (typically near centerline/footprint area).
   - Keep origin reasonably close to model body (do not leave it far away).

6. **Grounding**
   - Move geometry so the base sits at intended ground reference relative to origin.
   - Avoid huge vertical offsets unless intentional.

7. **Cleanup**
   - Remove duplicate/internal junk meshes.
   - Recalculate normals if needed.
   - Keep mesh complexity reasonable for viewport performance.

8. **Naming**
   - Use clear object/mesh names (these appear in hierarchy for moving-part assignment).
   - Suggested asset file naming: `category-family-variant-v1.glb` (lowercase, hyphenated).

9. **Export GLB**
   - Export as **glTF Binary (.glb)**.
   - Include selected objects only (if appropriate).
   - Apply modifiers if required.
   - Keep export settings consistent across assets.

---

## Step C — Import and normalize in MetaMech Admin Editor

1. Upload GLB in Admin Asset Library/Editor.
2. In **Model Normalization** section:
   - Set `Source Unit` to the true source unit.
   - Adjust `Scale Correction` only if needed.
3. Use:
   - **Raw Bounds** and **Normalized (mm)** readouts.
   - **World Size (m)** readout for runtime sanity.
   - **Fit to Model / Frame Selected / Reset Camera**.
4. If physical measurement is known:
   - Use **Set Known Dimension (mm)** with two-point measure and Apply.
5. Add nodes, moving parts, and path metadata.
6. Save metadata, then publish.

---

## 3) Practical acceptance targets for imported assets

- Model appears near grid and is easy to frame with Fit to Model.
- Normalized dimensions match expected machine size in mm.
- Runtime scale matches editor scale after publish.
- No large unexpected pivot offset needed.
- Infeed/outfeed node placement is clear and practical.

---

## 4) Common failure symptoms and likely cause

- **Too large/small in app:** wrong `Source Unit` and/or bad Blender scale apply.
- **Model below/above grid:** origin/geometry vertical offset issues; review grounding and pivot.
- **Awkward placement/orbit:** origin far from geometry.
- **Hard moving-part authoring:** poor mesh/object naming in Blender export.

---

## 5) Current limitations

- MetaMech does not import SOLIDWORKS native CAD directly in browser runtime.
- Non-GLB source formats need conversion before runtime use.
- Advanced automatic CAD-to-simulation semantic extraction is not part of this workflow.

This pipeline is intentionally practical and reliable for beginner-to-intermediate users.
