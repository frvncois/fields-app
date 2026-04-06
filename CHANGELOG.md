# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta.1] — Unreleased

### Added
- `fieldsPlugin()` Vite plugin serving admin UI at `/fields` and REST API at `/api/fields`
- SQLite adapter (`SQLiteAdapter`) backed by `better-sqlite3`
- PostgreSQL adapter (`PgAdapter`) with async variants for all operations
- Turso adapter (`TursoAdapter`) for edge/distributed deployments
- Local file storage adapter (`LocalAdapter`) writing to `public/uploads/`
- S3, Supabase, Vercel Blob, Netlify Blobs, and Firebase Storage adapters
- `npm create fields-cms@latest` scaffold wizard
- CLI commands: `fields migrate`, `fields validate`, `fields add-user`, `fields remove-user`
- Collections, entries, media, folders, locales, and settings API handlers
- JWT authentication with httpOnly cookies, token revocation, and per-IP rate limiting
- Setup wizard flow — first user creation locks further public setup access
- Translation support: entries can be duplicated into additional locales
- Magic-byte validation on file uploads to prevent MIME-type spoofing
- Path traversal protection in admin static file serving and local storage deletion
- `FIELDS_JWT_SECRET`, `FIELDS_DB_PATH`, `FIELDS_ALLOWED_ORIGINS`, `FIELDS_TRUST_PROXY` environment variables

### Security
- Admin `/config` endpoint now requires authentication
- `Retry-After` header returned on login rate-limit (429) responses
- `clearCookieHeader()` includes `Secure` flag in production
- X-Forwarded-For reads leftmost (client) IP when `FIELDS_TRUST_PROXY=true`
- Entry title length bounded to 1–500 characters
- `folderId` validated as a positive integer before DB insert
