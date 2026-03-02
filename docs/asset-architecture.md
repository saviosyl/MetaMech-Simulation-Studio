# MetaMech Simulation Studio — Asset Architecture

## Overview

MetaMech uses a hybrid asset system:
- **Static assets**: Fixed GLB models (forklifts, workers, props)
- **Parametric assets**: Property-driven assemblies rebuilt live (conveyors, racks, walls)

## Storage Strategy

| What | Where | Why |
|------|-------|-----|
| Source code, config, manifests | GitHub | Version control |
| Runtime GLB models, textures, HDRIs | Cloudflare R2 | Zero egress fees, fast CDN |
| User project files, exports | Cloudflare R2 | Scalable object storage |

**Rule: GitHub = brain, R2 = warehouse**

## Cloudflare R2 Buckets

### Bucket 1: `metamech-assets-prod` (runtime delivery)
```
glb/
  conveyors/
    belt/belt-straight-500w-2m-v1.glb
    belt/head.glb, tail.glb, mid.glb, support.glb, motor.glb
    roller/roller-driven-700w-3m-v1.glb
    modular/...
    cleated/...
    transfers/...
    spiral/...
    lifters/...
  warehouse/
    racks/rack-doublebay-3level-01.glb
    pallets/pallet-eur-01.glb
    ...
  vehicles/
    forklifts/forklift-standard-01.glb
    agv/agv-standard-01.glb
    ...
  people/
    operators/operator-male-01.glb
    engineers/engineer-female-01.glb
  machines/
    pick-place/pick-place-01.glb
    palletizer/palletizer-01.glb
  props/...
thumbs/
  (mirrors glb/ structure with .webp thumbnails)
manifests/
  assets.json
materials/
  hdris/factory-floor-01.hdr
```

### Bucket 2: `metamech-assets-source` (original files backup)
```
conveyors/belt/original-fbx/...
vehicles/forklifts/original/...
materials/hdris/original.exr
```

### Bucket 3: `metamech-projects` (user data)
```
projects/{project-id}/
  underlays/...
  imports/...
  exports/...
```

## R2 Setup

1. Create buckets in Cloudflare dashboard
2. Set custom domain: `assets.metamechsolutions.com` → `metamech-assets-prod`
3. Upload with rclone:
   ```bash
   rclone copy /path/to/MetaMech-Asset-Library/02-runtime-assets/ r2:metamech-assets-prod/
   ```

## Local Folder Structure

On your PC, maintain:
```
MetaMech-Asset-Library/
├── 00-manifests/
│   ├── assets.json
│   ├── conveyors.json
│   ├── warehouse.json
│   ├── vehicles.json
│   └── people.json
├── 01-source-assets/
│   ├── conveyors/{belt,roller,modular,cleated,transfers,spiral,lifters}/
│   ├── warehouse/{racks,pallets,crates,walls,doors,windows,stairs}/
│   ├── vehicles/{forklifts,pallet-trucks,agv,amr}/
│   ├── people/{operators,engineers,animations}/
│   ├── machines/{pick-place,palletizer,stations}/
│   └── materials/{hdris,textures,decals}/
├── 02-runtime-assets/
│   ├── glb/ (mirrors R2 structure)
│   ├── thumbs/
│   └── previews/
├── 03-project-assets/
│   ├── underlays/{images,dwg-converted,temp}/
│   ├── exports/{videos,screenshots,reports}/
│   └── user-imports/{models,textures,documents}/
└── 99-archive/
    ├── old-source/
    ├── old-runtime/
    └── unused/
```

## Asset Buying Strategy

### Prefer these formats (in order):
1. GLB / glTF
2. FBX
3. OBJ
4. BLEND / MAX / C4D (source only)

### Source externally:
- Pallets, totes, cartons, crates
- Pallet racks, warehouse props
- Forklifts, pallet trucks, AGVs
- Workers, engineers
- HDRIs, textures

### Build internally (parametric):
- Belt conveyor family
- Roller conveyor family
- Modular conveyor family
- Cleated conveyor family
- Transfer modules
- Later: spiral, vertical lifter, palletizer cells

## Manifest Schema

### Static asset:
```json
{
  "id": "forklift-standard-01",
  "assetType": "static",
  "category": "vehicles",
  "name": "Forklift Standard",
  "glbUrl": "https://assets.metamechsolutions.com/glb/vehicles/forklift-standard-01.glb",
  "thumbnailUrl": "https://assets.metamechsolutions.com/thumbs/vehicles/forklift-standard-01.webp"
}
```

### Parametric asset:
```json
{
  "id": "belt-conveyor-family",
  "assetType": "parametric",
  "category": "conveyors",
  "name": "Belt Conveyor",
  "builder": "beltConveyorBuilder",
  "parts": {
    "head": "/assets/glb/conveyors/belt/head.glb",
    "tail": "/assets/glb/conveyors/belt/tail.glb",
    "mid": "/assets/glb/conveyors/belt/mid.glb",
    "support": "/assets/glb/conveyors/belt/support.glb",
    "motor": "/assets/glb/conveyors/belt/motor.glb"
  },
  "defaults": { "width": 500, "length": 3000, "height": 900, "angle": 0 },
  "limits": { "width": [300, 1200], "length": [500, 12000], "height": [300, 3000], "angle": [0, 35] }
}
```

## Development Phases

### Phase 1 (Current)
- [x] Static asset loader
- [x] Parametric asset framework
- [x] Belt conveyor builder
- [x] Roller conveyor builder
- [x] Property inspector live rebuild
- [x] Manifest-based asset loading
- [ ] Connect to R2 (using local /models/ for now)

### Phase 2
- [ ] Modular plastic belt conveyor
- [ ] Cleated conveyor
- [ ] Transfer family (gap bridge, pop-up, pusher, merge/divert)
- [ ] Pallet rack builder
- [ ] Wall/door/window/stair builders

### Phase 3
- [ ] Spiral conveyor
- [ ] Vertical lifter
- [ ] Advanced snapping with parametric port updates
- [ ] Asset streaming/caching from R2
- [ ] KTX2/Draco compression pipeline
