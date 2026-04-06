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

## Monorepo development

See [CLAUDE.md](./CLAUDE.md) for the full development guide.
