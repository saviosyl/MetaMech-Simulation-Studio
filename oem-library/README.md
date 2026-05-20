# OEM Library Management

This folder is the GitHub-backed source of truth for OEM-specific 3D models in the main Simulation app.

## Structure

```text
oem-library/
  index.json
  <company-folder>/
    <model-files>.glb
    <thumbnails> (optional)
```

## How admin manages OEM models

1. Create/update a company folder (for example `oem-library/siemens/`).
2. Add the GLB model files into that folder.
3. Update `oem-library/index.json`:
   - add company entry
   - add model entries under that company
   - use `glbPath` for files inside the company folder (preferred), or `glbUrl` for explicit URLs
4. Commit and push to GitHub `main`.
5. Open the Simulation editor and use the **OEM** tab in the library.

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
          "glbPath": "s7-station.glb",
          "thumbnailUrl": "thumbs/s7-station.png",
          "defaultScale": [1, 1, 1]
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

