# Fields — Master Product Document

## What is Fields

Fields is a **headless CMS that lives inside your app** — not a separate server, not a SaaS, not a plugin marketplace.

It is code-first, minimal, predictable, and AI-compatible by design.

```
Your App (Nuxt / Next / React / Vue)
  ├── Fields Core (engine)
  ├── Fields Admin (/field)
  └── Fields API (/api/field)
```

---

## Core Principle

> Content structure should be as clear and deterministic as your database schema.

Fields treats content like code: explicit, versioned, diffable, safe to modify.

**Schema is the single source of truth.** If it's not in code, it doesn't exist.

---

## Core Concepts

### Collections

Defined entirely in code. Flat structure (v1). No UI-driven schema editing.

```ts
export default defineCollection({
  name: 'posts',
  fields: {
    title: 'string',
    slug: { type: 'string', unique: true },
    content: 'richtext',
    cover: 'image',
    published: 'boolean'
  }
})
```

### API

```
GET    /api/posts
GET    /api/posts/:slug
POST   /api/posts
PUT    /api/posts/:id
DELETE /api/posts/:id
```

Or typed internal SDK:

```ts
field.posts.findMany()
field.posts.findOne({ slug })
```

### Admin UI

Minimal and functional: list view, edit form, create/delete, publish toggle. No widgets, no distractions.

### Localization

Translation-ready: switch between locales in the editor. Locales are defined in the global schema.

---

## AI-First Design

### Why AI-compatible

The schema is readable by both developers and AI:

```ts
title: 'string'
subtitle: 'string'
readingTime: 'number'
```

AI can safely add, remove, and rename fields because the schema is structured, predictable, and validated.

### CLI as AI Interface

```bash
npx field add-field posts subtitle string
npx field rename-field posts title headline
npx field remove-field posts cover
npx field migrate
npx field validate
```

### Typed SDK

Types update automatically with schema — AI writes correct code without guessing.

---

## AI Content Layer

Not an AI product — an AI assistant layer inside content editing.

- **Bring your own API key** (Anthropic, OpenAI) — no vendor lock-in, no cost for Fields
- **Field-level UX** — AI actions live next to the content they affect

```
Title      [ ✨ Improve ]
Content    [ ✨ Rewrite | Expand | SEO ]
```

- **Structured calls** with full context (collection, field, sibling data)
- **Server-side execution only** — API keys encrypted, never exposed to client

---

## Philosophy of Constraints

Fields is intentionally limited.

**Not in v1:** plugins, dynamic zones, visual schema builder, complex permissions, nested polymorphic relations.

Constraints = clarity. Clarity = speed + reliability.

---

## Developer Experience Goal

Fields should feel like **Prisma** (schema + migrations), not Contentful (UI-driven chaos).

- Install in minutes
- Understand instantly
- Extend safely
- Ship fast

---

## Business Model

**Core:** free, self-hosted, bring your own database.

**Optional (later):** hosted database, backups, media storage, AI credits.

---

## Positioning

> Fields is a CMS that lives in your code and works with AI.

> A headless CMS designed for developers and AI to build together.

---

## What Fields Is Not

- A plugin marketplace
- A no-code builder
- An enterprise content platform
- Trying to be powerful

Fields is trying to be: **predictable, composable, AI-compatible, shippable.**
