#!/usr/bin/env node
/**
 * fields CLI — post-install commands for the Fields CMS runtime.
 *
 * Usage (via npm scripts written by create-fields-cms):
 *   npm run fields:migrate
 *   npm run fields:validate
 */
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { existsSync } from 'node:fs'

const require = createRequire(import.meta.url)

const command = process.argv[2]
const cwd = process.cwd()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fail(msg) {
    console.error(`\n  ✖  ${msg}\n`)
    process.exit(1)
}

function ok(msg) {
    console.log(`\n  ✔  ${msg}\n`)
}

async function loadConfig() {
    const configPath = resolve(cwd, 'fields.config.ts')
    if (!existsSync(configPath)) {
        fail('fields.config.ts not found.')
    }
    const { loadConfigFromFile } = await import('vite')
    const result = await loadConfigFromFile(
        { command: 'serve', mode: 'development' },
        configPath,
        cwd
    )
    if (!result) fail('Could not load fields.config.ts')
    const config = result.config
    if (!Array.isArray(config.collections)) {
        fail('Invalid fields.config.ts — missing collections array')
    }
    return config
}

async function loadDb() {
    const { createDb } = await import('../dist/db.js').catch(() =>
        import(resolve(join(cwd, 'node_modules', 'fields', 'dist', 'db.js')))
    )
    return createDb()
}

// ─── fields migrate ──────────────────────────────────────────────────────────

async function migrate() {
    const { validateConfig } = await import('../dist/utils/validateConfig.js').catch(() => ({ validateConfig: () => {} }))
    const config = await loadConfig()
    const db = await loadDb()

    try { validateConfig(config) } catch (err) {
        fail(`Config validation failed: ${err.message}`)
    }

    const existing = db.query('SELECT name, label, type FROM collections')
    const existingNames = new Set(existing.map(r => r.name))
    const existingMap = new Map(existing.map(r => [r.name, r]))
    const configNames = new Set(config.collections.map(c => c.name))

    const toAdd = config.collections.filter(c => !existingNames.has(c.name))
    const toRemove = [...existingNames].filter(n => !configNames.has(n))
    // [A1-MEDIUM] Detect label/type renames for existing collections so they are not silently ignored
    const toUpdate = config.collections.filter(c => {
        const ex = existingMap.get(c.name)
        if (!ex) return false
        const newLabel = c.label ?? c.name.charAt(0).toUpperCase() + c.name.slice(1)
        const newType = c.type ?? 'collection'
        return ex.label !== newLabel || ex.type !== newType
    })

    if (toAdd.length === 0 && toRemove.length === 0 && toUpdate.length === 0) {
        ok('Database is already in sync with fields.config.ts')
        return
    }

    console.log('\n  Fields migrate\n')
    if (toAdd.length > 0) {
        console.log('  Collections to add:')
        for (const c of toAdd) console.log(`    + ${c.name}`)
    }
    if (toUpdate.length > 0) {
        console.log('  Collections to update (label/type changed):')
        for (const c of toUpdate) console.log(`    ~ ${c.name}`)
    }
    if (toRemove.length > 0) {
        console.log('  Collections to remove (destructive):')
        for (const n of toRemove) console.log(`    - ${n}`)
    }
    console.log()

    if (toRemove.length > 0) {
        const { confirm, isCancel } = await import('@clack/prompts')
        const confirmed = await confirm({
            message: `Remove ${toRemove.length} collection(s) and ALL their entries? This cannot be undone.`,
        })
        if (isCancel(confirmed) || !confirmed) {
            fail('Migration cancelled.')
        }
    }

    // Apply metadata updates for existing collections
    for (const col of toUpdate) {
        const newLabel = col.label ?? col.name.charAt(0).toUpperCase() + col.name.slice(1)
        const newType = col.type ?? 'collection'
        db.run('UPDATE collections SET label = ?, type = ? WHERE name = ?', [newLabel, newType, col.name])
        ok(`Updated collection: ${col.name}`)
    }

    // Apply additive changes
    for (const col of toAdd) {
        db.run(
            `INSERT INTO collections (name, label, type) VALUES (?, ?, ?)
             ON CONFLICT(name) DO UPDATE SET label = excluded.label, type = excluded.type`,
            [col.name, col.label ?? col.name.charAt(0).toUpperCase() + col.name.slice(1), col.type ?? 'collection'])
        if (col.type === 'page') {
            const existing = db.get('SELECT id FROM entries WHERE collection_name = ?', [col.name])
            if (!existing) {
                db.run(
                    'INSERT INTO entries (collection_name, title, slug, status) VALUES (?, ?, ?, ?)',
                    [col.name, col.label ?? col.name, '/' + col.name, 'draft']
                )
            }
        }
        ok(`Added collection: ${col.name}`)
    }

    // Apply destructive changes after confirmation
    for (const name of toRemove) {
        db.run('DELETE FROM entries WHERE collection_name = ?', [name])
        db.run('DELETE FROM collections WHERE name = ?', [name])
        ok(`Removed collection: ${name}`)
    }

    ok('Migration complete.')
}

// ─── fields validate ─────────────────────────────────────────────────────────

async function validate() {
    const config = await loadConfig()
    const { validateConfig } = await import('../dist/utils/validateConfig.js').catch(() => ({ validateConfig: () => {} }))
    try {
        validateConfig(config)
        ok('fields.config.ts is valid.')
        process.exit(0)
    } catch (err) {
        fail(err.message)
    }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

const commands = { migrate, validate }

if (!command || !(command in commands)) {
    console.error(`\n  Usage: fields <command>\n\n  Commands: ${Object.keys(commands).join(', ')}\n`)
    process.exit(1)
}

commands[command]().catch(err => {
    console.error(`\n  ✖  Unexpected error: ${err.message}\n`)
    process.exit(1)
})
