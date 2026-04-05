import Database from 'better-sqlite3'
import { join } from 'node:path'
import { hoursAgo } from './utils/time'

const DB_PATH = process.env.FIELDS_DB_PATH ?? join(process.cwd(), 'fields.db')

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

export function createDb() {
    const db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')

    createSchema(db)
    runMigrations(db)
    seedIfEmpty(db)

    return db
}

// ─── Schema ──────────────────────────────────────────────────────────────────

function createSchema(db: Database.Database): void {
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

type Migration = { version: number; up: (db: Database.Database) => void }

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
            // Create internal tables for rate limiting and token revocation
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

function runMigrations(db: Database.Database): void {
    const applied = new Set(
        (db.prepare('SELECT version FROM _migrations').all() as { version: number }[])
            .map(r => r.version)
    )

    const insert = db.prepare('INSERT INTO _migrations (version) VALUES (?)')

    for (const migration of MIGRATIONS) {
        if (applied.has(migration.version)) continue
        migration.up(db)
        insert.run(migration.version)
        console.log(`  ✦ Migration ${migration.version} applied`)
    }
}

// ─── Seed data (runs only on empty database) ─────────────────────────────────

function seedIfEmpty(db: Database.Database): void {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM collections').get() as { count: number }
    if (count > 0) return

    seedCollections(db)
    seedSettings(db)
    seedLocales(db)
    seedFolders(db)
    seedMedia(db)
    // No user seed — the setup wizard (/setup) creates the first admin account.
}

function seedCollections(db: Database.Database) {
    const insertCollection = db.prepare(
        'INSERT INTO collections (name, label, type) VALUES (?, ?, ?)'
    )
    const insertEntry = db.prepare(
        'INSERT INTO entries (collection_name, title, slug, status, locale, translation_key, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )

    const collections: [string, string, string][] = [
        ['home',     'Home',     'page'],
        ['services', 'Services', 'page'],
        ['about',    'About',    'page'],
        ['contact',  'Contact',  'page'],
        ['blog',     'Blog',     'collection'],
        ['shared',   'Shared',   'object'],
    ]
    for (const [name, label, type] of collections) {
        insertCollection.run(name, label, type)
    }

    const entries: [string, string, string, string, string, string, string][] = [
        ['home',     'Home',                                        '/home',                                       'published', 'en', 'tk-home',        hoursAgo(1)],
        ['services', 'Services',                                    '/services',                                   'published', 'en', 'tk-services',     hoursAgo(2)],
        ['about',    'About Us',                                    '/about',                                      'published', 'en', 'tk-about',        hoursAgo(3)],
        ['contact',  'Contact',                                     '/contact',                                    'published', 'en', 'tk-contact',       hoursAgo(4)],
        ['blog',     '5 Signs Your Pipes Need Immediate Attention', '/blog/5-signs-pipes-need-attention',          'published', 'en', 'tk-blog-1',       hoursAgo(2)],
        ['blog',     'How to Unclog a Drain: DIY vs Professional',  '/blog/how-to-unclog-a-drain',                 'published', 'en', 'tk-blog-2',       hoursAgo(24)],
        ['blog',     'Winter Pipe Protection: A Plumber\'s Guide',  '/blog/winter-pipe-protection',                'published', 'en', 'tk-blog-3',       hoursAgo(48)],
        ['blog',     'Emergency Plumbing: What to Do First',        '/blog/emergency-plumbing-what-to-do',         'published', 'en', 'tk-blog-4',       hoursAgo(72)],
        ['blog',     'Why Regular Plumbing Maintenance Saves Money','/blog/regular-plumbing-maintenance',          'draft',     'en', 'tk-blog-5',       hoursAgo(96)],
        ['blog',     'The True Cost of a Leaky Faucet',            '/blog/true-cost-of-leaky-faucet',             'draft',     'en', 'tk-blog-6',       hoursAgo(120)],
        ['shared',   'Header',                                      '/shared/header',                              'published', 'en', 'tk-header',       hoursAgo(1)],
        ['shared',   'Footer',                                      '/shared/footer',                              'published', 'en', 'tk-footer',       hoursAgo(1)],
        ['shared',   'Mailing List',                                '/shared/mailing-list',                        'published', 'en', 'tk-mailing-list', hoursAgo(1)],
    ]
    for (const [col, title, slug, status, locale, tk, updatedAt] of entries) {
        insertEntry.run(col, title, slug, status, locale, tk, updatedAt)
    }
}

function seedSettings(db: Database.Database) {
    const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    insert.run('project_name',  'My Project')
    insert.run('user_first',    '')
    insert.run('user_last',     '')
    insert.run('user_email',    '')
}

function seedLocales(db: Database.Database) {
    const insert = db.prepare('INSERT INTO locales (code, name, is_current) VALUES (?, ?, ?)')
    insert.run('en', 'English', 1)
    insert.run('fr', 'French',  0)
}

function seedFolders(db: Database.Database) {
    db.prepare('INSERT INTO folders (name) VALUES (?)').run('Product')
    db.prepare('INSERT INTO folders (name) VALUES (?)').run('Branding')
}

function seedMedia(db: Database.Database) {
    const productId  = (db.prepare('SELECT id FROM folders WHERE name = ?').get('Product')  as { id: number }).id
    const brandingId = (db.prepare('SELECT id FROM folders WHERE name = ?').get('Branding') as { id: number }).id

    const insert = db.prepare(
        'INSERT INTO media (folder_id, title, url, weight, dimensions, type) VALUES (?, ?, ?, ?, ?, ?)'
    )
    insert.run(null,       'hero-banner.jpg',    'https://picsum.photos/seed/a/400/300', '1.2 MB',  '1920×1080', 'image')
    insert.run(null,       'team-photo.jpg',      'https://picsum.photos/seed/b/400/300', '840 KB',  '1200×800',  'image')
    insert.run(productId,  'product-shot.png',   'https://picsum.photos/seed/c/400/300', '2.4 MB',  '2400×1600', 'image')
    insert.run(productId,  'product-detail.jpg', 'https://picsum.photos/seed/g/400/300', '980 KB',  '1600×1200', 'image')
    insert.run(brandingId, 'logo-dark.png',      'https://picsum.photos/seed/d/400/300', '48 KB',   '512×512',   'image')
    insert.run(brandingId, 'avatar-default.png', 'https://picsum.photos/seed/f/400/300', '12 KB',   '256×256',   'image')
    insert.run(null,       'bg-texture.jpg',     'https://picsum.photos/seed/e/400/300', '320 KB',  '1440×900',  'image')
}
