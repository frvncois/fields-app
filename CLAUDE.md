# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo layout

```
fields-app/
  packages/
    fields/           # npm package (@fields-cms/fields) — Vite plugin, API server, DB/storage adapters
    fields-admin/     # Vue 3 SPA — admin UI (builds into packages/fields/dist/admin/)
    create-fields-cms/ # npm init wizard — `npm create fields-cms`
  fields.config.ts    # User's collection schema (dev only, not shipped)
  fields.db           # SQLite database (dev only, at repo root)
  tsconfig.json       # Root tsconfig — maps @fields-cms/fields for fields.config.ts type checking
```

## Commands

```bash
npm install                          # Install all workspace dependencies (triggers prepare → tsup in packages/fields)
npm run dev                          # Start fields-admin dev server (Vite HMR)
npm run build                        # Build fields-admin then fields package
npm run type-check                   # vue-tsc (admin) + tsc (fields runtime)
npm run fields:migrate               # Sync fields.config.ts collections into the DB
npm run fields:add-user              # Interactively add an admin user

# Per-package
npm run dev      -w packages/fields-admin
npm run build    -w packages/fields-admin   # outputs to packages/fields/dist/admin/
npm run build    -w packages/fields
npm run type-check -w packages/fields-admin
npm run type-check -w packages/fields
```

No linting or test runner is configured.

**Important**: The admin SPA is served from `dist/admin/` even in dev (the plugin's middleware intercepts `/fields/*` before Vite's own serving). After changing any `fields-admin` source, run `npm run build -w packages/fields-admin` for changes to take effect. Then delete `fields.db` and restart.

**Deleting the DB**: `find . -name "*.db" -delete -o -name "*.db-shm" -delete -o -name "*.db-wal" -delete`

## packages/fields — Vite plugin & runtime (`@fields-cms/fields`)

**`dist/`** — Compiled output (gitignored). Built automatically via the `prepare` hook on `npm install` / `npm link`, or manually with `npm run build -w packages/fields`. Never commit dist/.

**`src/plugin.ts`** — Entry point. Exports `fieldsPlugin(options?: FieldsOptions): Plugin[]` — an array of two Vite plugins:

1. `fields-virtual-config` — resolves `virtual:fields-config` to the serialized user config JSON. Handles HMR: reloads config and re-runs `syncCollections()` when `fields.config.ts` changes.
2. `fields-api` — on `configureServer`: finds the project root, initialises DB + storage + user config, calls `syncCollections()`, serves the pre-built admin SPA from `dist/admin/` at `/fields/*` (injects `window.__FIELDS_CONFIG__` into HTML), and dispatches all `/api/fields/*` requests.

**Key functions in `src/plugin.ts`:**

- `findProjectRoot(startDir)` — walks up from `server.config.root` looking for a `package.json` with `"workspaces"` (monorepo root) or any non-`fields-admin` package.json (standalone project). Used so `fields.db` is always created at the actual project root, not inside `packages/fields-admin/`.
- `syncCollections()` — runs on every server start and HMR reload of `fields.config.ts`. Inserts collections from `userConfig` with `ON CONFLICT DO NOTHING`. For `type: 'page'` collections, also auto-creates a single draft entry (`slug: '/{name}'`) if none exists.
- `getTokenFromCookie(req)` — reads `fields_token` from the cookie header. Used in the auth guard instead of `getBearer` from auth.ts (which has a more complex regex and `decodeURIComponent`).

Request dispatch order in `dispatch()`:
1. Security headers + CORS (every request)
2. `GET/POST /setup` — always public
3. Users-exist guard — `{ needsSetup: true }` (403) if `users` table is empty
4. `POST /auth/login` — public, login rate limiter (5 attempts / 15 min, SQLite)
5. General rate limiter — 300 req/min per IP, `_rate_limits` table (key prefix `auth:`)
6. JWT verification — `getTokenFromCookie(req)`, checks `_token_revocations` for jti
7. Build `UserContext` — fetches role from `users`; for editors also loads `user_permissions` + collection/object grants into `ctx.permissions` (grants stored as `Set<number>`)
8. `GET /me` — returns `{ id, email, role, permissions? }` (grants serialized as arrays)
9. `GET/POST /users`, `GET/DELETE /users/:id`, `PUT /users/:id/permissions`, `PATCH /users/:id/role` — admin-only, delegated to `handleUsers`
10. All other route handlers receive `ctx: UserContext`

