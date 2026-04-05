import Database from 'better-sqlite3'
import type { DatabaseAdapter, Migration } from '../../types'

export class SQLiteAdapter implements DatabaseAdapter {
    private raw: Database.Database

    constructor(raw: Database.Database) {
        this.raw = raw
    }

    get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
        return this.raw.prepare(sql).get(...params) as T | undefined
    }

    query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
        return this.raw.prepare(sql).all(...params) as T[]
    }

    run(sql: string, params: unknown[] = []): { lastInsertRowid: number | bigint } {
        const result = this.raw.prepare(sql).run(...params)
        return { lastInsertRowid: result.lastInsertRowid }
    }

    exec(sql: string): void {
        this.raw.exec(sql)
    }

    migrate(migrations: Migration[]): void {
        const applied = new Set(
            this.query<{ version: number }>('SELECT version FROM _migrations').map(r => r.version)
        )
        for (const m of migrations) {
            if (applied.has(m.version)) continue
            m.up(this)
            this.run('INSERT INTO _migrations (version) VALUES (?)', [m.version])
            console.log(`  ✦ Migration ${m.version} applied`)
        }
    }
}
