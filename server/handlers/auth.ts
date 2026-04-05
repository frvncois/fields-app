import type { Req, Res, Db } from './types'
import { json, readJson } from './types'
import { compareSync, hashSync } from 'bcryptjs'
import { signToken, verifyToken, invalidateToken, tokenCookieHeader, clearCookieHeader, getBearer } from '../auth'

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const RATE_LIMIT_MAX = 5

function getIp(req: Req): string {
    if (process.env.FIELDS_TRUST_PROXY === 'true') {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined
        if (forwarded) {
            // Use the rightmost IP added by the trusted proxy
            const parts = forwarded.split(',').map(s => s.trim())
            return parts[parts.length - 1]
        }
    }
    return req.socket.remoteAddress ?? 'unknown'
}

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
    const ip = getIp(req)

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
    const token = signToken(user.id)
    res.setHeader('Set-Cookie', tokenCookieHeader(token))
    json(res, { ok: true })
}

export async function handleLogout(req: Req, res: Res): Promise<void> {
    const token = getBearer(req)
    if (token) {
        const payload = verifyToken(token)
        if (payload) invalidateToken(payload.jti)
    }
    res.setHeader('Set-Cookie', clearCookieHeader())
    json(res, { ok: true })
}

export async function handleChangePassword(req: Req, res: Res, db: Db, userId: number): Promise<void> {
    const body = await readJson(req)
    if (!body.password || typeof body.password !== 'string') {
        json(res, { error: 'Missing password' }, 400)
        return
    }
    if (body.password.length < 8 || body.password.length > 128) {
        json(res, { error: 'Password must be between 8 and 128 characters' }, 400)
        return
    }
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashSync(body.password, 10), userId)
    json(res, { ok: true })
}
