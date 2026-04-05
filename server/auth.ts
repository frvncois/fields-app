import jwt from 'jsonwebtoken'
import type { IncomingMessage } from 'node:http'

if (process.env.NODE_ENV === 'production' && !process.env.FIELDS_JWT_SECRET) {
    throw new Error('FIELDS_JWT_SECRET env var must be set in production')
}

export const JWT_SECRET = process.env.FIELDS_JWT_SECRET ?? 'fields-dev-secret-change-in-production'
const JWT_EXPIRES = '7d'

export function signToken(userId: number): string {
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token: string): { sub: number } | null {
    try {
        return jwt.verify(token, JWT_SECRET) as unknown as { sub: number }
    } catch {
        return null
    }
}

export function getBearer(req: IncomingMessage): string | null {
    const auth = req.headers['authorization']
    if (!auth?.startsWith('Bearer ')) return null
    return auth.slice(7)
}