**`src/types.ts`** — `CollectionSchema` has `name` (required), `label?`, `type?: 'page' | 'collection' | 'object'`, `fields` (required). `FieldsConfig`, `FieldDef`, `FieldValues`, `FieldType`, `FieldsOptions`, `DatabaseAdapter`, `StorageAdapter`, `Migration`. RBAC types: `UserRole = 'admin' | 'editor'`; `UserPermissions` (boolean action flags + `collectionGrants: Set<number>` / `objectGrants: Set<number>`); `UserContext = { id, role, permissions? }` — `permissions` is only present for editors (undefined means full admin access).

**`src/auth.ts`** — `signToken`, `verifyToken`, `getBearer` (reads httpOnly cookie). Tokens are 1-day JWTs with a `jti` UUID claim. `FIELDS_JWT_SECRET` check is in `configureServer()` (not module scope) so it doesn't crash during frontend builds. Cookie is `HttpOnly; SameSite=Strict; Secure` in production only.

**`src/db.ts`** — `createDb(opts?: { root?: string })` creates SQLite DB at `{root}/fields.db` (override via `FIELDS_DB_PATH`). Runs `createSchema` → `migrate` on every startup. The DB starts empty; setup wizard creates the first user; `syncCollections()` populates collections. Internal tables: `_migrations`, `_rate_limits`, `_token_revocations`. User/permission tables: `users` (id, email, password, role, first_name, last_name), `user_permissions` (one row per editor; all flags default 0), `user_collection_grants` / `user_object_grants` (many-to-many; cascade delete on user or collection removal).

**`src/handlers/setup.ts`** — `handleSetupCreate` reads `projectName`, `firstName`, `lastName`, `email`, `password` from the request body (all validated). After creating the user, writes all four values to the `settings` table and sets the JWT cookie — the user is automatically logged in after setup, no separate login needed.

**`src/handlers/entries.ts`** — `toSlug(db, collectionName, title)` looks up the collection type: pages get `/{slug}` (top-level), collections get `/{collectionName}/{slug}`. Appends `-2`, `-3`, etc. on collision.

**`src/utils/ip.ts`** — Single `getClientIp(req)` shared by plugin and auth handler. Uses `socket.remoteAddress`; reads rightmost `X-Forwarded-For` when `FIELDS_TRUST_PROXY=true`.

**`src/handlers/`** — One file per resource: `auth`, `collections`, `entries`, `locales`, `media`, `settings`, `setup`, `users`. `types.ts` exports `Req`, `Res`, `Db`, `Storage`, `json()`, `readJson()` (1 MB body limit, throws `{ status: 413 }` on breach).

**`src/handlers/users.ts`** — CRUD for users (admin-only). `handleCreateUser` hashes password with bcrypt (rounds 12), inserts an empty `user_permissions` row so editors start with zero access. `handleUpdatePermissions` replaces the full permissions row + collection/object grant rows atomically. `handleChangeRole` / `handleDeleteUser` both guard against removing the last admin.

**`src/adapters/db/`** — `sqlite.ts` (SQLiteAdapter, default), `postgres.ts` (PgAdapter), `turso.ts` (TursoAdapter). Postgres and Turso are async; their sync interface methods (`get`, `query`, `run`, `exec`, `migrate`) throw — use the `*Async()` variants instead.

**`src/adapters/storage/`** — `local.ts` (LocalAdapter, default), `s3.ts`, `supabase.ts`, `vercel.ts`, `netlify.ts`, `firebase.ts`. All optional providers use dynamic `import()` so the package doesn't fail when the provider SDK isn't installed.

**`bin/fields.js`** — CLI: `migrate`, `validate`, `add-user`, `remove-user` commands. `loadConfig()` uses Vite's `loadConfigFromFile()` to parse `fields.config.ts` (handles TypeScript natively, no extra tooling). `migrate` reads `col.label` and `col.type` from config when inserting collections, and auto-creates draft entries for page collections.

## packages/fields-admin — Vue 3 SPA

Vue 3, Vite, TypeScript, Vue Router. Builds to `../fields/dist/admin/` with `base: '/fields'`.

**`src/main.ts`** — Fonts imported as JS (not CSS `@import`) to avoid Vite/postcss failures. Lenis smooth scroll initialised here. `validateConfig(config)` called at boot.

**`src/router/index.ts`** — Five named routes: `setup`, `login`, `dashboard`, `editor`, `list`. The async `beforeEach` guard calls `GET /api/fields/setup`; if `needsSetup` is true, all routes redirect to `setup`. Call `markSetupComplete()` after setup form success to reset without a page reload. For authenticated routes, `beforeEach` also calls `fetchCurrentUser()` (idempotent — only fetches once per session) to load role and permissions into `useAuth` state.

