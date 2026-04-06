import Database from 'better-sqlite3'
import { join } from 'node:path'
import { SQLiteAdapter } from './adapters/db/sqlite'
import type { DatabaseAdapter, Migration } from './types'

export type EntryRow = {
    id: number
    title: string
    slug: string
    type: string
    category: 'page' | 'collection' | 'object'
    status: 'draft' | 'published'
    updatedAt: string
    collectionName: string
}

export function createDb(opts?: { root?: string }): DatabaseAdapter {
    const root = opts?.root ?? process.cwd()
    const DB_PATH = process.env.FIELDS_DB_PATH ?? join(root, 'fields.db')
    const raw = new Database(DB_PATH)
    raw.pragma('journal_mode = WAL')
    const db = new SQLiteAdapter(raw)

    createSchema(db)
    db.migrate(MIGRATIONS)
    seedIfEmpty(db)

    return db
}

// ─── Schema ──────────────────────────────────────────────────────────────────

function createSchema(db: DatabaseAdapter): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
            version    INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS _rate_limits (
            ip       TEXT PRIMARY KEY,
            count    INTEGER NOT NULL DEFAULT 0,
            reset_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS _token_revocations (
            jti        TEXT PRIMARY KEY,
            revoked_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS collections (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT    NOT NULL UNIQUE,
            label TEXT    NOT NULL,
            type  TEXT    NOT NULL CHECK(type IN ('page', 'collection', 'object'))
        );

        CREATE TABLE IF NOT EXISTS entries (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_name TEXT    NOT NULL REFERENCES collections(name),
            title           TEXT    NOT NULL,
            slug            TEXT    NOT NULL UNIQUE,
            status          TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
            data            TEXT    NOT NULL DEFAULT '{}',
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS locales (
            code       TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            is_current INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS folders (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS media (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            folder_id  INTEGER REFERENCES folders(id) ON DELETE SET NULL,
            title      TEXT NOT NULL,
            url        TEXT NOT NULL,
            weight     TEXT NOT NULL,
            dimensions TEXT NOT NULL,
            type       TEXT NOT NULL DEFAULT 'image'
        );

        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            email    TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        );
    `)
}

// ─── Migrations ───────────────────────────────────────────────────────────────

const MIGRATIONS: Migration[] = [
    {
        version: 1,
        up(db) {
            try { db.exec(`ALTER TABLE media ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL`) }
            catch { /* already exists on fresh DBs */ }
        },
    },
    {
        version: 2,
        up(db) {
            try { db.exec(`ALTER TABLE entries ADD COLUMN data TEXT NOT NULL DEFAULT '{}'`) }
            catch { /* already exists on fresh DBs */ }
        },
    },
    {
        version: 3,
        up(db) {
            try { db.exec(`ALTER TABLE entries ADD COLUMN locale TEXT NOT NULL DEFAULT 'en'`) }
            catch { /* already exists on fresh DBs */ }
        },
    },
    {
        version: 4,
        up(db) {
            try { db.exec(`ALTER TABLE entries ADD COLUMN translation_key TEXT`) }
            catch { /* already exists on fresh DBs */ }
        },
    },
    {
        version: 5,
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS _rate_limits (
                    ip       TEXT PRIMARY KEY,
                    count    INTEGER NOT NULL DEFAULT 0,
                    reset_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS _token_revocations (
                    jti        TEXT PRIMARY KEY,
                    revoked_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            `)
        },
    },
]

// ─── Seed data ────────────────────────────────────────────────────────────────

function seedIfEmpty(_db: DatabaseAdapter): void {
    // Database starts completely empty.
    // Setup wizard creates the first user.
    // fields.config.ts defines collections.
}
