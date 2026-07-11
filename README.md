# taws-frontend

Angular frontend for the TAWS hackathon project. Standalone components, Signals for state
(no NgRx), SSE streaming chat client.

## Quickstart

```bash
npm ci
npm start
```

Serves on `http://localhost:4200`. By default it talks to the backend at
`http://localhost:8000` — start the FastAPI backend separately (see `taws-backend`).

## Pointing at a different API

The API base URL is read from `src/environments/environment.ts` (dev) /
`environment.prod.ts` (prod build), via `AppConfigService`
(`src/app/core/config/app-config.service.ts`). No component or service should read
`environment` directly or hardcode a URL — always go through `AppConfigService`.

To change the target API, edit `apiBaseUrl` in the relevant environment file:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000',
};
```

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Dev server (`ng serve`) |
| `npm run build` | Production build (`ng build`) |
| `npm run watch` | Dev build in watch mode |
| `npm run format` | Format `src/` with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm test` | Test runner (scaffolded, no tests during the hackathon) |

## Structure

See `CLAUDE.md` for the architecture (feature-first, 4-layer chat feature, SSE streaming
flow, and how to add a new feature).
