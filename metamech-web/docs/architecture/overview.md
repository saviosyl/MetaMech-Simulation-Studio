# MetaMech Web Architecture

```text
metamech-web/
  apps/
    corporate/              # Future metamechsolutions.com
    mdat/                   # Preserved MDAT site → mdat.metamechsolutions.com
    simulation/             # Simulation marketing → simulation.metamechsolutions.com
    goldmeta-marketing/     # GoldMeta presentation (product stays on goldmeta.app)
  packages/
    brand/                  # Colour tokens, brand constants
    shared/                 # Products, contact, process content
    ui/                     # Minimal shared primitives
  assets/                   # Shared brand/product imagery
  docs/
    architecture/
    migration/
    deployment/
```

## Boundaries

- Website monorepo does **not** own Simulation Studio 3D application runtime.
- Website monorepo does **not** own MDAT desktop application or GoldMeta iOS/Firebase backends.
- Production root remains untouched until domain migration is approved.

## Local ports

| App | Port |
|-----|------|
| MDAT | 3000 |
| Corporate | 3001 |
| Simulation marketing | 3002 |
| GoldMeta marketing | 3003 |
