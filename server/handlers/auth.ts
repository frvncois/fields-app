import type { Req, Res, Db } from './types'
import { json, readJson } from './types'
import { compareSync, hashSync } from 'bcryptjs'
import { signToken, verifyToken, tokenCookieHeader, clearCookieHeader, getBearer } from '../auth'

// ─── Rate limiting (login endpoint) — persisted to SQLite ────────────────────

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 min
const RATE_LIMIT_MAX = 5

function getIp(req: Req): string {
    if (process.env.FIELDS_TRUST_PROXY === 'true') {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined
        if (forwarded) {
            const parts = forwarded.split(',').map(s => s.trim())
            return parts[parts.length - 1]
        }
    }
    return req.socket.remoteAddress ?? 'unknown'
}

function checkLoginRateLimit(ip: string, db: Db): boolean {
    const now = Date.now()
    const row = db.prepare('SELECT count, reset_at FROM _rate_limits WHERE ip = ?').get(ip) as
        { count: number; reset_at: string } | undefined

    if (!row || now > Number(row.reset_at)) {
        db.prepare(
            'INSERT INTO _rate_limits (ip, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET count = 1, reset_at = excluded.reset_at'
        ).run(ip, String(now + RATE_LIMIT_WINDOW_MS))
        return true
    }
    if (row.count >= RATE_LIMIT_MAX) return false
    db.prepare('UPDATE _rate_limits SET count = count + 1 WHERE ip = ?').run(ip)
    return true
}

function clearLoginRateLimit(ip: string, db: Db): void {
    db.prepare('DELETE FROM _rate_limits WHERE ip = ?').run(ip)
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function handleLogin(req: Req, res: Res, db: Db): Promise<void> {
    const ip = getIp(req)

    if (!checkLoginRateLimit(ip, db)) {
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

    clearLoginRateLimit(ip, db)
    const token = signToken(user.id)
    res.setHeader('Set-Cookie', tokenCookieHeader(token))
    json(res, { ok: true })
}

export async function handleLogout(req: Req, res: Res, db: Db): Promise<void> {
    const token = getBearer(req)
    if (token) {
        const payload = verifyToken(token)
        if (payload) {
            db.prepare(
                "INSERT OR IGNORE INTO _token_revocations (jti, revoked_at) VALUES (?, datetime('now'))"
            ).run(payload.jti)
        }
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
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashSync(body.password, 12), userId)
    json(res, { ok: true })
}
