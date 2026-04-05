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

Vue 3 SPA using Vite, TypeScript, Vue Router, and Pinia. This is a headless CMS UI called "Fields".

**Entry & global setup (`src/main.ts`)** — Fonts must be imported here as JS imports (not CSS `@import`) to avoid Vite/postcss resolution failures. Lenis smooth scroll is initialized here. `validateConfig(config)` is called at boot (from `src/utils/validateConfig.ts`) and throws if the config has duplicate field keys.

**Routing (`src/router/index.ts`)** — Three routes: `dashboard`, `editor`, `list`. All use named routes for navigation.

**Layout (`src/layouts/LayoutApp.vue`)** — CSS grid with `var(--nav-width)` and `var(--header-height)` custom properties defined in `src/assets/global.css`. `SharedNav` spans both grid rows. Global sheets (`SheetSettings`, `SheetStorage`), modals (`ModalAlert`, `ModalConvert`), and `UiToast` are mounted here at root level.

**Backend (`server/plugin.ts`)** — A thin Vite plugin router that delegates all `/api/fields/*` routes to handlers in `server/handlers/`. JWT helpers (`signToken`, `verifyToken`, `getBearer`) live in `server/auth.ts`. DB schema + migration tracking (`_migrations` table) + seeding are in `server/db.ts`. All routes except `/api/fields/auth/login` require a valid JWT set as an httpOnly cookie (`fields_token`). Brute force protection: 5 failed attempts per IP per 15 min locks the login route. Rate limiter uses `socket.remoteAddress` by default; set `FIELDS_TRUST_PROXY=true` to trust the rightmost X-Forwarded-For IP.

## Component conventions

**`src/components/ui/`** — Primitive UI components (`UiButton`, `UiInput`, `UiSheet`, `UiTable`, etc.). Use `defineModel` for two-way binding, `defineProps` with TypeScript generics (no `withDefaults`).

**`src/components/shared/`** — App-specific composed components (`SharedNav`, `SharedHeader`, `AppActions`, `AppBreadcrumbs`). `AppActions` is route-aware and renders different buttons based on `route.name`.

**`src/components/modal/`** — Modal content components (`ModalAlert`, `ModalConvert`). Each wraps `UiModal` and pulls state from its own composable (`useAlerts`, `useConvert`).

**`src/components/sheet/`** — Slide-in panel content components (`SheetSettings`, `SheetStorage`). Each wraps `UiSheet` and pulls state from its own composable (`useSettingsSheet`, `useStorage`).

**`src/components/editor/`** — `EditorSidebar` uses `defineModel` for `published`, `metaTitle`, `metaDescription`, `slug` — wired from `useEditorState` in `EditorView`. The sidebar uses `align-self: start` + `position: sticky; top: var(--header-height)` to stick below the header.

**`src/components/ui/items/`** — Row-level item components rendered inside list/table containers.

**`src/assets/icons/`** — Custom SVG Vue components, all using `stroke="currentColor"`. Use Heroicons (`@heroicons/vue/24/outline`, `/20/solid`, `/16/solid`) for standard icons; custom icons in `src/assets/icons/` for app-specific shapes.

## API layer (`src/api/`)

`src/api/client.ts` is the HTTP foundation — use `apiFetch` for all API calls. Auth is cookie-based (httpOnly `fields_token` set by the server); `apiFetch` always passes `credentials: 'include'`. On 401, clears the local auth hint and redirects to `/login`. Auth hint helpers: `hasAuthHint()`, `setAuthHint()`, `clearAuthHint()` (non-sensitive localStorage flag, not the token).

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

## Dependency notes

Server-only packages (used only in `server/` — Node.js runtime via the Vite plugin):
- `better-sqlite3` — SQLite database
- `busboy` — multipart file upload parsing
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT signing/verification

Client packages (bundled into the frontend):
- `vue`, `vue-router` — framework
- `@tiptap/*` — rich text editor
- `@heroicons/vue` — icons
- `lenis` — smooth scroll
