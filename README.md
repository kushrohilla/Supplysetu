# SupplySetu Backend

## Local Run

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `JWT_SECRET`, and `LOG_LEVEL`.
3. Run `npm install`.
4. Run `npm run migrate:latest`.
5. Run `npm run dev`.
6. Open `http://localhost:5000/health`.

Expected response:

```json
{ "status": "ok" }
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

Update Expo API base URL to your Railway domain:

```ts
apiBaseUrl: "https://your-backend-url/api/v1"
```

The local fallback is now:

```ts
http://localhost:5000/api/v1
```

Android emulator fallback:

```ts
http://10.0.2.2:5000/api/v1
```

## Troubleshooting

### Build Fail

- Confirm Railway detected `npm run build`.
- Make sure `typescript`, `tsx`, and runtime dependencies are in `package.json`.
- Re-run locally with `npm run build`.

### DB Fail

- Confirm `DATABASE_URL` is set in Railway.
- Confirm PostgreSQL plugin is attached to the same project.
- Re-run migrations with the Railway shell or deploy hook if needed.

### Port Fail

- Do not hardcode the Railway port.
- The server reads `process.env.PORT` and binds to `0.0.0.0`.
- Verify the start command is `npm run start`.