**`virtual:fields-config`** — In dev, the virtual module re-exports the user's actual `fields.config.ts`. In production, it exports `window.__FIELDS_CONFIG__` (injected into `<head>` by the plugin when serving the HTML). Declared in `env.d.ts`.

**`src/api/client.ts`** — Use `apiFetch` for all API calls (`credentials: 'include'`). On 401, clears auth hint and redirects to `/login`. Auth hint (`fields_auth` localStorage flag) is non-sensitive — the actual credential is the httpOnly cookie. Exception: `src/api/auth.ts` `login()` uses raw `fetch` to avoid a redirect loop.

**`src/api/users.ts`** — `getMe()`, `getUsers()`, `getUser(id)`, `createUser(data)`, `updatePermissions(id, perms)`, `changeRole(id, role)`, `deleteUser(id)`. All mutation functions throw on non-OK responses (error message from `{ error }` JSON body).

**RBAC in the UI** — `SharedNav` computes `visiblePages`, `visibleCollections`, `visibleObjects` using `isAdmin()` and `permissions.value` from `useAuth`. Admins always see everything; editors see only what their grants allow. `showSettings` gated on `isAdmin() || permissions.value?.can_settings`. `UsersView` (`src/views/UsersView.vue`) is the user management page (admin-only); not yet registered as a named route.

**Global state** — Composables in `src/composables/` use module-level refs (outside the function) for shared singleton state. No Pinia.

Key composables:
- `useEntries` / `useEntry` — list and single-entry state
- `useEditorState` — editor form; `save()` derives `status` from `published.value` internally; SEO fields are writable computeds over `fieldValues['_metaTitle']` etc.
- `useAlerts` — `confirm(opts)` / `prompt(opts)`, returns a Promise. `variant: 'danger'` shows TrashIcon.
- `useToast` — `toast(message, type)`, auto-dismisses after 4 s.
- `useAuth` — exposes `isAuthenticated`, `role`, `permissions`, `userId`, `isAdmin()`. `fetchCurrentUser()` calls `GET /api/fields/me` once per session (idempotent via `meFetched` flag). `logout()` clears all auth state and resets `meFetched`.

**`EditorField` data flow** — Receives `:values` (FieldValues), emits `update:values` with a new object. Never mutates the prop. Repeater sub-fields follow the same pattern recursively.

**Component conventions:**
- `src/components/ui/` — primitives (`UiButton`, `UiInput`, `UiSheet`, `UiTable`, …). `defineModel` for two-way binding; `defineProps` with TypeScript generics, no `withDefaults`.
- `src/components/shared/` — app-specific (`SharedNav`, `SharedHeader`, `AppActions`, `AppBreadcrumbs`). `AppActions` is route-aware.
- `src/components/modal/` — wraps `UiModal`, pulls state from own composable.
- `src/components/sheet/` — wraps `UiSheet`, pulls state from own composable.
- `UiModal` — `Teleport` + `Transition`. Props: `open`. Emits: `close`. Closes on backdrop mousedown.
- `UiSheet` — `Teleport` + `Transition`. `anchor="nav"` slides from left (z-50, under SharedNav at z-60); `anchor="right"` (default) slides from right. Closes on outside mousedown/focusin or route change.
- `UiButton` — text is passed via the `text` prop, **not** slot content. `variant`: `'default' | 'ghost' | 'outline' | 'danger'`. Other props: `icon`, `size`, `tooltip`, `action`, `disabled`, `dim`, `block`.
- Icons — Heroicons (`@heroicons/vue/24/outline`, `/20/solid`, `/16/solid`) for standard; custom SVG components in `src/assets/icons/` (`stroke="currentColor"`) for app-specific shapes.

## packages/create-fields-cms — init wizard

`bin/create.js` — interactive `npm create fields-cms` wizard. Steps: project name → framework detection → DB selection (SQLite / Postgres / Turso) → storage selection (7 providers) → credential collection → `.env` write → `fields.config.ts` generation → `vite.config.ts` patch → `.gitignore` update → npm install → migration → admin user creation → summary.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `FIELDS_JWT_SECRET` | **Yes in production** | random per-process | JWT signing key |
| `FIELDS_TRUST_PROXY` | No | — | `true` → read rightmost X-Forwarded-For |
| `FIELDS_ALLOWED_ORIGINS` | No | — | Comma-separated CORS origins |
| `FIELDS_DB_PATH` | No | `{projectRoot}/fields.db` | SQLite file path |
