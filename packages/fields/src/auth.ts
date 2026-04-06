import jwt from 'jsonwebtoken'
import { randomBytes, randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

export const JWT_SECRET = process.env.FIELDS_JWT_SECRET ?? randomBytes(32).toString('hex')
const JWT_EXPIRES = '1d'
const COOKIE_MAX_AGE = 24 * 60 * 60 // 1 day in seconds

export function signToken(userId: number): string {
    return jwt.sign({ sub: userId, jti: randomUUID() }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token: string): { sub: number; jti: string } | null {
    try {
        return jwt.verify(token, JWT_SECRET) as unknown as { sub: number; jti: string }
    } catch {
        return null
    }
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
