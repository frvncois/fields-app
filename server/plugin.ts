import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createDb } from './db'
import { verifyToken, getBearer } from './auth'
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
import { getClientIp } from './utils/ip'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = process.env.FIELDS_ALLOWED_ORIGINS
    ? process.env.FIELDS_ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : null

// ─── Security headers ─────────────────────────────────────────────────────────

function addSecurityHeaders(res: ServerResponse): void {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Content-Security-Policy', "default-src 'self'")
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

// ─── Per-IP rate limiting for authenticated endpoints ────────────────────────

const AUTH_RATE_WINDOW = 60_000 // 1 minute
const AUTH_RATE_MAX = 300
const AUTH_RATE_KEY_PREFIX = 'auth:'

function checkAuthRateLimit(req: IncomingMessage, res: ServerResponse, db: ReturnType<typeof createDb>): boolean {
    const ip = AUTH_RATE_KEY_PREFIX + getClientIp(req)
    const now = Date.now()
    const row = db.prepare('SELECT count, reset_at FROM _rate_limits WHERE ip = ?').get(ip) as
        { count: number; reset_at: string } | undefined
    if (!row || now > Number(row.reset_at)) {
        db.prepare(
            'INSERT INTO _rate_limits (ip, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET count = 1, reset_at = excluded.reset_at'
        ).run(ip, String(now + AUTH_RATE_WINDOW))
        return true
    }
    if (row.count >= AUTH_RATE_MAX) {
        const retryAfter = Math.ceil((Number(row.reset_at) - now) / 1000)
        res.setHeader('Retry-After', String(retryAfter))
        json(res, { error: 'Too many requests' }, 429)
        return false
    }
    db.prepare('UPDATE _rate_limits SET count = count + 1 WHERE ip = ?').run(ip)
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

// ─── Main dispatcher ──────────────────────────────────────────────────────────

async function dispatch(req: IncomingMessage, res: ServerResponse, db: ReturnType<typeof createDb>): Promise<void> {
    addSecurityHeaders(res)
    if (handleCors(req, res)) return

    const path = req.url!.slice('/api/fields'.length).split('?')[0]

    // [C3] Setup routes — always public, no auth required
    if (path === '/setup' && req.method === 'GET') return handleSetupCheck(req, res, db)
    if (path === '/setup' && req.method === 'POST') return handleSetupCreate(req, res, db)

    // [C3] If no users exist, all other routes return 403 with needsSetup flag
    const { count: userCount } = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
    if (userCount === 0) {
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
    const token = getBearer(req)
    const payload = token ? verifyToken(token) : null
    if (!payload) return unauthorized(res)

    // [M6] Check token revocation in DB
    const revoked = db.prepare('SELECT 1 FROM _token_revocations WHERE jti = ?').get(payload.jti)
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

    if (path === '/media/upload' && req.method === 'POST') return handleMediaUpload(req, res, db)
    if (path === '/media' || path === '/media/') return handleMediaList(req, res, db)

    const mediaMatch = path.match(/^\/media\/(\d+)$/)
    if (mediaMatch) {
        const id = parseId(mediaMatch[1])
        if (!id) return json(res, { error: 'Invalid ID' }, 400)
        return handleMediaItem(req, res, db, id)
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

export function fieldsApiPlugin(): Plugin {
    let db: ReturnType<typeof createDb>

    return {
        name: 'fields-api',

        configureServer(server) {
            db = createDb()
            console.log('  ✦ Fields API ready  →  /api/fields')

            server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
                if (!req.url?.startsWith('/api/fields')) return next()
                try {
                    await dispatch(req, res, db)
                } catch (err: unknown) {
                    console.error('[fields-api]', err)
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
}
