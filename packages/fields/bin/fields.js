#!/usr/bin/env node
/**
 * fields CLI — post-install commands for the Fields CMS runtime.
 *
 * Usage (via npm scripts written by create-fields-cms):
 *   npm run fields:migrate
 *   npm run fields:validate
 *   npm run fields:add-user
 *   npm run fields:remove-user
 */
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

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
        fail('fields.config.ts not found in project root. Run: npm create fields-cms@latest')
    }
    try {
        const mod = await import(pathToFileURL(configPath).href)
        return mod.default
    } catch (err) {
        fail(`Failed to load fields.config.ts: ${err.message}`)
    }
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

    const existing = db.query('SELECT name FROM collections')
    const existingNames = new Set(existing.map(r => r.name))
    const configNames = new Set(config.collections.map(c => c.name))

    const toAdd = config.collections.filter(c => !existingNames.has(c.name))
    const toRemove = [...existingNames].filter(n => !configNames.has(n))

    if (toAdd.length === 0 && toRemove.length === 0) {
        ok('Database is already in sync with fields.config.ts')
        return
    }

    console.log('\n  Fields migrate\n')
    if (toAdd.length > 0) {
        console.log('  Collections to add:')
        for (const c of toAdd) console.log(`    + ${c.name}`)
    }
    if (toRemove.length > 0) {
        console.log('  Collections to remove (destructive):')
        for (const n of toRemove) console.log(`    - ${n}`)
    }
    console.log()

    if (toRemove.length > 0) {
        const { confirm } = await import('@clack/prompts')
        const confirmed = await confirm({
            message: `Remove ${toRemove.length} collection(s) and ALL their entries? This cannot be undone.`,
        })
        if (!confirmed) {
            fail('Migration cancelled.')
        }
    }

    // Apply additive changes immediately
    for (const col of toAdd) {
        db.run('INSERT OR IGNORE INTO collections (name, label, type) VALUES (?, ?, ?)',
            [col.name, col.name.charAt(0).toUpperCase() + col.name.slice(1), 'collection'])
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

// ─── fields add-user ─────────────────────────────────────────────────────────

async function addUser() {
    const args = process.argv.slice(3)
    const emailIdx = args.indexOf('--email')
    const pwIdx = args.indexOf('--password')
    const emailArg = emailIdx !== -1 ? args[emailIdx + 1] : null
    const pwArg = pwIdx !== -1 ? args[pwIdx + 1] : null

    if (emailArg && pwArg) {
        const db = await loadDb()
        const { hashSync } = await import('bcryptjs')
        try {
            db.run('INSERT INTO users (email, password) VALUES (?, ?)', [emailArg, hashSync(pwArg, 12)])
            ok(`User ${emailArg} created.`)
        } catch (err) {
            if (err.message?.includes('UNIQUE')) fail(`A user with email ${emailArg} already exists.`)
            fail(err.message)
        }
        return
    }

    const { text, password, isCancel, intro, outro } = await import('@clack/prompts')
    intro('  Fields — add user')

    const email = await text({ message: 'Email address', validate: v => v.includes('@') ? undefined : 'Enter a valid email' })
    if (isCancel(email)) fail('Cancelled.')

    const pw = await password({ message: 'Password (min 8 chars)', validate: v => v.length >= 8 ? undefined : 'Password must be at least 8 characters' })
    if (isCancel(pw)) fail('Cancelled.')

    const pw2 = await password({ message: 'Confirm password', validate: v => v === pw ? undefined : 'Passwords do not match' })
    if (isCancel(pw2)) fail('Cancelled.')

    const db = await loadDb()
    const { hashSync } = await import('bcryptjs')
    try {
        db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashSync(pw, 12)])
        outro(`  User ${email} created.`)
    } catch (err) {
        if (err.message?.includes('UNIQUE')) fail(`A user with email ${email} already exists.`)
        fail(err.message)
    }
}

// ─── fields remove-user ──────────────────────────────────────────────────────

async function removeUser() {
    const { select, confirm, isCancel, intro, outro } = await import('@clack/prompts')
    intro('  Fields — remove user')

    const db = await loadDb()
    const users = db.query('SELECT id, email FROM users ORDER BY email')

    if (users.length === 0) fail('No users found.')
    if (users.length === 1) fail('Cannot remove the last user — you would lose admin access.')

    const userId = await select({
        message: 'Select user to remove',
        options: users.map(u => ({ value: u.id, label: u.email })),
    })
    if (isCancel(userId)) fail('Cancelled.')

    const selectedUser = users.find(u => u.id === userId)
    const sure = await confirm({ message: `Remove ${selectedUser.email}? This cannot be undone.` })
    if (isCancel(sure) || !sure) fail('Cancelled.')

    db.run('DELETE FROM users WHERE id = ?', [userId])
    outro(`  User ${selectedUser.email} removed.`)
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

const commands = { migrate, validate, 'add-user': addUser, 'remove-user': removeUser }

if (!command || !(command in commands)) {
    console.error(`\n  Usage: fields <command>\n\n  Commands: ${Object.keys(commands).join(', ')}\n`)
    process.exit(1)
}

commands[command]().catch(err => {
    console.error(`\n  ✖  Unexpected error: ${err.message}\n`)
    process.exit(1)
})
