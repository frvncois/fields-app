import type { Req, Res, Db } from './types'
import { json, readJson } from './types'
import { hashSync } from 'bcryptjs'
import { signToken, tokenCookieHeader } from '../auth'

export function handleSetupCheck(_req: Req, res: Res, db: Db): void {
    const row = db.get<{ count: number }>('SELECT COUNT(*) as count FROM users')
    json(res, { needsSetup: !row || row.count === 0 })
}

export async function handleSetupCreate(req: Req, res: Res, db: Db): Promise<void> {
    const row = db.get<{ count: number }>('SELECT COUNT(*) as count FROM users')
    if (row && row.count > 0) {
        json(res, { error: 'Setup already complete' }, 403)
        return
    }

    const body = await readJson(req)

    const projectName = typeof body.projectName === 'string' ? body.projectName.trim() : ''
    if (!projectName || projectName.length > 100) {
        json(res, { error: 'Project name is required and must be under 100 characters' }, 400)
        return
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    if (!firstName || firstName.length > 100) {
        json(res, { error: 'First name is required and must be under 100 characters' }, 400)
        return
    }

    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    if (!lastName || lastName.length > 100) {
        json(res, { error: 'Last name is required and must be under 100 characters' }, 400)
        return
    }

    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!email || !email.includes('@')) {
        json(res, { error: 'Valid email required' }, 400)
        return
    }

    const password = typeof body.password === 'string' ? body.password : ''
    if (password.length < 8 || password.length > 128) {
        json(res, { error: 'Password must be between 8 and 128 characters' }, 400)
        return
    }

    const { lastInsertRowid } = db.run(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, hashSync(password, 12), 'admin']
    )

    db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['user_first', firstName]
    )
    db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['user_last', lastName]
    )
    db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['user_email', email]
    )
    db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['project_name', projectName]
    )

    const token = signToken(Number(lastInsertRowid))
    res.setHeader('Set-Cookie', tokenCookieHeader(token))
    json(res, { ok: true }, 201)
}
