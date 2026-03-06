# REFERENCE_MAP.md — Reference File Index

> Auto-generated reference index for MetaMech Studio development.
> These files are **reference only** — do not ship to production or expose in UI.

---

## 1. `REF FILE/` — Visual Components Application Resources

**Source:** Extracted from a Visual Components desktop installation.
**Purpose:** Study UX patterns, icon naming conventions, and feature organization.
**Total files:** ~716

### Sub-groups

| Folder | Contents | What to learn |
|--------|----------|---------------|
| `Backstage/` | SVG icons for backstage/settings UI | Settings panel layout, icon naming |
| `CellGraph/` | SVG icons for cell/scene graph tree | Scene hierarchy UX patterns |
| `CollisionDetection/` | Collision detection icons | Collision visualization patterns |
| `Common/` | Shared UI icons | Standard toolbar iconography |
| `Connectivity/` | Connection/mate/snap icons | Connectivity UX — snap, mate, plug-n-play |
| `Dictionaries/` + `Dictionaries/Beta/` | XAML resource dictionaries | WPF theme tokens (colors, brushes, styles) |
| `Drawing/` | Drawing/annotation icons | 2D drawing overlay patterns |
| `FeatureTreeTools/` | Feature tree manipulation icons | Property tree UX |
| `Geometry/` | Geometry operation icons | Geometry tool grouping |
| `hu/` | Hungarian locale resources | Localization patterns |
| `MessageBox/` | Dialog/message box icons | Alert/confirm dialog patterns |
| `Modeling/TreeNode/Main/` | Scene tree node type icons | Node type identification (folder, component, DOF, behavior, link, etc.) |
| `Paint/` | Material/paint icons | Material assignment UX |
| `Program/` | Program editor icons | Robot/sequence programming patterns |
| `RibbonGroup/` | Ribbon toolbar group icons | Toolbar grouping and ordering |
| `Statement/` | Statement/logic icons | Logic statement editor patterns |
| `Statement/ProcessModel/` | Process model statement icons | Process logic programming |
| `Staubli/` | Robot-brand-specific icons | Robot controller UI patterns |
| `Toolbar/` | Main toolbar icons | Core toolbar layout |
| `UPM/` | UPM (Universal Part Manager) icons | Part management patterns |

### Key DLLs (reference architecture only)

| DLL | Insight |
|-----|---------|
| `UX.Viewport.dll` | Viewport is a separate module |
| `UX.ProgramEditorHost.dll` | Program editor is hosted separately |
| `UX.UPM.dll` | Part management is modular |
| `UXAddOn.Paint.dll` | Paint/material is an add-on |
| `VisualComponents.Revolution.DWGReader.dll` | DWG import is a dedicated reader |

### Config files inside `REF FILE/componentresources/`

Nested copy of `componentresources/` — same structure as the top-level folder (see below).

---

## 2. `componentresources/` — Component Database & Configuration

**Source:** Conveyor system component catalog data (FlexLink / industrial conveyor product line).
**Purpose:** Real-world conveyor configuration patterns, part catalogs, profile data.
**Total files:** ~30+

| File | What it is |
|------|-----------|
| `componentmetadata.txt` | Master catalog: UUID → brand, name, version, tags. ~800+ components. |
| `componenttags.txt` | UUID → tag list (Conveyor Part, Function, Support, CableDuct, etc.) |
| `componentvcids.txt` | UUID → VC ID mapping for component identification |
| `componentrevisions.txt` | Full revision history per component |
| `componentreplacements.txt` | Component replacement/upgrade mappings |
| `supporttypes.txt` | Support/leg types with compatible conveyor series |
| `supporttypes-forced.txt` | Forced support assignments |
| `palletsizes.txt` | Standard pallet dimensions |
| `platforms.txt` | Platform type definitions |
| `platformconfigurations.json` | Platform config with dimensions, offsets |
| `guiderailconfigurations.json` | Guide rail configs per conveyor series |
| `machiningDefinitions.xml` | CNC machining definitions for profiles |
| `changelog.html` | Component library version changelog |

### Profile configs (`profiles/XC/`, `profiles/XF/`)

| File pattern | What it is |
|-------------|-----------|
| `*ProfileConfig.xml` | Conveyor profile dimensions & constraints |
| `*AccessoriesConfig.*` | Accessories (stoppers, guides, sensors) config |
| `*DoorConfig.txt` | Door/panel configurations |
| `*FeetConfig.xml` | Support feet/leg configurations |
| `*JointConfig.xml` | Joint/connection configurations |
| `*PanelOptions.xml` | Panel and cover configurations |

### Translations

| File | What it is |
|------|-----------|
| `translations/component-translations-en_US.txt` | English UI strings for components |

---

## 3. `Model/` — Sample 3D Models

| File | What it is |
|------|-----------|
| `simple_rubber_conveyor.glb` | Reference rubber belt conveyor model |
| `item_2050fada...glb` | Sample component GLB |
| `item_2050fada...STEP` | Same component in STEP format (CAD) |
| `Screenshot *.png` | Reference screenshots |

---

## 4. `docs/` — Design Documentation

| File | What it is |
|------|-----------|
| `design.md` | Full implementation plan — architecture, milestones, simulation layers |
| `asset-architecture.md` | Asset storage strategy (R2 buckets, folder structure, manifests) |

---

## 5. `scripts/` — Build Scripts

| File | What it is |
|------|-----------|
| `generate-conveyor-parts.mjs` | Script to generate parametric conveyor part meshes |

---

## 6. Workspace Reference Folders (outside repo)

| Path | What it is |
|------|-----------|
| `../reference-only-/` | Prior version project summary, API docs, deployment guide, file manifest |
| `../reference-assets/` | Downloaded reference assets (currently empty) |
| `../MetaMech_2026/` | Earlier Next.js-based MetaMech site (marketing + simulation) |

---

## Usage Rules

1. **Never copy competitor DLLs or binaries into the MetaMech Studio build.**
2. **Never reference competitor brand names** (FlexLink, Visual Components, etc.) in user-facing UI — use "MetaMech Studio" only.
3. **Safe to study:** Icon naming, folder grouping, config schemas, UX patterns, component catalog structure.
4. **Safe to adapt:** Theme token patterns from XAML dictionaries, toolbar grouping logic, profile configuration schemas.
