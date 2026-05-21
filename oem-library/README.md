# OEM Library Management

This folder is the GitHub-backed source of truth for OEM-specific 3D models in the main Simulation app.
In-app admin editor is available at `/oem-admin` (admin users only).

## Structure

```text
oem-library/
  index.json
  <company-folder>/
    <model-files>.glb|.gltf|.obj|.step|.stp
    <thumbnails> (optional)
```

## How admin manages OEM models

1. Create/update a company folder (for example `oem-library/siemens/`).
2. Add model files (`.glb`, `.gltf`, `.obj`, `.step`, `.stp`) into that folder.
3. Update `oem-library/index.json`:
   - add company entry
   - add model entries under that company
   - set `modelFormat` (`glb`, `gltf`, `obj`, `step`)
   - use `glbPath` for files inside the company folder (preferred), or `glbUrl` for explicit URLs/data URLs
4. Commit and push to GitHub `main`.
5. Open the Simulation editor and use the **OEM** tab in the library.

### Optional: direct sync from OEM Admin UI

The `/oem-admin` page includes **Sync to GitHub** for admins. It can:
- upload imported OEM model files
- update `oem-library/index.json`
- delete model files queued by company/model deletion

Worker configuration required:
- `GITHUB_OEM_OWNER`
- `GITHUB_OEM_REPO`
- `GITHUB_OEM_BRANCH`
- `GITHUB_OEM_LIBRARY_PATH`
- secret: `GITHUB_TOKEN` (repo contents write access)

## index.json format

```json
{
  "companies": [
    {
      "id": "siemens",
      "name": "Siemens",
      "folder": "siemens",
      "models": [
        {
          "id": "s7-station",
          "name": "S7 Station",
          "description": "PLC station model",
          "placementCategory": "environment",
          "modelFormat": "obj",
          "glbPath": "s7-station.obj",
          "thumbnailUrl": "thumbs/s7-station.png",
          "defaultScale": [1, 1, 1],
          "priceUsd": 1200,
          "priceCurrency": "EUR",
          "connectionPorts": [
            { "id": "in-1", "type": "input", "localPosition": [-0.8, 0.6, 0] },
            { "id": "out-1", "type": "output", "localPosition": [0.8, 0.6, 0] }
          ]
        }
      ]
    }
  ]
}
```

### placementCategory

- `process` -> added as process node
- `environment` -> added as environment asset
- `actors` -> added as actor

### priceUsd

- Optional numeric unit price value.
- Interpreted using `priceCurrency`.
- Used for BOM costing in the main Simulation tool.

### priceCurrency

- Currency for `priceUsd` value.
- Supported: `EUR`, `USD`, `INR`.
- BOM in the Simulation tool can convert currencies using user-entered conversion rates.

### connectionPorts

- Optional node/port definitions for model connectivity.
- Used by admin-only OEM editor and runtime connection logic.

### modelFormat

- `glb` / `gltf`: GLTF models.
- `obj`: Wavefront OBJ models.
- `step`: STEP/STP/IGES CAD files (triangulated in browser for preview/runtime).

