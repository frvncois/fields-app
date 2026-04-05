import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createWriteStream, existsSync, unlinkSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import Busboy from 'busboy'
import jwt from 'jsonwebtoken'
import { compareSync, hashSync } from 'bcryptjs'
import { createDb } from './db'

if (process.env.NODE_ENV === 'production' && !process.env.FIELDS_JWT_SECRET) {
    throw new Error('FIELDS_JWT_SECRET env var must be set in production')
}

const JWT_SECRET = process.env.FIELDS_JWT_SECRET ?? 'fields-dev-secret-change-in-production'
const JWT_EXPIRES = '7d'

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.mp4', '.wav', '.mov'])
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'video/mp4', 'video/quicktime',
    'audio/wav', 'audio/wave', 'audio/x-wav',
])

const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024 // 1 GB

// Brute force rate limiting: max 5 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 min
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

function clearRateLimit(ip: string) {
    loginAttempts.delete(ip)
}

function signToken(userId: number): string {
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

function verifyToken(token: string): { sub: number } | null {
    try {
        return jwt.verify(token, JWT_SECRET) as { sub: number }
    } catch {
        return null
    }
}

function getBearer(req: IncomingMessage): string | null {
    const auth = req.headers['authorization']
    if (!auth?.startsWith('Bearer ')) return null
    return auth.slice(7)
}

function unauthorized(res: ServerResponse) {
    res.statusCode = 401
    res.end(JSON.stringify({ error: 'Unauthorized' }))
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', () => {
            try { resolve(JSON.parse(body)) }
            catch { reject(new Error('Invalid JSON')) }
        })
    })
}

function toSlug(db: import('better-sqlite3').Database, collectionName: string, title: string): string {
    const base = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    let slug = `/${collectionName}/${base}`
    let i = 2
    while (db.prepare('SELECT 1 FROM entries WHERE slug = ?').get(slug)) {
        slug = `/${collectionName}/${base}-${i++}`
    }
    return slug
}

const ENTRY_SELECT = `
    SELECT
        e.id,
        e.title,
        e.slug,
        CASE WHEN c.type = 'page' THEN 'Page' ELSE c.label END AS type,
        c.type   AS category,
        e.status,
        strftime('%Y-%m-%dT%H:%M:%SZ', e.created_at) AS createdAt,
        strftime('%Y-%m-%dT%H:%M:%SZ', e.updated_at) AS updatedAt,
        e.collection_name AS collectionName
    FROM entries e
    JOIN collections c ON c.name = e.collection_name
`

