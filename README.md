# MetaMech Simulation Studio

MetaMech Simulation Studio is a web-based 3D industrial layout and simulation tool.
It includes a drag-and-drop editor, process modules, snapping/mating, product flow
simulation, OEM/parametric assets, and scenario loading for demo and validation.

## Repository overview

This monorepo currently contains:

- `frontend/` - React + TypeScript + Vite app (Three.js via React Three Fiber)
- `backend/` - Node.js + Express + PostgreSQL API (local/server deployment path)
- `cloudflare-worker/` - Cloudflare Worker API + D1 migrations (edge deployment path)
- `scenarios/` - JSON scenario files used by the editor/simulation
- `scripts/` - helper scripts such as parts generation

## Core capabilities (current app)

- 3D simulation editor with process/environment/actor modules
- Conveyor/product flow simulation and accumulation behavior
- Node/port mating with visual snap feedback
- Parametric and static asset support
- OEM admin workflows and custom model support
- Scenario import/load from repository paths
- Simulation overlays and runtime statistics

## Prerequisites

- Node.js 20+ recommended
- npm 10+ recommended
- Docker (optional, for local PostgreSQL via `docker-compose.yml`)
- Cloudflare account + Wrangler (optional, for Worker deployment)

## Quick start (frontend only)

Run the editor UI without local API:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

By default, frontend API calls use:

- `VITE_API_URL` if set
- otherwise `http://localhost:3000` in dev

## Full local stack (frontend + backend + PostgreSQL)

### 1) Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2) Configure backend environment

Create `backend/.env` (minimum example):

```bash
NODE_ENV=development
PORT=3000
JWT_SECRET=change-this-secret

DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=metamech_studio
```

### 3) Install and run backend

```bash
cd backend
npm install
npm run migrate
npm run dev
```

### 4) Run frontend

```bash
cd frontend
npm install
npm run dev
```

## Cloudflare Worker / D1 path

Root `package.json` includes Wrangler scripts:

```bash
# from repo root
npm install
npm run cf:d1:migrate:local
npm run cf:d1:migrate:remote
npm run cf:deploy
```

Worker entrypoint is configured in `wrangler.toml`:

- `main = "cloudflare-worker/src/index.ts"`
- D1 migrations dir: `cloudflare-worker/migrations`

## Scenario configuration

The frontend scenario loader can be configured with:

- `VITE_SCENARIO_GITHUB_OWNER`
- `VITE_SCENARIO_GITHUB_REPO`
- `VITE_SCENARIO_GITHUB_BRANCH`
- `VITE_SCENARIO_GITHUB_PATH`

Defaults target this repository's `scenarios/` path.

## Useful commands

### Frontend (`frontend/`)

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview built app
- `npm run lint` - ESLint checks

### Backend (`backend/`)

- `npm run dev` - start API in watch mode
- `npm run migrate` - run SQL migrations
- `npm run seed:test-admin` - seed test admin user
- `npm run build` / `npm run start` - compile and run dist server

### Root (`/`)

- `npm run generate-parts` - generate conveyor parts data
- `npm run cf:*` - Cloudflare Worker and D1 tasks

## Notes

- Both backend and worker paths exist in this repo; environments may use one or both
  depending on deployment target.
- If local auth/API features fail, first verify DB is running and `backend/.env` is set.