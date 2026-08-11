# MetaMech Web (canonical website workspace)

Isolated monorepo workspace for MetaMech Solutions public websites.

> **Important:** This workspace does **not** replace live `metamechsolutions.com`.  
> Production remains on `MetaMech_2026` until a separately approved domain migration.

## Apps

| App | Path | Future destination |
|-----|------|--------------------|
| Corporate | `apps/corporate` | `metamechsolutions.com` |
| MDAT | `apps/mdat` | `mdat.metamechsolutions.com` |
| Simulation marketing | `apps/simulation` | `simulation.metamechsolutions.com` |
| GoldMeta marketing | `apps/goldmeta-marketing` | Presentation + link to `goldmeta.app` |

## Packages

- `packages/brand` — design tokens / CSS variables
- `packages/ui` — shared website primitives (sparingly)
- `packages/shared` — SEO helpers, constants, product links

## Local preview

```bash
cd metamech-web
npm install
npm run dev:corporate   # corporate homepage
npm run dev:mdat        # preserved MDAT site
npm run build           # build all website apps
```

## Safety

- Do not merge to production from this task alone
- Do not change DNS
- Do not deploy over the current root domain
- See `docs/migration/` for inventory, route map, and domain migration plan
