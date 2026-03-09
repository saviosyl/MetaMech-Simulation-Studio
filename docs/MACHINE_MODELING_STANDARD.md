# Machine Modeling Standard — MetaMech Studio

## Purpose
This document defines the quality standard for all 3D machine models in MetaMech Simulation Studio. All new and rebuilt models must follow these guidelines.

## General Principles

1. **Realistic silhouette** — The model should be immediately recognizable as the real machine from any angle
2. **Clean proportions** — Correct width/height/depth ratios based on real equipment
3. **Simulation-friendly** — Keep polygon count reasonable. No unnecessary detail that slows the app
4. **Premium material finish** — Use proper metalness/roughness values for each material type
5. **Correct transfer zones** — Infeed/outfeed points must be at the actual product transfer location

## Structure Requirements

Every machine model should include:

### Frame & Base
- **Adjustable feet** — 4 floor-mounted feet with cylinders (real machines have these)
- **Legs** — Rectangular or tubular steel legs with correct proportions
- **Cross-members** — Horizontal structural bars connecting legs
- **Base plate** (optional) — Only if the real machine has one

### Conveyor Integration
- **Belt/roller surface** — Must be at the correct transfer height
- **Side guides** — Thin stainless steel guide rails along the belt
- **Drive rollers** — Visible at belt ends
- **Infeed/outfeed sections** — Clearly defined entry and exit areas

### Controls & HMI
- **Control panel** — Side or front-mounted with screen and buttons
- **Status tower light** — 2-3 color stack (green/yellow/red)
- **Sensors** — Photoelectric sensors where appropriate (small boxes with red beam)

### Safety & Guarding
- **Safety guards** where applicable (transparent panels or wire mesh)
- **Warning colors** — Yellow (#eab308) for caution areas
- **Emergency stop** — Red (#ef4444) button/mushroom visible on control panel

## Material Standards

| Material | Color | Metalness | Roughness | Use |
|----------|-------|-----------|-----------|-----|
| Stainless steel | #c0c0c0 | 0.75 | 0.25 | Main frame, food-grade surfaces |
| Dark steel | #4a4a4a | 0.85 | 0.2 | Structural, internal |
| Belt surface | #1e1e1e | 0.3 | 0.6 | Conveyor belts |
| Panel/housing | #2d2d2d | 0.7 | 0.3 | Machine housings, covers |
| Safety yellow | #eab308 | 0.3 | 0.5 | Warning markings |
| Safety red | #ef4444 | 0.4 | 0.4 | Emergency/reject indicators |
| Accent blue | #3b82f6 | 0.6 | 0.35 | Active components, pneumatics |

## Port Placement Rules

**Critical**: Connection ports (infeed/outfeed) must be placed:
- **At the roller/belt surface level** — not at the frame or floor
- **At the edge of the transfer zone** — where product enters/exits
- **Very close to the machine body** — no large gap between port and machine
- **With correct direction vectors** — input faces incoming, output faces outgoing

### Height Adjustability
All machines with connection ports must support:
- `infeedHeight` parameter (mm) — adjustable in properties panel
- `outfeedHeight` parameter (mm) — adjustable in properties panel
- Port Y position reads from these parameters
- Default values match the machine's natural belt height

## Performance Budget

- **Max triangles per model**: ~2000 (use box/cylinder geometry, not complex meshes)
- **Max meshes per model**: ~30 individual mesh objects
- **Avoid**: SphereGeometry with high segments, TorusKnotGeometry, complex curves
- **Prefer**: BoxGeometry, CylinderGeometry (8-12 segments), simple shapes combined cleverly

## Naming Conventions

- Model component: `{ModelName}Model` (e.g., `CheckweigherModel`)
- Props interface: `ModelProps` with `params` record
- Parameter names: camelCase (e.g., `infeedHeight`, `beltWidth`)
- Material helpers: `mat{Type}` (e.g., `matStainless`, `matBelt`)

## Testing Checklist

Before marking a model complete:
- [ ] Renders correctly in light and dark theme
- [ ] Ports align correctly with conveyors when connected
- [ ] infeedHeight/outfeedHeight params work and move ports
- [ ] Model casts and receives shadows
- [ ] No z-fighting (overlapping surfaces)
- [ ] Proportions look correct next to other models
- [ ] Performance: no visible framerate drop with 10+ instances
