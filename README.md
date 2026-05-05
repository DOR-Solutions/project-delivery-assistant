# Project Delivery Assistant

A small full-stack project delivery dashboard where people can create an
account, sign in, and manage their own projects, owners, statuses, due dates,
and delivery tasks.

## What is included

- Express API with authentication and CRUD endpoints for projects
- JSON file persistence for users and projects in local development
- React/Vite frontend dashboard with login and registration screens
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

Create an account from the frontend, then sign in to manage your delivery
workspace. Projects are scoped to the signed-in user.

## Available Scripts

From the project root:

- `npm run install:all` - install root, backend, and frontend dependencies
- `npm run dev` - start the API and frontend in development mode
- `npm test` - run backend API tests
- `npm run build` - create a production frontend build

## API Documentation

- `GET /health` - API health check
- `POST /api/auth/register` - create an account and return a session token
- `POST /api/auth/login` - sign in and return a session token
- `GET /api/auth/me` - fetch the current user
- `GET /api/projects` - fetch the signed-in user's projects
- `GET /api/projects/:id` - fetch one project for the signed-in user
- `POST /api/projects` - create a project for the signed-in user
- `PUT /api/projects/:id` - update a project for the signed-in user
- `DELETE /api/projects/:id` - delete a project for the signed-in user

Authenticated API requests should include `Authorization: Bearer <token>`.

Project and user data are stored in `backend/data/*.json` by default. Set
`DATA_DIR` to change where local data is stored. Set `JWT_SECRET` in production.
