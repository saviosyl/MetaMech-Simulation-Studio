# MetaMech Quickstart

Fastest way to run MetaMech locally.

## 1) Frontend only (fastest)

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

---

## 2) Full local stack (frontend + backend + Postgres)

### Start Postgres

```bash
docker compose up -d postgres
```

### Backend setup

Create `backend/.env`:

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

Run backend:

```bash
cd backend
npm install
npm run migrate
npm run dev
```

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

---

## Useful commands

### Frontend

```bash
cd frontend
npm run build
npm run preview
npm run lint
```

### Backend

```bash
cd backend
npm run migrate
npm run seed:test-admin
```

### Cloudflare (optional)

```bash
npm install
npm run cf:d1:migrate:local
npm run cf:d1:migrate:remote
npm run cf:deploy
```
