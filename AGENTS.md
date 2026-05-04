# Project Delivery Assistant

AI-powered virtual assistant for project delivery management. Full-stack monorepo with React frontend and Node.js/Express backend.

## Architecture

| Component | Location | Port | Description |
|-----------|----------|------|-------------|
| Backend API | `server/` | 3001 | Express REST API with health, projects, and assistant endpoints |
| Frontend | `client/` | 5173 | React SPA (Vite dev server) with project dashboard and chat UI |

## Quick Reference

| Action | Command |
|--------|---------|
| Install deps | `pnpm install` |
| Dev (both) | `pnpm dev` |
| Dev server only | `pnpm dev:server` |
| Dev client only | `pnpm dev:client` |
| Lint all | `pnpm lint` |
| Test all | `pnpm test` |
| Build client | `pnpm build` |

## Cursor Cloud specific instructions

- **Node.js 20** is required. The environment uses nodesource Node.js 20.x installed via apt.
- **pnpm** is the package manager. The workspace uses `pnpm-workspace.yaml` to manage `server/` and `client/` packages.
- The Vite dev server at `:5173` proxies `/api/*` requests to the Express backend at `:3001`. Both must run together for full functionality.
- Run `pnpm dev` from the workspace root to start both services concurrently (via `concurrently`).
- Server tests use Jest + Supertest. Client tests use Vitest + React Testing Library.
- The `esbuild` package requires build scripts to run — this is handled via `pnpm.onlyBuiltDependencies` in root `package.json`.
- No database or external API keys are required for basic development. The backend uses in-memory mock data.
