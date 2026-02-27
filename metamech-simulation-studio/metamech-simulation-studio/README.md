# MetaMech Simulation Studio

This repository contains a **work‐in‐progress skeleton** for the MetaMech Simulation Studio web application.  The aim of the project is to build a premium industrial simulation and animation platform, as described in the accompanying design document.

This codebase is divided into two top‑level packages:

- **`backend/`** – a Node.js + TypeScript Express server that will provide authentication and project APIs.  The current implementation contains only minimal scaffolding to illustrate structure; endpoints are stubbed and need to be implemented.
- **`frontend/`** – a React + TypeScript client (using Vite) that will provide the login page, project dashboard and 3D editor.  The current implementation renders a placeholder component and should be extended in future milestones.

## Getting Started

Install dependencies for both front‑end and back‑end:

```bash
npm install --workspaces
```

To start the development servers:

```bash
# Start the API server on http://localhost:3000
npm run --workspace backend dev

# In a separate terminal, start the client on http://localhost:5173
npm run --workspace frontend dev
```

The front‑end proxy is configured to forward API requests to the back‑end.

## Project Structure

```
metamech-simulation-studio/
├── backend/              # Express API server
│   ├── src/
│   │   ├── app.ts        # Create the Express application
│   │   └── server.ts     # Entry point that boots the server
│   └── package.json
├── frontend/             # React client (Vite)
│   ├── src/
│   │   ├── App.tsx       # Root component with placeholder content
│   │   └── main.tsx      # Vite entry point
│   ├── index.html        # HTML template used by Vite
│   └── package.json
└── docs/
    └── design.md         # High‑level design overview
```

## Next Steps

1. Implement authentication endpoints (`/auth/register`, `/auth/login`, etc.) in the back‑end and connect to PostgreSQL.
2. Build the Projects dashboard page in the front‑end and wire it to the API.
3. Implement the 3D editor shell and PBR rendering pipeline using Three.js.
4. Flesh out the process simulation engine and module library according to the specification.

For a full description of requirements and milestones, see [`docs/design.md`](docs/design.md).