import type { Req, Res, Db } from './types'
import { json, readJson } from './types'
import { compareSync, hashSync } from 'bcryptjs'
import { signToken } from '../auth'

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const RATE_LIMIT_MAX = 5

function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const entry = loginAttempts.get(ip)
    if (!entry || now > entry.resetAt) {
        loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
        return true
    }
    if (entry.count >= RATE_LIMIT_MAX) return false
    entry.count++
    return true
}

function clearRateLimit(ip: string): void {
    loginAttempts.delete(ip)
}

export async function handleLogin(req: Req, res: Res, db: Db): Promise<void> {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown'

    if (!checkRateLimit(ip)) {
        json(res, { error: 'Too many attempts. Try again later.' }, 429)
        return
    }

    const body = await readJson(req)
    const user = db.prepare('SELECT id, password FROM users WHERE email = ?')
        .get(String(body.email)) as { id: number; password: string } | undefined

    if (!user || !compareSync(String(body.password), user.password)) {
        json(res, { error: 'Invalid credentials' }, 401)
        return
    }

    clearRateLimit(ip)
    json(res, { token: signToken(user.id) })
}

export async function handleChangePassword(req: Req, res: Res, db: Db): Promise<void> {
    const body = await readJson(req)
    if (!body.password || typeof body.password !== 'string') {
        json(res, { error: 'Missing password' }, 400)
        return
    }
    db.prepare('UPDATE users SET password = ?').run(hashSync(String(body.password), 10))
    json(res, { ok: true })
}
