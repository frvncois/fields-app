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

**Entry & global setup (`src/main.ts`)** — Fonts must be imported here as JS imports (not CSS `@import`) to avoid Vite/postcss resolution failures. Lenis smooth scroll is initialized here.

**Routing (`src/router/index.ts`)** — Three routes: `dashboard`, `editor`, `list`. All use named routes for navigation.

**Layout (`src/App.vue`)** — CSS grid with `var(--nav-width)` and `var(--header-height)` custom properties defined in `src/assets/global.css`. `SharedNav` spans both grid rows. Global sheets (`SettingsSheet`, `MediaLibrarySheet`) are mounted here at root level.

## Component conventions

**`src/components/ui/`** — Primitive UI components (`UiButton`, `UiInput`, `UiSheet`, `UiTable`, etc.). Use `defineModel` for two-way binding, `defineProps` with TypeScript generics (no `withDefaults`).

**`src/components/shared/`** — App-specific composed components (`SharedNav`, `SharedHeader`, `AppActions`, `AppBreadcrumbs`). `AppActions` is route-aware and renders different buttons based on `route.name`.

**`src/components/editor/`** — Editor-specific components (`EditorSidebar`). The sidebar uses `align-self: start` + `position: sticky; top: var(--header-height)` to stick below the header — required because CSS grid stretches items by default.

**`src/components/ui/items/`** — Row-level item components rendered inside list/table containers.

**`src/assets/icons/`** — Custom SVG Vue components, all using `stroke="currentColor"`. Use Heroicons (`@heroicons/vue/24/outline`, `/20/solid`, `/16/solid`) for standard icons; custom icons in `src/assets/icons/` for app-specific shapes.

## Global state pattern

Composables in `src/composables/` that manage UI state (sheets, etc.) use **module-level refs** (declared outside the function) so state is shared as a singleton across all consumers — no Pinia needed for simple open/close state.

```ts
const isOpen = ref(false)  // module-level = shared singleton

export function useMySheet() {
    return { isOpen, open: () => { isOpen.value = true }, close: () => { isOpen.value = false } }
}
```

Currently: `useSettingsSheet`, `useMediaLibrary`.

## UiSheet

Generic slide-in panel using `Teleport` + `Transition`. Closes on mousedown/focusin outside the sheet element, and on any route change.

- `anchor="nav"` — slides from left, positioned at `left: var(--nav-width)`, z-index 50 (under `SharedNav` at z-index 60)
- `anchor="right"` (default) — slides from right at `right: 0`
- No backdrop/overlay

## Reusable composables

- **`useSort<T>`** — Generic sort state. Call `toggleSort(key)` from column headers, pass items through `applySorting(items)`. Items must be `Record<string, string>`.
- **`useFilters(defs)`** — Declarative filter definitions (`search` | `select` types) with a reactive `values` object. Pass `defs` and `values` to `UiFilters` for rendering.
