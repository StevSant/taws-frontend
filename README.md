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

## Deploy (Vercel)

Production deploys use **Vercel's native Git integration**, not a custom GitHub Actions
workflow. Vercel connects directly to this repo (`StevSant/taws-frontend`) — not the
`TAWS` monorepo root — because this repo already carries its own `vercel.json` and build
config, and pointing Vercel at the submodule's own repo avoids needing git-submodule
support in Vercel's build environment. `.github/workflows/ci.yml` stays focused on
lint/build verification on every push/PR to `main`; it is independent of, and does not
trigger, the Vercel deploy.

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist/taws-frontend/browser",
  "framework": "angular",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- `outputDirectory` matches the `@angular/build:application` builder's default output for
  a project named `taws-frontend` (`dist/<project-name>/browser`) — verified by running
  `npm run build` and inspecting `dist/taws-frontend/browser/index.html`.
- `rewrites` sends every path to `index.html` so Angular Router (HTML5 `pushState`) can
  handle client-side routes like `/radar` or `/scenarios`. Without this, a hard refresh
  or a shared deep link on any route but `/` hits Vercel's static file server directly
  and 404s — this is the most common Vercel + SPA misconfiguration.
- No `env` block: Angular does not read `process.env` in the browser bundle. Config is
  baked in at build time via `angular.json`'s production `fileReplacements`
  (`environment.ts` -> `environment.prod.ts`, see "Pointing at a different API" above).
  Setting environment variables in the Vercel project dashboard has **no effect** on this
  app — the values must be edited directly in `src/environments/environment.prod.ts`
  before the build Vercel runs picks them up.

### Pre-deploy checklist (blocking — do not deploy to prod until these are resolved)

- [ ] `environment.prod.ts` → `apiBaseUrl` still points at `http://localhost:8000`
      (tracked in issue #30). Update it to the backend's real AWS App Runner URL once
      that exists — the backend was not deployed as of this change, so there is nothing
      real to point at yet. This is a sequencing dependency on the backend deploy, not
      something the frontend side can resolve on its own.
- [ ] `environment.prod.ts` → `supabaseAnonKey` is empty (per issue #27's review). Fill it
      with the real anon/public key from the Supabase project dashboard (Project Settings
      -> API) before production auth will work.
- [ ] A Vercel project needs to be created and linked to this repo by someone with account
      access (`vercel link` or "Import Git Repository" in the dashboard) — not available
      in this sandbox, so no live deploy has been performed or claimed.
