import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

if (process.env.NODE_ENV === 'production' && !process.env.FIELDS_JWT_SECRET) {
    throw new Error('FIELDS_JWT_SECRET env var must be set in production')
}

export const JWT_SECRET = process.env.FIELDS_JWT_SECRET ?? randomBytes(32).toString('hex')
const JWT_EXPIRES = '7d'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // seconds

// In-memory JTI blocklist for session invalidation
const blocklist = new Set<string>()

export function signToken(userId: number): string {
    const jti = randomBytes(16).toString('hex')
    return jwt.sign({ sub: userId, jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token: string): { sub: number; jti: string } | null {
    try {
        const payload = jwt.verify(token, JWT_SECRET) as unknown as { sub: number; jti: string }
        if (blocklist.has(payload.jti)) return null
        return payload
    } catch {
        return null
    }
}

export function invalidateToken(jti: string): void {
    blocklist.add(jti)
}

export function tokenCookieHeader(token: string): string {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    return `fields_token=${token}; HttpOnly; SameSite=Strict; Path=/${secure}; Max-Age=${COOKIE_MAX_AGE}`
}

export function clearCookieHeader(): string {
    return 'fields_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
}

export function getBearer(req: IncomingMessage): string | null {
    const cookie = req.headers['cookie'] ?? ''
    const match = cookie.match(/(?:^|;\s*)fields_token=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : null
}
