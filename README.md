# SupplySetu Backend

## Local Run

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `JWT_SECRET`, and `LOG_LEVEL`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:5000/health`.

Expected response:

```json
{ "status": "ok" }
```

## Node Version

The repo is pinned for deployment consistency:

```txt
.nvmrc => 22.13.0
package.json engines.node => >=22.13.0
```

## Production Scripts

```json
{
  "dev": "tsx watch apps/backend/src/core/server.ts",
  "build": "tsc",
  "start": "node dist/apps/backend/src/core/server.js"
}
```

Run locally:

```bash
npm run build
npm start
```

## Environment

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/supplysetu
JWT_SECRET=replace-with-a-strong-secret-key
LOG_LEVEL=info
```

## Programmatic Migrations

Database migrations run automatically during backend startup before Fastify begins listening.

Startup order:

1. initialize Knex
2. run `runMigrations()`
3. start Fastify server

## Portable Backend Deployment

Use the included root [Dockerfile](/g:/Supplysetu/Dockerfile) for provider-agnostic backend deployment.

Build locally:

```bash
docker build -t supplysetu-backend .
```

Run locally:

```bash
docker run --rm -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/supplysetu \
  -e JWT_SECRET=replace-with-a-strong-secret-key \
  -e LOG_LEVEL=info \
  supplysetu-backend
```

Health check:

```bash
curl http://localhost:5000/health
```

Expected:

```json
{ "status": "ok" }
```

## Railway

`railway.json` is included at the repo root.

### Deploy Steps

1. Log in to `railway.app` with GitHub.
2. Click `New Project`.
3. Choose `Deploy from GitHub repo`.
4. Select this repository.
5. Wait for Railway to complete the first build.
6. Add a PostgreSQL plugin service.
7. Copy the generated `DATABASE_URL`.
8. Add environment variables in Railway:
   `NODE_ENV=production`
   `PORT=5000`
   `DATABASE_URL=<railway postgres url>`
   `JWT_SECRET=<strong secret>`
   `LOG_LEVEL=info`
9. Trigger a redeploy.
10. Generate a public domain in Railway networking settings.

If Railway uses Nixpacks instead of Docker and your provider image is older, set:

```env
NIXPACKS_NODE_VERSION=22.13.0
```

### Git Commands

```bash
git init
git add .
git commit -m "backend production ready"
git branch -M main
git remote add origin <REPO_URL>
git push -u origin main
```

### Verification

```bash
curl https://your-backend-url/health
```

Expected:

```json
{ "status": "ok" }
```

## Mobile App

Update Expo API base URL to your deployed domain:

```ts
apiBaseUrl: "https://your-backend-url/api/v1"
```

Local fallback:

```ts
http://localhost:5000/api/v1
```

Android emulator fallback:

```ts
http://10.0.2.2:5000/api/v1
```

## Troubleshooting

### Build Fail

- Commit the latest `package-lock.json`.
- Use Node `22.13.0` or newer.
- Run `npm run build` locally before pushing.
- If your platform supports Docker, prefer the included Dockerfile.

### DB Fail

- Confirm `DATABASE_URL` is set.
- Confirm the PostgreSQL instance is reachable from the container/runtime.
- The backend now blocks startup until migrations succeed.

### Port Fail

- Do not hardcode cloud ports.
- The server reads `process.env.PORT`.
- The server binds to `0.0.0.0`.

### Monorepo Deploy Issues

- Prefer Docker-based deploys for backend-only portability.
- Commit the root `package-lock.json` after dependency changes.
- If a provider struggles with workspaces, deploy via Docker instead of native Node buildpacks.
