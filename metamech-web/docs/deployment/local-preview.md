# Local / Preview Build Instructions

Production deploy is **out of scope**. Use local preview only unless a safe Cloudflare Pages preview project already exists and does not alias the apex domain.

## Install

```bash
cd metamech-web
npm install
```

## Dev servers

```bash
npm run dev:mdat        # http://localhost:3000
npm run dev:corporate   # http://localhost:3001
npm run dev:simulation  # http://localhost:3002
npm run dev:goldmeta    # http://localhost:3003
```

## Production builds (static export)

```bash
npm run build
```

Outputs:

- `apps/corporate/out`
- `apps/mdat/out`
- `apps/simulation/out`
- `apps/goldmeta-marketing/out`

Preview a built app:

```bash
npx serve apps/corporate/out -l 3011
```

## Preview deployment policy

- Allowed: isolated Cloudflare Pages **preview** URL with no custom production domain
- Forbidden: attaching `metamechsolutions.com`, changing DNS, or promoting preview to production alias
