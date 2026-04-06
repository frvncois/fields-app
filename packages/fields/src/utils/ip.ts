import type { IncomingMessage } from 'node:http'

export function getClientIp(req: IncomingMessage): string {
    if (process.env.FIELDS_TRUST_PROXY === 'true') {
        const forwarded = req.headers['x-forwarded-for'] as string | undefined
        if (forwarded) {
            const parts = forwarded.split(',').map(s => s.trim())
            return parts[0].trim()
        }
    }
    return req.socket.remoteAddress ?? 'unknown'
}
