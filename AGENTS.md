# AGENTS.md

## Cursor Cloud specific instructions

MetaMech Simulation Studio is a monorepo with one product surface (`frontend/`) backed by
a Node/Express + PostgreSQL API (`backend/`). A Cloudflare Worker + D1 alternative
(`cloudflare-worker/`) also exists but is not needed for local dev. Standard commands live
in `README.md` / `QUICKSTART.md` and the per-package `package.json` scripts; only the
non-obvious caveats are captured below.

### Services and how to run them
- PostgreSQL 16 is installed at the system level (not Docker; `docker` is unavailable). It is
  NOT auto-started on boot — start it each session with `sudo pg_ctlcluster 16 main start`.
  DB `metamech_studio`, user/password `postgres`/`postgres` on `127.0.0.1:5432` already exist
  (created during setup and persisted in the snapshot).
- Backend API (port 3000): `cd backend && npm run dev`. Apply schema with `npm run migrate`
  and seed the admin with `npm run seed:test-admin` (only needed on a fresh DB).
- Frontend (Vite, port 5173): `cd frontend && npm run dev`.

### Non-obvious gotchas
- `frontend/.env` is git-tracked and points at the PRODUCTION API
  (`https://api.metamechsolutions.com`). For local dev it is overridden by a gitignored
  `frontend/.env.local` (`VITE_API_URL=http://localhost:3000`). Keep that file; without it the
  UI talks to production and local login/project APIs will not work.
- `backend/.env` is gitignored and already created. The backend also has dev fallbacks in
  `backend/src/database.ts` (defaults to `postgres/postgres@127.0.0.1:5432/metamech_studio`)
  and a `JWT_SECRET` fallback, so it can still run in dev if `backend/.env` is missing — but
  the checked-in file also sets `EXPOSE_DEV_VERIFICATION_LINK=true` so the register endpoint
  returns the email-verification link directly in its JSON response (no mail service needed).
- `npm run lint` (frontend) currently FAILS: the repo ships no ESLint config file, so
  `eslint` cannot find one. This is a pre-existing repo issue, not an environment problem.
  Use `npm run build` (frontend `vite build` / backend `tsc`) for typecheck validation.
- `node_modules/` is committed for `backend/` and `frontend/`, so `npm install` shows tracked
  files as modified. Do not commit those changes.
- Test admin account: `admin@metamech.dev` / `AdminPass123!` (active subscription, bypasses
  trial gating).
- Editor object placement uses HTML5 drag-and-drop from the left panel into the 3D viewport.
  Scenario templates load JSON from an external public GitHub repo (optional; requires
  internet and is not required for core editor/auth/project testing).
