# taws-frontend — guidance

Angular 21, standalone components, Signals for state. No NgRx. No tests during the
hackathon (test runner is scaffolded but intentionally empty — add specs later if a bug
needs a regression test).

## Layout (feature-first, clean architecture)

```
src/app/
├── core/         # http, auth interceptor, app config service, guards
├── shared/       # reusable standalone UI components (Button, Spinner, ...)
├── layout/       # ShellComponent (header + <router-outlet>)
└── features/
    └── chat/
        ├── domain/           # models + ChatRepository port (abstract class)
        ├── application/      # ChatStore (signals) — the only thing presentation talks to
        ├── infrastructure/   # SseChatRepository — implements ChatRepository via fetch+SSE
        └── presentation/     # ChatPageComponent — standalone page, wired into app.routes.ts
```

**Dependency rule:** `presentation → application → domain ← infrastructure`.
Presentation never imports infrastructure directly. Domain has zero framework/vendor
imports — it only defines the port (`ChatRepository`, as an abstract class so it can also
be used as a DI token).

## Adding a new feature

Mirror the chat feature's 4-layer structure under `features/<name>/`:

1. `domain/` — define the entities/models and any repository **port** (abstract class) the
   feature needs.
2. `infrastructure/` — implement the port(s) against the real backend (HTTP/SSE/etc).
3. `application/` — a signal-based store/facade that depends on the port (never the
   concrete adapter) and exposes state + intent methods to the UI.
4. `presentation/` — standalone components. Bind the port → adapter in the component's
   own `providers` array (see `chat-page.component.ts`) so each feature is self-contained,
   or lift the binding into `app.config.ts` if it needs to be app-wide/shared.
5. Wire a route to the page component in `app.routes.ts` (or a feature-local
   `<feature>.routes.ts` if the route tree grows).

## State: Signals only

- `signal()` for mutable state, `computed()` for derived state, `.asReadonly()` to expose
  read-only views from a store.
- No NgRx, no RxJS state containers. RxJS is fine for one-off async plumbing but Signals
  are the state model.
- Stores live in `application/` and are provided where the feature is used (component
  `providers`, not always `root`) so each navigation can get a fresh instance if that's the
  desired lifecycle — see `ChatStore` in `chat-page.component.ts`.

## SSE streaming flow (chat feature as the reference)

1. `SseChatRepository.streamReply(input)` (`infrastructure/`) POSTs to
   `{apiBaseUrl}/api/v1/chat/stream`, reads the response body with
   `response.body.getReader()`, decodes chunks, and yields each `data: <token>` line's
   payload as an `AsyncIterable<string>`. (Not `EventSource` — it can't POST a JSON body.)
2. `ChatStore.send(message)` (`application/`) appends the user message, appends a pending
   assistant message, then does `for await (const token of chatRepository.streamReply(...))`
   and appends each token to that message's content signal.
3. `ChatPageComponent` (`presentation/`) just reads `store.messages()` / `store.isStreaming()`
   and calls `store.send(draft)` — it never touches `fetch`, `ReadableStream`, or SSE parsing.

To point at a different backend, change `apiBaseUrl` in `src/environments/` — never hardcode
a URL in a component/service. Read it through `AppConfigService` (`core/config/`).

## Environment / config rule

- All configurable values (API base URL, future feature flags) go in
  `src/environments/environment.ts` / `environment.prod.ts`.
- Access them only through `AppConfigService` — don't `import { environment } from '...'`
  outside that service.
- `angular.json`'s production `fileReplacements` swaps in `environment.prod.ts` for
  `ng build` (production is the default configuration).

## npm commands

```bash
npm ci              # install
npm start           # dev server, http://localhost:4200
npm run build        # production build → dist/
npm run watch        # dev build, watch mode
npm run format       # Prettier --write on src/
npm run format:check # Prettier --check
```

## Testing

None during the hackathon by design (see root architecture doc, decision ledger). The
`test` script and Vitest devDependency are present so a spec can be added in minutes if a
bug needs a regression test — don't add test suites proactively.

## Team & ownership

Shared engineering rules live in the root repo's `CLAUDE.md` — everyone follows the same
conventions (Conventional Commits in English, no hardcoded values, direct-to-main in pairs, keep CI
green). Frontend is led by Luis, with Kevin on branding/UI-UX and Marco supporting; see `CODEOWNERS`.

| Dev | Primary area | GitHub |
|-----|--------------|--------|
| Bryan | AI agent dev & project coordination | `@StevSant` |
| Miquel | Backend | `@lesquel` |
| Luis Figueroa | Frontend | `@DweskZ` |
| Kevin Alonso | Branding & UI/UX | `@Tokioh` |
| Marco Zambrano | Backend / Frontend / Data support | `@marco-zambrano` |
