import type { DatabaseAdapter, Migration } from '../../types'

// @libsql/client is an optional peer dependency — Turso / Cloudflare D1.

type LibSqlClient = {
    execute(sql: string | { sql: string; args: unknown[] }): Promise<{
        rows: Record<string, unknown>[]
        lastInsertRowid?: bigint
    }>
    close(): void
}

export class TursoAdapter implements DatabaseAdapter {
    private client: LibSqlClient

    constructor(client: LibSqlClient) {
        this.client = client
    }

    static async connect(url: string, authToken?: string): Promise<TursoAdapter> {
        const { createClient } = await import('@libsql/client') as {
            createClient(opts: { url: string; authToken?: string }): LibSqlClient
        }
        const client = createClient({ url, authToken })
        return new TursoAdapter(client)
    }

    get<T = Record<string, unknown>>(_sql: string, _params: unknown[] = []): T | undefined {
        throw new Error('TursoAdapter is async — use getAsync()')
    }

    query<T = Record<string, unknown>>(_sql: string, _params: unknown[] = []): T[] {
        throw new Error('TursoAdapter is async — use queryAsync()')
    }

    run(_sql: string, _params: unknown[] = []): { lastInsertRowid: number | bigint } {
        throw new Error('TursoAdapter is async — use runAsync()')
    }

    exec(_sql: string): void {
        throw new Error('TursoAdapter is async — use execAsync()')
    }

    async getAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
        const result = await this.client.execute({ sql, args: params })
        return result.rows[0] as T | undefined
    }

    async queryAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
        const result = await this.client.execute({ sql, args: params })
        return result.rows as T[]
    }

    async runAsync(sql: string, params: unknown[] = []): Promise<{ lastInsertRowid: number | bigint }> {
        const result = await this.client.execute({ sql, args: params })
        return { lastInsertRowid: result.lastInsertRowid ?? BigInt(0) }
    }

    async execAsync(sql: string): Promise<void> {
        await this.client.execute(sql)
    }

    migrate(_migrations: Migration[]): void {
        throw new Error('TursoAdapter is async — use migrateAsync()')
    }

    async migrateAsync(migrations: Migration[]): Promise<void> {
        await this.execAsync(`
            CREATE TABLE IF NOT EXISTS _migrations (
                version    INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `)
        const rows = await this.queryAsync<{ version: number }>('SELECT version FROM _migrations')
        const applied = new Set(rows.map(r => r.version))
        for (const m of migrations) {
            if (applied.has(m.version)) continue
            await m.up(this)  // [H3] must await — migration DDL is async for Turso
            await this.runAsync('INSERT INTO _migrations (version) VALUES (?)', [m.version])
            console.log(`  ✦ Migration ${m.version} applied`)
        }
    }

    close(): void {
        this.client.close()
    }
}