export function fieldsApiPlugin(): Plugin {
    let db: ReturnType<typeof createDb>

    return {
        name: 'fields-api',

        configureServer(server) {
            db = createDb()
            console.log('  ✦ Fields API ready  →  /api/field')

            server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
                if (!req.url?.startsWith('/api/field')) return next()

                const path = req.url.slice('/api/field'.length).split('?')[0]
                res.setHeader('Content-Type', 'application/json')

                // Public route — no token required
                if (path === '/auth/login' && req.method === 'POST') {
                    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim()
                        ?? req.socket.remoteAddress
                        ?? 'unknown'

                    if (!checkRateLimit(ip)) {
                        res.statusCode = 429
                        res.end(JSON.stringify({ error: 'Too many attempts. Try again later.' }))
                        return
                    }

                    const body = await readJson(req)
                    const user = db.prepare('SELECT id, password FROM users WHERE email = ?')
                        .get(String(body.email)) as { id: number; password: string } | undefined
                    if (!user || !compareSync(String(body.password), user.password)) {
                        res.statusCode = 401
                        res.end(JSON.stringify({ error: 'Invalid credentials' }))
                        return
                    }

                    clearRateLimit(ip)
                    res.end(JSON.stringify({ token: signToken(user.id) }))
                    return
                }

                // All other routes require a valid token
                const token = getBearer(req)
                if (!token || !verifyToken(token)) return unauthorized(res)

                // /api/field/entries
                if (path === '/entries' || path === '/entries/') {
                    if (req.method === 'POST') {
                        const body = await readJson(req)
                        const col = db.prepare('SELECT name FROM collections WHERE id = ?')
                            .get(body.collectionId) as { name: string } | undefined
                        if (!col) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Unknown collection' })); return }
                        const slug = toSlug(db, col.name, String(body.title))
                        const status = body.status === 'published' ? 'published' : 'draft'
                        const data = JSON.stringify(body.data ?? {})
                        const { lastInsertRowid } = db.prepare(
                            'INSERT INTO entries (collection_name, title, slug, status, data) VALUES (?, ?, ?, ?, ?)'
                        ).run(col.name, String(body.title), slug, status, data)
                        const row = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(lastInsertRowid)
                        res.statusCode = 201
                        res.end(JSON.stringify(row))
                        return
                    }
                    const rows = db.prepare(`${ENTRY_SELECT} ORDER BY e.updated_at DESC`).all()
                    res.end(JSON.stringify(rows))
                    return
                }

                // GET / PUT /api/field/entries/:id
                const entryMatch = path.match(/^\/entries\/(\d+)$/)
                if (entryMatch) {
                    const id = Number(entryMatch[1])
                    if (req.method === 'PUT') {
                        const body = await readJson(req)
                        const status = body.status === 'published' ? 'published' : 'draft'
                        const data = JSON.stringify(body.data ?? {})
                        db.prepare(
                            `UPDATE entries SET title = ?, status = ?, data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
                        ).run(String(body.title), status, data, id)
                        const row = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(id)
                        res.end(JSON.stringify(row))
                        return
                    }
                    if (req.method === 'DELETE') {
                        db.prepare('DELETE FROM entries WHERE id = ?').run(id)
                        res.statusCode = 204
                        res.end()
                        return
                    }
                    const row = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(id) as Record<string, unknown> | undefined
                    if (!row) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return }
                    const dataRow = db.prepare('SELECT data FROM entries WHERE id = ?').get(id) as { data: string }
                    row.data = dataRow?.data ? JSON.parse(dataRow.data) : {}
                    res.end(JSON.stringify(row))
                    return
                }

                // GET /api/field/collections
                if (path === '/collections' || path === '/collections/') {
                    const rows = db.prepare(`
                        SELECT c.*, e.id AS firstEntryId
                        FROM collections c
                        LEFT JOIN entries e ON e.collection_name = c.name AND c.type = 'page'
                        GROUP BY c.id
                        ORDER BY c.type, c.label
                    `).all()
                    res.end(JSON.stringify(rows))
                    return
                }

                // GET /api/field/collections/:id/entries  (numeric ID)
                const collectionMatch = path.match(/^\/collections\/(\d+)\/entries$/)
                if (collectionMatch) {
                    const col = db.prepare('SELECT name FROM collections WHERE id = ?').get(Number(collectionMatch[1])) as { name: string } | undefined
                    if (!col) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return }
                    const rows = db.prepare(`${ENTRY_SELECT} WHERE e.collection_name = ? ORDER BY e.updated_at DESC`).all(col.name)
                    res.end(JSON.stringify(rows))
                    return
                }

                // GET / PATCH /api/field/settings
                if (path === '/settings' || path === '/settings/') {
                    if (req.method === 'PATCH') {
                        const body = await readJson(req)
                        const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
                        const allowed = ['user_first', 'user_last', 'user_email', 'project_name', 'dark_mode']
                        for (const key of allowed) {
                            if (key in body) upsert.run(key, String(body[key]))
                        }
                        res.end(JSON.stringify({ ok: true }))
                        return
                    }
                    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
                    res.end(JSON.stringify(Object.fromEntries(rows.map(r => [r.key, r.value]))))
                    return
                }

                // PATCH /api/field/auth/password
                if (path === '/auth/password' && req.method === 'PATCH') {
                    const body = await readJson(req)
                    if (!body.password || typeof body.password !== 'string') {
                        res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing password' })); return
                    }
                    db.prepare('UPDATE users SET password = ?').run(hashSync(String(body.password), 10))
                    res.end(JSON.stringify({ ok: true }))
                    return
                }

                // GET /api/field/locales
                if (path === '/locales' || path === '/locales/') {
                    const rows = db.prepare('SELECT code, name, is_current FROM locales ORDER BY is_current DESC').all()
                    res.end(JSON.stringify(rows))
                    return
                }

                // POST /api/field/media/upload (multipart)
                if (path === '/media/upload' && req.method === 'POST') {
                    const uploadsDir = join(process.cwd(), 'public', 'uploads')
                    await mkdir(uploadsDir, { recursive: true })

                    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } })
                    const fields: Record<string, string> = {}
                    let savedFilename = ''
                    let uploadError: string | null = null
                    let writePromise: Promise<void> = Promise.resolve()

                    bb.on('field', (name, value) => { fields[name] = value })
                    bb.on('file', (_name, stream, info) => {
                        // Path traversal: strip to basename only
                        const safeName = basename(info.filename)
                        const ext = extname(safeName).toLowerCase()
                        const mime = info.mimeType?.toLowerCase() ?? ''

                        if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
                            uploadError = `File type not allowed: ${ext}`
                            stream.resume() // drain and discard
                            return
                        }

                        let base = safeName.slice(0, safeName.length - ext.length)
                            .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        if (!base) base = 'file'
                        let filename = `${base}${ext}`
                        let i = 2
                        while (existsSync(join(uploadsDir, filename))) {
                            filename = `${base}-${i++}${ext}`
                        }

                        savedFilename = filename
                        let limitHit = false
                        writePromise = new Promise<void>((res, rej) => {
                            const writer = createWriteStream(join(uploadsDir, filename))
                            stream.on('limit', () => {
                                limitHit = true
                                writer.destroy()
                                try { unlinkSync(join(uploadsDir, filename)) } catch { /* ignore */ }
                                uploadError = 'File exceeds 1 GB limit'
                            })
                            stream.pipe(writer)
                                .on('close', () => limitHit ? rej(new Error(uploadError!)) : res())
                                .on('error', rej)
                        })
                    })

                    await new Promise<void>((resolve, reject) => {
                        bb.on('close', resolve)
                        bb.on('error', reject)
                        req.pipe(bb)
                    })

                    if (uploadError) {
                        res.statusCode = 400
                        res.end(JSON.stringify({ error: uploadError }))
                        return
                    }

                    await writePromise

                    const folderId = fields.folderId ? Number(fields.folderId) : null
                    const { lastInsertRowid } = db.prepare(
                        'INSERT INTO media (folder_id, title, url, weight, dimensions, type) VALUES (?, ?, ?, ?, ?, ?)'
                    ).run(folderId, savedFilename, `/uploads/${savedFilename}`, fields.weight, fields.dimensions, fields.mediaType)

                    const row = db.prepare('SELECT * FROM media WHERE id = ?').get(lastInsertRowid)
                    res.statusCode = 201
                    res.end(JSON.stringify(row))
                    return
                }

                // GET /api/field/folders  POST /api/field/folders
                if (path === '/folders' || path === '/folders/') {
                    if (req.method === 'POST') {
                        const body = await readJson(req)
                        const { lastInsertRowid } = db.prepare('INSERT INTO folders (name) VALUES (?)').run(String(body.name))
                        const row = db.prepare('SELECT f.id, f.name, 0 as count FROM folders f WHERE f.id = ?').get(lastInsertRowid)
                        res.statusCode = 201; res.end(JSON.stringify(row)); return
                    }
                    const rows = db.prepare(`
                        SELECT f.id, f.name, COUNT(m.id) as count
                        FROM folders f LEFT JOIN media m ON m.folder_id = f.id
                        GROUP BY f.id ORDER BY f.name
                    `).all()
                    res.end(JSON.stringify(rows)); return
                }

                // DELETE /api/field/folders/:id
                const folderMatch = path.match(/^\/folders\/(\d+)$/)
                if (folderMatch) {
                    const id = Number(folderMatch[1])
                    if (req.method === 'DELETE') {
                        db.prepare('UPDATE media SET folder_id = NULL WHERE folder_id = ?').run(id)
                        db.prepare('DELETE FROM folders WHERE id = ?').run(id)
                        res.statusCode = 204; res.end(); return
                    }
                }

                // GET /api/field/media   PATCH /api/field/media/:id
                if (path === '/media' || path === '/media/') {
                    const qs = new URLSearchParams(req.url!.split('?')[1] ?? '')
                    const folderParam = qs.get('folder')
                    let rows
                    if (folderParam === 'root') {
                        rows = db.prepare('SELECT * FROM media WHERE folder_id IS NULL').all()
                    } else if (folderParam !== null) {
                        rows = db.prepare('SELECT * FROM media WHERE folder_id = ?').all(Number(folderParam))
                    } else {
                        rows = db.prepare('SELECT * FROM media').all()
                    }
                    res.end(JSON.stringify(rows)); return
                }

                const mediaMatch = path.match(/^\/media\/(\d+)$/)
                if (mediaMatch) {
                    const id = Number(mediaMatch[1])
                    if (req.method === 'PATCH') {
                        const body = await readJson(req)
                        const folderId = body.folderId === null ? null : Number(body.folderId)
                        db.prepare('UPDATE media SET folder_id = ? WHERE id = ?').run(folderId, id)
                        const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id)
                        res.end(JSON.stringify(row)); return
                    }
                    if (req.method === 'DELETE') {
                        const row = db.prepare('SELECT url FROM media WHERE id = ?').get(id) as { url: string } | undefined
                        if (row?.url.startsWith('/uploads/')) {
                            const filePath = join(process.cwd(), 'public', row.url)
                            try { unlinkSync(filePath) } catch { /* already gone */ }
                        }
                        db.prepare('DELETE FROM media WHERE id = ?').run(id)
                        res.statusCode = 204; res.end(); return
                    }
                }

                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Unknown route' }))
            })
        },
    }
}
