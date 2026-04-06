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

// ─── Plugin options ───────────────────────────────────────────────────────────

export interface FieldsOptions {
    /** Path to the user's fields.config.ts relative to project root. Defaults to "fields.config.ts". */
    config?: string
    /** Database adapter. Defaults to SQLiteAdapter. */
    db?: DatabaseAdapter
    /** Storage adapter. Defaults to LocalAdapter. */
    storage?: StorageAdapter
}
