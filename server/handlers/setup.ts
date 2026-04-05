import type { Req, Res, Db } from './types'
import { json, readJson } from './types'
import { hashSync } from 'bcryptjs'
import { signToken, tokenCookieHeader } from '../auth'

export function handleSetupCheck(_req: Req, res: Res, db: Db): void {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
    json(res, { needsSetup: count === 0 })
}

export async function handleSetupCreate(req: Req, res: Res, db: Db): Promise<void> {
    // Only callable when zero users exist
    const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
    if (count > 0) {
        json(res, { error: 'Setup already complete' }, 403)
        return
    }

    const body = await readJson(req)

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

    const { lastInsertRowid } = db.prepare(
        'INSERT INTO users (email, password) VALUES (?, ?)'
    ).run(email, hashSync(password, 12))

    const token = signToken(Number(lastInsertRowid))
    res.setHeader('Set-Cookie', tokenCookieHeader(token))
    json(res, { ok: true }, 201)
}
