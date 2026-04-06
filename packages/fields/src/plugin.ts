import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createDb } from './db'
import { verifyToken } from './auth'
import { getClientIp } from './utils/ip'
import { handleLogin, handleLogout, handleChangePassword } from './handlers/auth'
import { handleSetupCheck, handleSetupCreate } from './handlers/setup'
import { handleEntries, handleEntry, handleCollectionEntries, handleTranslateEntry } from './handlers/entries'
import { handleCollections } from './handlers/collections'
import { handleSettings } from './handlers/settings'
import { handleLocales, handleSetLocale } from './handlers/locales'
import {
    handleMediaUpload, handleMediaList, handleMediaItem,
    handleFolders, handleFolder,
} from './handlers/media'
import { json } from './handlers/types'
import { LocalAdapter } from './adapters/storage/local'
import type { FieldsConfig, FieldsOptions, DatabaseAdapter, StorageAdapter } from './types'

// ─── Cookie auth ──────────────────────────────────────────────────────────────

function getTokenFromCookie(req: IncomingMessage): string | null {
    const cookies = req.headers.cookie ?? ''
    const match = cookies.match(/fields_token=([^;]+)/)
    return match ? match[1] : null
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = process.env.FIELDS_ALLOWED_ORIGINS
    ? process.env.FIELDS_ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : null

// ─── Security headers ─────────────────────────────────────────────────────────

function addSecurityHeaders(res: ServerResponse): void {
    const isDev = process.env.NODE_ENV !== 'production'
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader(
        'Content-Security-Policy',
        isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'"
            : "default-src 'self'"
    )
}

// ─── CORS handling ────────────────────────────────────────────────────────────

function handleCors(req: IncomingMessage, res: ServerResponse): boolean {
    const origin = req.headers['origin']
    if (origin && ALLOWED_ORIGINS?.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Access-Control-Allow-Credentials', 'true')
        res.setHeader('Vary', 'Origin')
    }
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.statusCode = 204
        res.end()
        return true
    }
    return false
}

// ─── Per-IP rate limiting for authenticated endpoints — persisted to SQLite ───

const AUTH_RATE_WINDOW = 60_000 // 1 minute
const AUTH_RATE_MAX = 300
const AUTH_RATE_KEY_PREFIX = 'auth:'

