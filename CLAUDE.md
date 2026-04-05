# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite HMR)
npm run build        # Type-check + production build
npm run type-check   # Run vue-tsc type checking only
npm run build-only   # Production build without type check
npm run preview      # Preview production build locally
```

No linting or test runner is configured.

## Architecture

Vue 3 SPA using Vite, TypeScript, and Vue Router. This is a headless CMS called "Fields". The Vite base is `/fields`, so the admin UI is served at `/fields` and all asset paths are relative to that.

**Entry & global setup (`src/main.ts`)** — Fonts must be imported here as JS imports (not CSS `@import`) to avoid Vite/postcss resolution failures. Lenis smooth scroll is initialized here. `validateConfig(config)` is called at boot (from `src/utils/validateConfig.ts`) and throws if the config has duplicate field keys.

**Routing (`src/router/index.ts`)** — Five named routes: `setup`, `login`, `dashboard`, `editor`, `list`. The async `beforeEach` guard hits `GET /api/fields/setup` on the first navigation to check whether any users exist. If `needsSetup` is true, all routes redirect to `setup`. Call `markSetupComplete()` (exported from the router) after the setup form succeeds to reset the cache without a page reload.

**Layout (`src/layouts/LayoutApp.vue`)** — CSS grid with `var(--nav-width)` and `var(--header-height)` custom properties defined in `src/assets/global.css`. `SharedNav` spans both grid rows. Global sheets (`SheetSettings`, `SheetStorage`), modals (`ModalAlert`, `ModalConvert`), and `UiToast` are mounted here at root level.

**Backend (`server/plugin.ts`)** — A Vite plugin that intercepts all `/api/fields/*` requests and dispatches to handlers in `server/handlers/`. Request order in `dispatch()`:
1. Security headers + CORS (every request)
2. `GET/POST /setup` — always public, no auth
3. Users-exist guard — returns `{ needsSetup: true }` (403) if the `users` table is empty
4. `POST /auth/login` — public, login-specific rate limiter (5 attempts / 15 min, SQLite)
5. General rate limiter — 300 req/min per IP, persisted to `_rate_limits` (key prefix `auth:`)
6. JWT verification — reads `fields_token` httpOnly cookie, checks `_token_revocations`
7. Route dispatch to handlers

**`server/auth.ts`** — JWT helpers. Tokens are 1-day JWTs with a `jti` (UUID) claim, signed with `FIELDS_JWT_SECRET`. In development, the secret is `randomBytes(32)` per process. In production, `FIELDS_JWT_SECRET` must be set or the process throws at startup. Cookie helpers: `tokenCookieHeader(token)` (HttpOnly; SameSite=Strict; Secure in production), `clearCookieHeader()` (Max-Age=0), `getBearer(req)` (reads the cookie).

**`server/db.ts`** — Creates the SQLite DB at `fields.db` (overridable via `FIELDS_DB_PATH`). Runs `createSchema` then `runMigrations` then `seedIfEmpty` on every startup. Internal tables not exposed to the API: `_migrations`, `_rate_limits`, `_token_revocations`. No users are seeded — the setup wizard creates the first admin.

**`server/utils/ip.ts`** — Single `getClientIp(req)` implementation shared by both `server/plugin.ts` and `server/handlers/auth.ts`. Uses `socket.remoteAddress` by default; reads the rightmost `X-Forwarded-For` value when `FIELDS_TRUST_PROXY=true`.

**`server/handlers/`** — One file per resource: `auth`, `collections`, `entries`, `locales`, `media`, `settings`, `setup`, `types`. `types.ts` exports `Req`, `Res`, `Db`, `json()`, and `readJson()` (enforces 1 MB body limit; throws with `{ status: 413 }` on breach, caught by the plugin's error wrapper).

## Component conventions

**`src/components/ui/`** — Primitive UI components (`UiButton`, `UiInput`, `UiSheet`, `UiTable`, etc.). Use `defineModel` for two-way binding, `defineProps` with TypeScript generics (no `withDefaults`).

**`src/components/shared/`** — App-specific composed components (`SharedNav`, `SharedHeader`, `AppActions`, `AppBreadcrumbs`). `AppActions` is route-aware and renders different buttons based on `route.name`.

**`src/components/modal/`** — Modal content components (`ModalAlert`, `ModalConvert`). Each wraps `UiModal` and pulls state from its own composable (`useAlerts`, `useConvert`).

**`src/components/sheet/`** — Slide-in panel content components (`SheetSettings`, `SheetStorage`). Each wraps `UiSheet` and pulls state from its own composable (`useSettingsSheet`, `useStorage`).

**`src/components/editor/`** — `EditorSidebar` uses `defineModel` for `published`, `metaTitle`, `metaDescription`, `slug` — wired from `useEditorState` in `EditorView`. The sidebar uses `align-self: start` + `position: sticky; top: var(--header-height)` to stick below the header.

**`src/components/ui/items/`** — Row-level item components rendered inside list/table containers.

**`src/assets/icons/`** — Custom SVG Vue components, all using `stroke="currentColor"`. Use Heroicons (`@heroicons/vue/24/outline`, `/20/solid`, `/16/solid`) for standard icons; custom icons in `src/assets/icons/` for app-specific shapes.

## API layer (`src/api/`)

`src/api/client.ts` is the HTTP foundation — use `apiFetch` for all API calls. Auth is cookie-based (httpOnly `fields_token` set by the server); `apiFetch` always passes `credentials: 'include'`. On 401, clears the local auth hint and redirects to `/login`. **Exception:** `src/api/auth.ts` `login()` uses raw `fetch` — the login call is the one unauthenticated bootstrap request, and using `apiFetch` would cause a redirect loop.

Auth hint helpers in `client.ts`: `hasAuthHint()`, `setAuthHint()`, `clearAuthHint()`. These are a non-sensitive `fields_auth` localStorage flag used only for the client-side router guard. The server httpOnly cookie is the actual credential — if the cookie is gone but the hint remains, the first 401 from any `apiFetch` call clears the hint and redirects.

Each resource has its own module (`auth.ts`, `entries.ts`, `media.ts`, `settings.ts`, etc.) that calls `apiFetch`. Always check `res.ok` before reading the response body.

## Global state pattern

Composables in `src/composables/` that manage UI state use **module-level refs** (declared outside the function) so state is shared as a singleton across all consumers — no Pinia needed for simple open/close state.

```ts
const isOpen = ref(false)  // module-level = shared singleton

export function useMySheet() {
    return { isOpen, open: () => { isOpen.value = true }, close: () => { isOpen.value = false } }
}
```

**`useEntries`** — list state (`entries`, `loading`, `fetchAll`, `fetchByCollection`, `remove`). Used by `ListView`.

**`useEntry`** — single-entry state (`currentEntry`, `loading`, `fetchById`, `clear`). Used by `EditorView` and `AppBreadcrumbs`. Exported from the same file as `useEntries`.

**`useEditorState`** — editor form state. Exposes `title`, `fieldValues`, `published`, `metaTitle`, `metaDescription`, `slug` (the SEO fields are writable computeds that read/write `fieldValues['_metaTitle']` etc.). Call `save()` — it derives `status` from `published.value` internally.

**`useAlerts`** — Modal confirm/prompt system. Call `confirm(opts)` or `prompt(opts)` anywhere; returns a Promise resolved when the user responds. `variant: 'danger'` shows a `TrashIcon` in the modal body.

**`useToast`** — Fire-and-forget toasts. Call `toast(message, type)` with type `'default' | 'success' | 'error'`. Auto-dismisses after 4 s.

## EditorField data flow

`EditorField` receives `:values` (a `FieldValues` object) and emits `update:values` with a new object on every change — it never mutates the prop directly. The parent (`EditorView`) handles it:

```vue
<EditorField :field="field" :values="fieldValues" @update:values="fieldValues = $event" />
```

Repeater sub-fields follow the same pattern recursively, with `updateRow(i, $event)` in the repeater.

## UiModal

Generic modal shell using `Teleport` + `Transition`. Props: `open: boolean`. Emits: `close`. Closes on backdrop mousedown. Use `ModalAlert`/`ModalConvert` as reference for the content slot pattern.

## UiSheet

Generic slide-in panel using `Teleport` + `Transition`. Closes on mousedown/focusin outside the sheet element, and on any route change.

- `anchor="nav"` — slides from left, positioned at `left: var(--nav-width)`, z-index 50 (under `SharedNav` at z-index 60)
- `anchor="right"` (default) — slides from right at `right: 0`
- No backdrop/overlay

## UiButton variants

`variant?: 'default' | 'ghost' | 'outline' | 'danger'` — `danger` uses `var(--color-danger)` background with white text.

## Reusable composables

- **`useSort<T>`** — Generic sort state. Call `toggleSort(key)` from column headers, pass items through `applySorting(items)`. Items must be `Record<string, string>`.
- **`useFilters(defs)`** — Declarative filter definitions (`search` | `select` types) with a reactive `values` object. Pass `defs` and `values` to `UiFilters` for rendering.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `FIELDS_JWT_SECRET` | **Yes in production** | random per-process | JWT signing key; startup throws if missing in production |
| `FIELDS_TRUST_PROXY` | No | — | Set to `true` to read the rightmost X-Forwarded-For IP |
| `FIELDS_ALLOWED_ORIGINS` | No | — | Comma-separated list of CORS origins |
| `FIELDS_DB_PATH` | No | `./fields.db` | Path to the SQLite database file |

## Dependency notes

Server-only packages (used only in `server/` — Node.js runtime via the Vite plugin):
- `better-sqlite3` — SQLite database
- `busboy` — multipart file upload parsing
- `bcryptjs` — password hashing (cost factor 12 everywhere)
- `jsonwebtoken` — JWT signing/verification
- `image-size` — server-side image dimension extraction for uploaded files

Client packages (bundled into the frontend):
- `vue`, `vue-router` — framework
- `@tiptap/*` — rich text editor
- `@heroicons/vue` — icons
- `lenis` — smooth scroll
