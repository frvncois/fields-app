import type { IncomingMessage, ServerResponse } from 'node:http'
import type { createDb } from '../db'

export type Db = ReturnType<typeof createDb>
export type Req = IncomingMessage
export type Res = ServerResponse

export function json(res: Res, data: unknown, status = 200): void {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
}

export function readJson(req: Req): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', () => {
            try { resolve(JSON.parse(body)) }
            catch { reject(new Error('Invalid JSON')) }
        })
    })
}
