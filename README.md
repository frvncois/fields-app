# Fields CMS

A code-first headless CMS that runs as a Vite plugin inside your existing project.

## Quick start

```sh
npm create fields-cms@latest
```

The wizard installs the package, creates `fields.config.ts`, patches your `vite.config.ts`, and creates the first admin user.

## Manual install

```sh
npm install --save-dev @fields-cms/fields
```

Add the plugin to your `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { fieldsPlugin } from '@fields-cms/fields'

export default defineConfig({
  plugins: [fieldsPlugin()],
})
```

Then run the migration and create an admin user:

```sh
npx fields migrate
npx fields add-user
```

The admin UI is served at `http://localhost:5173/fields`.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `FIELDS_JWT_SECRET` | **Yes in production** | random per-process | JWT signing key — set a stable secret or every server restart invalidates all sessions |
| `FIELDS_DB_PATH` | No | `{projectRoot}/fields.db` | Override the SQLite database file path |
| `FIELDS_ALLOWED_ORIGINS` | No | — | Comma-separated list of allowed CORS origins (e.g. `https://app.example.com,https://preview.example.com`) |
| `FIELDS_TRUST_PROXY` | No | — | Set to `true` to read the client IP from the leftmost `X-Forwarded-For` header (use only when behind a single trusted reverse proxy) |

## CLI commands

```sh
# Sync collections from fields.config.ts into the database (additive + destructive with confirmation)
npx fields migrate

# Validate fields.config.ts without touching the database
npx fields validate

# Interactively create an admin user
npx fields add-user

# Non-interactive user creation (CI / scripts)
npx fields add-user --email admin@example.com --password s3cr3t

# Interactively remove an existing user
npx fields remove-user
```

## Database adapters

### SQLite (default)

No configuration needed. Creates `fields.db` at the project root.

```ts
// vite.config.ts — explicitly passing the default adapter
import { fieldsPlugin, SQLiteAdapter } from '@fields-cms/fields'

export default defineConfig({
  plugins: [fieldsPlugin({ db: new SQLiteAdapter('/path/to/fields.db') })],
})
```

### PostgreSQL

```sh
npm install pg
```

```ts
import { fieldsPlugin, PgAdapter } from '@fields-cms/fields'

const db = await PgAdapter.connect(process.env.DATABASE_URL!)

export default defineConfig({
  plugins: [fieldsPlugin({ db })],
})
```

### Turso

```sh
npm install @libsql/client
```

```ts
import { fieldsPlugin, TursoAdapter } from '@fields-cms/fields'
import { createClient } from '@libsql/client'

const db = new TursoAdapter(createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
}))

export default defineConfig({
  plugins: [fieldsPlugin({ db })],
})
```

## Storage adapters

### Local (default)

Files saved to `public/uploads/` relative to the project root. No configuration needed.

### Amazon S3

Required env vars: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `FIELDS_S3_BUCKET`

```sh
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

```ts
import { fieldsPlugin, S3Adapter } from '@fields-cms/fields'

export default defineConfig({
  plugins: [fieldsPlugin({ storage: new S3Adapter() })],
})
```

### Supabase Storage

Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FIELDS_SUPABASE_BUCKET`

```sh
npm install @supabase/supabase-js
```

### Vercel Blob

Required env vars: `BLOB_READ_WRITE_TOKEN`

```sh
npm install @vercel/blob
```

### Netlify Blobs

Required env vars: `NETLIFY_SITE_ID`, `NETLIFY_AUTH_TOKEN`

```sh
npm install @netlify/blobs
```

### Firebase Storage

Required env vars: `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT` (JSON), `FIELDS_FIREBASE_BUCKET`

```sh
npm install firebase-admin
```

## Production deployment checklist

- [ ] Set `FIELDS_JWT_SECRET` to a stable random string (e.g. `openssl rand -hex 32`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure a database adapter appropriate for your hosting platform (SQLite not recommended for multi-instance deployments)
- [ ] Configure a cloud storage adapter (local storage is ephemeral on most platforms)
- [ ] Set `FIELDS_ALLOWED_ORIGINS` if your frontend is on a different origin
- [ ] Set `FIELDS_TRUST_PROXY=true` only when behind a single trusted reverse proxy
- [ ] Add `.env` to `.gitignore` — never commit secrets

## Contributing

See [CLAUDE.md](./CLAUDE.md) for the development guide and monorepo layout.

Issues and pull requests are welcome on GitHub.

## Monorepo development

See [CLAUDE.md](./CLAUDE.md) for the full development guide.
