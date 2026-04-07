// ─── Schema types (kept in sync with fields-admin/src/types/schema.ts) ────────

export type FieldType = 'input' | 'richtext' | 'textarea' | 'media' | 'boolean' | 'repeater'

export type FieldDef = {
    key: string
    label: string
    type: FieldType
    required?: boolean
    fields?: FieldDef[]
}

export type FieldValues = Record<string, unknown>

export type CollectionSchema = {
    name: string
    label?: string
    type?: 'page' | 'collection' | 'object'
    fields: FieldDef[]
}

export type FieldsConfig = {
    collections: CollectionSchema[]
}

// ─── Database adapter ─────────────────────────────────────────────────────────

export type Migration = {
    version: number
    up: (db: DatabaseAdapter) => void | Promise<void>
}

/**
 * Synchronous database adapter interface used by SQLiteAdapter (the default).
 *
 * NOTE: PgAdapter and TursoAdapter are inherently async and will throw if these
 * sync methods are called directly. Use their `*Async()` variants instead.
 * These adapters cannot currently be used as drop-in replacements for the
 * default SQLiteAdapter without code changes in the handlers.
 */
export interface DatabaseAdapter {
    /** Return a single row or undefined. */
    get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined
    /** Return all matching rows. */
    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[]
    /** Execute a write statement; returns the last inserted row id. */
    run(sql: string, params?: unknown[]): { lastInsertRowid: number | bigint }
    /** Execute raw DDL / multi-statement SQL. */
    exec(sql: string): void
    /** Apply pending schema migrations. */
    migrate(migrations: Migration[]): void
}

// ─── Storage adapter ──────────────────────────────────────────────────────────

export interface StorageAdapter {
    /** Upload a file; returns the public URL path (e.g. "/uploads/foo.jpg"). */
    upload(buffer: Buffer, filename: string, mimeType: string): Promise<string>
    /** Delete a file by its path returned from upload(). */
    delete(path: string): Promise<void>
    /** Resolve a stored path to a public URL string. */
    getUrl(path: string): string
}

// ─── Role & permission types ──────────────────────────────────────────────────

export type UserRole = 'admin' | 'editor'

export type UserPermissions = {
    can_create: boolean
    can_edit: boolean
    can_delete: boolean
    can_publish: boolean
    can_media: boolean
    can_settings: boolean
    pages_all: boolean
    collections_all: boolean
    objects_all: boolean
    /** Set<number> server-side for O(1) lookup. Serialized as number[] in API responses. */
    collectionGrants: Set<number>
    /** Set<number> server-side for O(1) lookup. Serialized as number[] in API responses. */
    objectGrants: Set<number>
}

export type UserContext = {
    id: number
    role: UserRole
    /** Only present for editors — undefined means full admin access */
    permissions?: UserPermissions
}

// ─── Plugin options ───────────────────────────────────────────────────────────

export interface FieldsOptions {
    /** Path to the user's fields.config.ts relative to project root. Defaults to "fields.config.ts". */
    config?: string
    /** Database adapter. Defaults to SQLiteAdapter. */
    db?: DatabaseAdapter
    /** Storage adapter. Defaults to LocalAdapter. */
    storage?: StorageAdapter
}
