# Custom Scenarios Folder

Drop your scenario JSON files in this folder.

The app loads `*.json` files from:

- GitHub repo: `saviosyl/MetaMech-Simulation-Studio`
- Path: `/scenarios`
- Branch: `main` (configurable with frontend env vars)

Each filename becomes the scenario name in the UI.

## Supported JSON formats

### Format A (recommended)

```json
{
  "meta": {
    "category": "Demo",
    "description": "Optional description",
    "version": "1.0"
  },
  "project": {
    "processNodes": [],
    "edges": [],
    "environmentAssets": [],
    "actors": []
  },
  "rules": []
}
```

### Format B (direct scene object)

```json
{
  "processNodes": [],
  "edges": [],
  "environmentAssets": [],
  "actors": [],
  "rules": []
}
```

## Notes

- Only `.json` files are listed in the app.
- 3D rendering behavior is unchanged; scenario data is loaded into the existing scene pipeline.
