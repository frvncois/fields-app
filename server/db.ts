import Database from 'better-sqlite3'
import { join } from 'node:path'
import { hashSync } from 'bcryptjs'
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

    db.exec(`
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

    // Migrations for existing DBs
    try { db.exec(`ALTER TABLE media ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL`) }
    catch { /* column already exists */ }
    try { db.exec(`ALTER TABLE entries ADD COLUMN data TEXT NOT NULL DEFAULT '{}'`) }
    catch { /* column already exists */ }

    const { count } = db.prepare('SELECT COUNT(*) as count FROM collections').get() as { count: number }
    if (count === 0) seedCollections(db)

    const { scount } = db.prepare('SELECT COUNT(*) as scount FROM settings').get() as { scount: number }
    if (scount === 0) seedSettings(db)

    const { lcount } = db.prepare('SELECT COUNT(*) as lcount FROM locales').get() as { lcount: number }
    if (lcount === 0) seedLocales(db)

    const { fcount } = db.prepare('SELECT COUNT(*) as fcount FROM folders').get() as { fcount: number }
    if (fcount === 0) seedFolders(db)

    const { mcount } = db.prepare('SELECT COUNT(*) as mcount FROM media').get() as { mcount: number }
    if (mcount === 0) seedMedia(db)

    const { ucount } = db.prepare('SELECT COUNT(*) as ucount FROM users').get() as { ucount: number }
    if (ucount === 0) seedUsers(db)

    return db
}

function seedCollections(db: Database.Database) {
    const insertCollection = db.prepare(
        'INSERT INTO collections (name, label, type) VALUES (?, ?, ?)'
    )
    const insertEntry = db.prepare(
        'INSERT INTO entries (collection_name, title, slug, status, updated_at) VALUES (?, ?, ?, ?, ?)'
    )

    const collections: [string, string, string][] = [
        ['home',        'Home',        'page'],
        ['blog',        'Blog',        'collection'],
        ['modals',      'Modals',      'object'],
        ['attachments', 'Attachments', 'object'],
    ]
    for (const [name, label, type] of collections) {
        insertCollection.run(name, label, type)
    }

    const entries: [string, string, string, string, string][] = [
        ['home',        'Home',              '/home',                    'published', hoursAgo(1)],
        ['blog',        'Hello World',        '/blog/hello-world',        'published', hoursAgo(2)],
        ['blog',        'Getting Started',    '/blog/getting-started',    'published', hoursAgo(24)],
        ['modals',      'Welcome modal',      '/modals/welcome',          'published', hoursAgo(72)],
        ['blog',        'Why Fields?',        '/blog/why-fields',         'published', hoursAgo(96)],
        ['modals',      'Sign up',            '/modals/sign-up',          'published', hoursAgo(120)],
        ['blog',        'My Draft Post',      '/blog/my-draft-post',      'draft',     hoursAgo(72)],
        ['blog',        'The Future of CMS',  '/blog/future-of-cms',      'draft',     hoursAgo(120)],
        ['modals',      'Cookie banner',      '/modals/cookie-banner',    'draft',     hoursAgo(168)],
        ['attachments', 'Attachment example', '/attachments/example',     'draft',     hoursAgo(336)],
    ]
    for (const [col, title, slug, status, updatedAt] of entries) {
        insertEntry.run(col, title, slug, status, updatedAt)
    }
}

function seedSettings(db: Database.Database) {
    const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    insert.run('project_name',  'Acme Corp')
    insert.run('user_first',    'John')
    insert.run('user_last',     'Doe')
    insert.run('user_email',    'john.doe@acmecorp.com')
}

function seedLocales(db: Database.Database) {
    const insert = db.prepare('INSERT INTO locales (code, name, is_current) VALUES (?, ?, ?)')
    insert.run('en', 'English', 1)
    insert.run('fr', 'French',  0)
}

function seedUsers(db: Database.Database) {
    db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run('test@test.com', hashSync('1234', 10))
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
