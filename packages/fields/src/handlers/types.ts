import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DatabaseAdapter, StorageAdapter } from '../types'

export type Db = DatabaseAdapter
export type Storage = StorageAdapter
export type Req = IncomingMessage
export type Res = ServerResponse

export function json(res: Res, data: unknown, status = 200): void {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
}

const MAX_BODY = 1_048_576 // 1 MB

export function readJson(req: Req): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let body = ''
        let size = 0
        req.on('data', (chunk: Buffer) => {
            size += chunk.length
            if (size > MAX_BODY) {
                req.destroy()
                reject(Object.assign(new Error('Payload too large'), { status: 413 }))
                return
            }
            body += chunk.toString()
        })
        req.on('end', () => {
            try { resolve(JSON.parse(body)) }
            catch { reject(new Error('Invalid JSON')) }
        })
    })
}