function checkAuthRateLimit(req: IncomingMessage, res: ServerResponse, db: DatabaseAdapter): boolean {
    const ip = AUTH_RATE_KEY_PREFIX + getClientIp(req)
    const now = Date.now()
    const row = db.get<{ count: number; reset_at: string }>(
        'SELECT count, reset_at FROM _rate_limits WHERE ip = ?', [ip]
    )
    if (!row || now > Number(row.reset_at)) {
        db.run(
            'INSERT INTO _rate_limits (ip, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET count = 1, reset_at = excluded.reset_at',
            [ip, String(now + AUTH_RATE_WINDOW)]
        )
        return true
    }
    if (row.count >= AUTH_RATE_MAX) {
        const retryAfter = Math.ceil((Number(row.reset_at) - now) / 1000)
        res.setHeader('Retry-After', String(retryAfter))
        json(res, { error: 'Too many requests' }, 429)
        return false
    }
    db.run('UPDATE _rate_limits SET count = count + 1 WHERE ip = ?', [ip])
    return true
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function unauthorized(res: ServerResponse): void {
    json(res, { error: 'Unauthorized' }, 401)
}

function parseId(s: string): number | null {
    const n = Number(s)
    return Number.isInteger(n) && n > 0 ? n : null
}

// ─── Load user config from fields.config.ts ──────────────────────────────────

async function loadUserConfig(projectRoot: string, configPath: string): Promise<FieldsConfig> {
    const absPath = resolve(projectRoot, configPath)
    if (!existsSync(absPath)) {
        return { collections: [] }
    }
    try {
        const mod = await import(pathToFileURL(absPath).href) as { default?: FieldsConfig }
        return mod.default ?? { collections: [] }
    } catch {
        return { collections: [] }
    }
}

// ─── Serve pre-built admin UI ─────────────────────────────────────────────────

function serveAdmin(
    req: IncomingMessage,
    res: ServerResponse,
    adminDir: string,
    config: FieldsConfig
): boolean {
    const url = req.url ?? '/'
    if (!url.startsWith('/fields')) return false

    // Strip /fields prefix to get the asset path
    const assetPath = url.slice('/fields'.length) || '/index.html'
    const cleanPath = assetPath.split('?')[0]

    // Determine the file to serve
    const candidates = cleanPath === '/' || cleanPath === ''
        ? ['index.html']
        : [cleanPath.slice(1), 'index.html'] // try exact path, fallback to SPA

    for (const candidate of candidates) {
        const filePath = join(adminDir, candidate)
        if (!existsSync(filePath)) continue

        try {
            let content = readFileSync(filePath)
            const ext = candidate.split('.').pop() ?? ''
            const mimeTypes: Record<string, string> = {
                html: 'text/html',
                js: 'application/javascript',
                css: 'text/css',
                svg: 'image/svg+xml',
                png: 'image/png',
                ico: 'image/x-icon',
                json: 'application/json',
            }
            const contentType = mimeTypes[ext] ?? 'application/octet-stream'

            // Inject config into HTML before </head>
            if (ext === 'html') {
                const injection = `<script>window.__FIELDS_CONFIG__=${JSON.stringify(config)}</script>`
                const html = content.toString('utf8').replace('</head>', `${injection}</head>`)
                res.statusCode = 200
                res.setHeader('Content-Type', 'text/html; charset=utf-8')
                res.end(html)
                return true
            }

            res.statusCode = 200
            res.setHeader('Content-Type', contentType)
            res.end(content)
            return true
        } catch {
            break
        }
    }

    return false
}

// ─── Main API dispatcher ──────────────────────────────────────────────────────

async function dispatch(
    req: IncomingMessage,
    res: ServerResponse,
    db: DatabaseAdapter,
    storage: StorageAdapter,
    config: FieldsConfig,
    adminDir: string
): Promise<void> {
    addSecurityHeaders(res)
    if (handleCors(req, res)) return

    const url = req.url ?? '/'

    // Serve admin UI at /fields/*
    if (url.startsWith('/fields') && !url.startsWith('/api/fields')) {
        if (!serveAdmin(req, res, adminDir, config)) {
            res.statusCode = 404
            res.end('Not found')
        }
        return
    }

    if (!url.startsWith('/api/fields')) return

    const path = url.slice('/api/fields'.length).split('?')[0]

    // [C3] Setup routes — always public
    if (path === '/setup' && req.method === 'GET') return handleSetupCheck(req, res, db)
    if (path === '/setup' && req.method === 'POST') return handleSetupCreate(req, res, db)

    // Expose user config to the admin SPA
    if (path === '/config' && req.method === 'GET') {
        json(res, config)
        return
    }

    // [C3] No users → redirect to setup
    const userCount = db.get<{ count: number }>('SELECT COUNT(*) as count FROM users')
    if (!userCount || userCount.count === 0) {
        json(res, { needsSetup: true }, 403)
        return
    }

    // Public login route
    if (path === '/auth/login' && req.method === 'POST') {
        return handleLogin(req, res, db)
    }

    // [H3] Rate limit all other requests
    if (!checkAuthRateLimit(req, res, db)) return

    // Auth guard
    const token = getTokenFromCookie(req)
    const payload = token ? verifyToken(token) : null
    if (!payload) return unauthorized(res)

    // [M6] Check token revocation
    const revoked = db.get('SELECT 1 FROM _token_revocations WHERE jti = ?', [payload.jti])
    if (revoked) return unauthorized(res)

    const userId = payload.sub

    if (path === '/auth/logout' && req.method === 'POST') return handleLogout(req, res, db)
    if (path === '/auth/password' && req.method === 'PATCH') return handleChangePassword(req, res, db, userId)

    if (path === '/entries' || path === '/entries/') return handleEntries(req, res, db)

    const entryMatch = path.match(/^\/entries\/(\d+)$/)
    if (entryMatch) {
        const id = parseId(entryMatch[1])
        if (!id) return json(res, { error: 'Invalid ID' }, 400)
        return handleEntry(req, res, db, id)
    }

    const translateMatch = path.match(/^\/entries\/(\d+)\/translate\/([a-z]{2,5})$/)
    if (translateMatch) {
        const id = parseId(translateMatch[1])
        if (!id) return json(res, { error: 'Invalid ID' }, 400)
        return handleTranslateEntry(req, res, db, id, translateMatch[2])
    }

    if (path === '/collections' || path === '/collections/') return handleCollections(req, res, db)

    const colEntriesMatch = path.match(/^\/collections\/(\d+)\/entries$/)
    if (colEntriesMatch) {
        const id = parseId(colEntriesMatch[1])
        if (!id) return json(res, { error: 'Invalid ID' }, 400)
        return handleCollectionEntries(req, res, db, id)
    }

    if (path === '/settings' || path === '/settings/') return handleSettings(req, res, db)

    if (path === '/locales' || path === '/locales/') return handleLocales(req, res, db)

    const localeMatch = path.match(/^\/locales\/([a-z]{2,5})$/)
    if (localeMatch) return handleSetLocale(req, res, db, localeMatch[1])

    if (path === '/media/upload' && req.method === 'POST') return handleMediaUpload(req, res, db, storage)
    if (path === '/media' || path === '/media/') return handleMediaList(req, res, db)

    const mediaMatch = path.match(/^\/media\/(\d+)$/)
    if (mediaMatch) {
        const id = parseId(mediaMatch[1])
        if (!id) return json(res, { error: 'Invalid ID' }, 400)
        return handleMediaItem(req, res, db, storage, id)
    }

    if (path === '/folders' || path === '/folders/') return handleFolders(req, res, db)

    const folderMatch = path.match(/^\/folders\/(\d+)$/)
    if (folderMatch) {
        const id = parseId(folderMatch[1])
        if (!id) return json(res, { error: 'Invalid ID' }, 400)
        return handleFolder(req, res, db, id)
    }

    json(res, { error: 'Not found' }, 404)
}

// ─── Vite plugin ─────────────────────────────────────────────────────────────

export function fieldsPlugin(options: FieldsOptions = {}): Plugin[] {
    const configFile = options.config ?? 'fields.config.ts'

    let db: DatabaseAdapter
    let storage: StorageAdapter
    let userConfig: FieldsConfig = { collections: [] }
    let projectRoot: string
    let adminDir: string

    async function syncCollections() {
        for (const col of userConfig.collections) {
            db.run(
                'INSERT INTO collections (name, label, type) VALUES (?, ?, ?) ON CONFLICT(name) DO NOTHING',
                [col.name, col.label ?? col.name, col.type ?? 'collection']
            )
        }
    }

    const virtualConfigPlugin: Plugin = {
        name: 'fields-virtual-config',
        enforce: 'pre',
        resolveId(id) {
            if (id === 'virtual:fields-config') return '\0virtual:fields-config'
        },
        load(id) {
            if (id !== '\0virtual:fields-config') return
            return `export default ${JSON.stringify(userConfig)}`
        },
        async handleHotUpdate({ file }) {
            if (file.endsWith(configFile)) {
                userConfig = await loadUserConfig(projectRoot, configFile)
                await syncCollections()
            }
        },
    }

    const apiPlugin: Plugin = {
        name: 'fields-api',

        async configureServer(server) {
            if (process.env.NODE_ENV === 'production' && !process.env.FIELDS_JWT_SECRET) {
                throw new Error('FIELDS_JWT_SECRET env var must be set in production')
            }
            projectRoot = server.config.root
            adminDir = join(__dirname, '..', 'dist', 'admin')

            db = options.db ?? createDb({ root: projectRoot })
            storage = options.storage ?? new LocalAdapter(projectRoot)
            userConfig = await loadUserConfig(projectRoot, configFile)
            console.log('  ✦ Syncing collections from fields.config.ts...')
            await syncCollections()
            const cols = db.query<{ name: string }>('SELECT name FROM collections')
            console.log('  ✦ Collections in DB:', cols.map(c => c.name))

            console.log('  ✦ Fields API ready  →  /api/fields')
            console.log('  ✦ Fields admin UI   →  /fields')

            server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
                const url = req.url ?? '/'
                if (!url.startsWith('/fields') && !url.startsWith('/api/fields')) return next()
                try {
                    await dispatch(req, res, db, storage, userConfig, adminDir)
                } catch (err: unknown) {
                    console.error('[fields]', err)
                    if (!res.headersSent) {
                        const status = typeof (err as { status?: number }).status === 'number'
                            ? (err as { status: number }).status
                            : 500
                        const msg = status === 413 ? 'Payload too large' : 'Internal server error'
                        res.statusCode = status
                        res.setHeader('Content-Type', 'application/json')
                        res.end(JSON.stringify({ error: msg }))
                    }
                }
            })
        },
    }

    return [virtualConfigPlugin, apiPlugin]
}

// Re-export types for consumers
export type { FieldsConfig, FieldDef, FieldValues, CollectionSchema, FieldType, FieldsOptions, DatabaseAdapter, StorageAdapter } from './types'
export { SQLiteAdapter } from './adapters/db/sqlite'
export { PgAdapter } from './adapters/db/postgres'
export { TursoAdapter } from './adapters/db/turso'
export { LocalAdapter } from './adapters/storage/local'
export { S3Adapter } from './adapters/storage/s3'
export { SupabaseStorageAdapter } from './adapters/storage/supabase'
export { VercelBlobAdapter } from './adapters/storage/vercel'
export { NetlifyBlobsAdapter } from './adapters/storage/netlify'
export { FirebaseStorageAdapter } from './adapters/storage/firebase'
