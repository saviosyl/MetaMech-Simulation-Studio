# PATTERNS.md — Safe Patterns for MetaMech Studio

> Patterns extracted from reference materials that MetaMech Studio will adopt.
> All patterns are brand-neutral and implementation-safe.

---

## 1. Modular Tool Architecture

**Source:** REF FILE DLL structure (UX.Viewport, UX.UPM, UXAddOn.Paint)

**Pattern:** Each major tool is a self-contained module with a clean interface.

```
Viewport Module     → camera, raycasting, selection, overlays
Modeling Module     → gizmos, alignment, tidy/pack, placement rules
Connectivity Module → mate, snap, conveyor connections, accessory mounting
```

**Rule:** Only ONE module owns mouse/keyboard at a time → `ModeManager` arbitrates.

---

## 2. Theme Token System

**Source:** REF FILE/Dictionaries/ (XAML resource dictionaries with named brushes/colors)

**Pattern:** All colors, spacing, borders, shadows defined as named tokens — never inline hex.

```typescript
// theme-tokens.ts
export const tokens = {
  surface: { bg: 'var(--surface-bg)', border: 'var(--surface-border)' },
  text:    { primary: 'var(--text-primary)', muted: 'var(--text-muted)' },
  accent:  { primary: 'var(--accent-primary)', hover: 'var(--accent-hover)' },
  state:   { success: 'var(--state-success)', error: 'var(--state-error)' },
}
```

**Rule:** Dark and light themes swap CSS variable values. Components reference tokens only.

---

## 3. Import Presets (Config-Driven)

**Source:** componentresources profile configs (XC/XF profile XMLs)

**Pattern:** Different asset types need different import pipelines:

| Preset | Behavior |
|--------|----------|
| **Robot** | Preserve joint hierarchy, pivots, skeleton. No mesh optimization. |
| **Machine/Layout** | Optimize mesh, generate collision bounds, set mount points. |
| **Product** | Lightweight mesh, simple collision box, configurable dimensions. |
| **Floorplan** | Image/DWG underlay, point-to-point scale calibration. |

**Rule:** Import dialog shows preset selector. Preset drives the processing pipeline.

---

## 4. Component Catalog Schema

**Source:** componentmetadata.txt, componenttags.txt

**Pattern:** Every asset in the library has structured metadata:

```typescript
interface AssetMeta {
  id: string;           // unique UUID
  brand: string;        // always "MetaMech" for our assets
  name: string;         // display name
  version: string;      // semver
  tags: string[];       // category tags for filtering
  category: string;     // Process | Environment | Actor | Accessory
  mountType?: string;   // conveyor-end | conveyor-body | floor | ceiling
}
```

**Rule:** Library panel filters by tags. Search matches name + tags.

---

## 5. Accessory Configuration (Profile-Driven)

**Source:** componentresources/profiles/ (AccessoriesConfig, JointConfig, FeetConfig)

**Pattern:** Accessories (sensors, stoppers, pushers, guide rails, feet) are configured per conveyor profile:

```typescript
interface AccessoryConfig {
  compatibleProfiles: string[];  // which conveyor types accept this
  mountMode: 'end' | 'body' | 'side';
  adjustable: {
    alongPath: boolean;    // slide along conveyor length
    heightOffset: boolean; // adjust height
    side: boolean;         // left/right/center
    flip: boolean;         // rotate 180°
  };
}
```

**Rule:** Accessory mount logic checks compatibility before allowing snap.

---

## 6. Support Type System

**Source:** supporttypes.txt

**Pattern:** Support legs/feet are typed and matched to conveyor series:

| Support Type | Compatible Series | Use |
|-------------|-------------------|-----|
| Single | Standard conveyors | Floor standing |
| Center | Mid-width conveyors | Center mount |
| EndDrive | Driven ends | Motor end support |
| Ceiling | All series | Overhead suspension |
| HorizontalBend | Bend sections | Bend support |
| WheelBendDrive | Wheel bends | Powered bend support |

**Rule:** When placing conveyors, auto-suggest compatible support types.

---

## 7. Scene Graph / Cell Graph

**Source:** REF FILE/CellGraph/, Modeling/TreeNode/

**Pattern:** Scene hierarchy uses typed nodes with clear icons:

```
📁 Folder (collapsible group)
🔧 Component (placeable asset)
⚙️ Behavior (simulation logic)
🔗 Link (connection/mate)
📐 Feature (geometry feature)
🎯 DOF (degree of freedom / joint)
📋 Properties (config node)
```

**Rule:** Scene hierarchy panel shows typed icons. Drag to reorder. Right-click for context menu.

---

## 8. Connectivity Patterns

**Source:** REF FILE/Connectivity/ icons + componentresources connection configs

**Pattern:** Connections between components follow rules:

- **Allowed connections:** Defined in `PossibleConnectionsConfig.txt`
- **Forbidden connections:** Defined in `ForbiddenConnectionsConfig.txt`
- **Snap modes:** Position snap, alignment snap, bounds snap, plug-and-play
- **Visual feedback:** Connection preview line, snap highlight, valid/invalid indicator

**Rule:** Before completing a connection, validate against allowed/forbidden rules.

---

## 9. Toolbar Grouping

**Source:** REF FILE/RibbonGroup/, Toolbar/

**Pattern:** Tools are grouped by function, not alphabetically:

```
[Navigate] [Select] [Move/Rotate] | [Snap] [Mate] [Align] | [Measure] [Annotate] | [Simulate]
```

**Rule:** Groups are visually separated. Active tool highlighted. Only one tool active.

---

## 10. Tag-Based Signal Linking

**Source:** Derived from industrial automation patterns in component configs

**Pattern:** Devices communicate via named signal tags:

```typescript
interface SignalTag {
  id: string;          // auto: "SE001", "SE002", ...
  deviceId: string;    // owning device
  type: 'sensor' | 'stopper' | 'pusher' | 'source';
  value: boolean;      // current state
  dwellTimeSec?: number;
  onDwell?: Action[];
}
```

**Rule:** Sensors produce tags. Stoppers/pushers/sources consume tags via dropdown. Live state visible in properties panel.

---

## Summary

These patterns are the architectural backbone. Every new feature should check against this list before implementation to ensure consistency.
