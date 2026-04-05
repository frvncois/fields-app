import type { DatabaseAdapter, Migration } from '../../types'

// pg is an optional peer dependency — only available when the user selects PostgreSQL.
// Dynamic import so the module doesn't fail to load when pg is absent.

type PgClient = {
    query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>
    end(): Promise<void>
}

export class PgAdapter implements DatabaseAdapter {
    private client: PgClient

    constructor(client: PgClient) {
        this.client = client
    }

    static async connect(connectionString: string): Promise<PgAdapter> {
        const { Client } = await import('pg') as unknown as { Client: new (opts: { connectionString: string }) => PgClient }
        const client = new Client({ connectionString })
        await (client as unknown as { connect(): Promise<void> }).connect()
        return new PgAdapter(client)
    }

    get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
        throw new Error('PgAdapter.get() must be called with await — use getAsync() instead')
    }

    query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
        throw new Error('PgAdapter.query() must be called with await — use queryAsync() instead')
    }

    async getAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
        const result = await this.client.query(sql, params)
        return result.rows[0] as T | undefined
    }

    async queryAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
        const result = await this.client.query(sql, params)
        return result.rows as T[]
    }

    run(sql: string, params: unknown[] = []): { lastInsertRowid: number | bigint } {
        throw new Error('PgAdapter.run() must be called with await — use runAsync() instead')
    }

    async runAsync(sql: string, params: unknown[] = []): Promise<{ lastInsertRowid: number | bigint }> {
        const pgSql = sql.replace(/\?/g, (_, i) => `$${++i}`)
        let idx = 0
        const numbered = sql.replace(/\?/g, () => `$${++idx}`)
        const result = await this.client.query(`${numbered} RETURNING id`, params)
        const id = result.rows[0]?.id ?? 0
        return { lastInsertRowid: Number(id) }
    }

    exec(sql: string): void {
        // Sync exec not supported for Postgres; used only during migration setup
        throw new Error('PgAdapter.exec() must be called with await — use execAsync() instead')
    }

    async execAsync(sql: string): Promise<void> {
        await this.client.query(sql)
    }

    migrate(_migrations: Migration[]): void {
        throw new Error('PgAdapter.migrate() must be called with await — use migrateAsync() instead')
    }

    async migrateAsync(migrations: Migration[]): Promise<void> {
        await this.execAsync(`
            CREATE TABLE IF NOT EXISTS _migrations (
                version    INTEGER PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `)
        const rows = await this.queryAsync<{ version: number }>('SELECT version FROM _migrations')
        const applied = new Set(rows.map(r => r.version))
        for (const m of migrations) {
            if (applied.has(m.version)) continue
            m.up(this)
            await this.runAsync('INSERT INTO _migrations (version) VALUES ($1)', [m.version])
            console.log(`  ✦ Migration ${m.version} applied`)
        }
    }

    async close(): Promise<void> {
        await this.client.end()
    }
}
