import type { Req, Res, Db } from './types'
import { json, readJson } from './types'
import { compareSync, hashSync } from 'bcryptjs'
import { signToken, verifyToken, tokenCookieHeader, clearCookieHeader, getTokenFromCookie } from '../auth'
import { getClientIp } from '../utils/ip'

// [H1] Dummy hash used when the email is not found so that bcrypt always runs,
// preventing a timing oracle that would otherwise reveal registered accounts.
const DUMMY_HASH = '$2a$12$invalidhashfortimingequalizationxxxxxxxxxxxxxxxxxxxxxxxx'

// ─── Rate limiting (login endpoint) — persisted to SQLite ────────────────────

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 min
const RATE_LIMIT_MAX = 5

function checkLoginRateLimit(ip: string, db: Db): boolean {
    const now = Date.now()
    const row = db.get<{ count: number; reset_at: string }>(
        'SELECT count, reset_at FROM _rate_limits WHERE ip = ?', [ip]
    )

    if (!row || now > Number(row.reset_at)) {
        db.run(
            'INSERT INTO _rate_limits (ip, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET count = 1, reset_at = excluded.reset_at',
            [ip, String(now + RATE_LIMIT_WINDOW_MS)]
        )
        return true
    }
    if (row.count >= RATE_LIMIT_MAX) return false
    db.run('UPDATE _rate_limits SET count = count + 1 WHERE ip = ?', [ip])
    return true
}

function clearLoginRateLimit(ip: string, db: Db): void {
    db.run('DELETE FROM _rate_limits WHERE ip = ?', [ip])
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function handleLogin(req: Req, res: Res, db: Db): Promise<void> {
    const ip = getClientIp(req)

    if (!checkLoginRateLimit(ip, db)) {
        const limitRow = db.get<{ reset_at: string }>(
            'SELECT reset_at FROM _rate_limits WHERE ip = ?', [ip]
        )
        const retryAfter = limitRow
            ? Math.ceil((Number(limitRow.reset_at) - Date.now()) / 1000)
            : 900
        res.setHeader('Retry-After', String(retryAfter))
        json(res, { error: 'Too many attempts. Try again later.' }, 429)
        return
    }

    const body = await readJson(req)
    const user = db.get<{ id: number; password: string }>(
        'SELECT id, password FROM users WHERE email = ?', [String(body.email)]
    )

    // [H1] Always run bcrypt regardless of whether the user exists.
    // Without this, the short-circuit on !user returns in microseconds while
    // a wrong-password attempt takes ~200ms, revealing which emails are registered.
    const passwordMatch = compareSync(String(body.password), user?.password ?? DUMMY_HASH)
    if (!user || !passwordMatch) {
        json(res, { error: 'Invalid credentials' }, 401)
        return
    }

    clearLoginRateLimit(ip, db)
    const token = signToken(user.id)
    res.setHeader('Set-Cookie', tokenCookieHeader(token))
    json(res, { ok: true })
}

export async function handleLogout(req: Req, res: Res, db: Db): Promise<void> {
    const token = getTokenFromCookie(req)
    if (token) {
        const payload = verifyToken(token)
        if (payload) {
            db.run(
                "INSERT OR IGNORE INTO _token_revocations (jti, revoked_at) VALUES (?, datetime('now'))",
                [payload.jti]
            )
        }
    }
    res.setHeader('Set-Cookie', clearCookieHeader())
    json(res, { ok: true })
}

export async function handleChangePassword(req: Req, res: Res, db: Db, userId: number): Promise<void> {
    // [H2] Read the token before consuming the body so we can revoke it after the update.
    const token = getTokenFromCookie(req)
    const body = await readJson(req)

    if (!body.currentPassword || typeof body.currentPassword !== 'string') {
        json(res, { error: 'Current password required' }, 400)
        return
    }
    if (!body.password || typeof body.password !== 'string') {
        json(res, { error: 'Missing password' }, 400)
        return
    }
    if (body.password.length < 8 || body.password.length > 128) {
        json(res, { error: 'Password must be between 8 and 128 characters' }, 400)
        return
    }

    // Verify current password before allowing the change
    const user = db.get<{ password: string }>('SELECT password FROM users WHERE id = ?', [userId])
    if (!user || !compareSync(String(body.currentPassword), user.password)) {
        json(res, { error: 'Current password is incorrect' }, 401)
        return
    }

    db.run('UPDATE users SET password = ? WHERE id = ?', [hashSync(body.password, 12), userId])

    // [H2] Revoke the current session token so an attacker who obtained it before
    // the password change cannot continue using it for the remaining 24-hour TTL.
    if (token) {
        const payload = verifyToken(token)
        if (payload?.jti) {
            db.run(
                "INSERT OR IGNORE INTO _token_revocations (jti, revoked_at) VALUES (?, datetime('now'))",
                [payload.jti]
            )
        }
    }
    res.setHeader('Set-Cookie', clearCookieHeader())
    json(res, { ok: true })
}
