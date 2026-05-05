# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

This is a full-stack **Project Delivery Assistant** with two backend entry points:

| Component | Entry Point | Port | Notes |
|-----------|-------------|------|-------|
| Backend (MongoDB) | `backend/index.js` | 5000 | Requires MongoDB; blocks startup without it |
| Backend (Extended API) | `backend_server.js` | 3001 | Routes: projects, AI, analytics; uses root-level `node_modules` |
| Frontend (React) | `frontend/` | 3000 | CRA-style app with `react-scripts` |

### Starting Services

1. **MongoDB** must be started first:
   ```
   mkdir -p /data/db && mongod --fork --logpath /var/log/mongod.log --dbpath /data/db
   ```

2. **Backend (port 5000)** — uses Mongoose 5.x which resolves `localhost` to IPv6 `::1`. Use `127.0.0.1` explicitly:
   ```
   cd backend && MONGO_URI=mongodb://127.0.0.1:27017/project_delivery_assistant node index.js
   ```

3. **Extended API server (port 3001)** — runs from workspace root:
   ```
   node backend_server.js
   ```

4. **Frontend dev server (port 3000)**:
   ```
   cd frontend && PORT=3000 npx react-scripts start
   ```

### Gotchas

- **IPv6 issue**: Mongoose 5.x resolves `localhost` to `::1` on this system. Always use `mongodb://127.0.0.1:27017/...` in `MONGO_URI`.
- **react-scripts browserslist prompt**: On first run, react-scripts asks to add browserslist defaults. Answer `Y` or pre-add a `"browserslist"` key to `frontend/package.json`.
- **No lockfiles**: The repo has no `package-lock.json` files, so `npm install` will resolve latest compatible versions each time.
- **No ESLint config**: Neither frontend nor backend has an ESLint configuration file. The `react-scripts build` command validates syntax.
- **Root-level package.json**: `backend_server.js` expects `express`, `cors`, `dotenv` in `/workspace/node_modules`.

### Testing

- No automated test suites are configured in this repo.
- Validate by running `npx react-scripts build` in `frontend/` (checks compilation).
- Test API with `curl http://localhost:3001/health` after starting the extended backend.
