# Project Delivery Assistant

A small full-stack project delivery dashboard for tracking projects, owners,
statuses, due dates, and delivery tasks.

## What is included

- Express API with CRUD endpoints for projects
- JSON file persistence for local development
- React/Vite frontend dashboard
- Root scripts to install, test, build, and run the full system

## Getting Started

Install all dependencies:

```bash
npm run install:all
```

Run the backend and frontend together:

```bash
npm run dev
```

The API will run on `http://localhost:5000` and the frontend will run on
`http://localhost:5173`.

## Available Scripts

From the project root:

- `npm run install:all` - install root, backend, and frontend dependencies
- `npm run dev` - start the API and frontend in development mode
- `npm test` - run backend API tests
- `npm run build` - create a production frontend build

## API Documentation

- `GET /health` - API health check
- `GET /api/projects` - fetch all projects
- `GET /api/projects/:id` - fetch a single project
- `POST /api/projects` - create a project
- `PUT /api/projects/:id` - update a project
- `DELETE /api/projects/:id` - delete a project

Project data is stored in `backend/data/projects.json` by default. Set
`DATA_DIR` to change where local data is stored.
