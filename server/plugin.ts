import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createDb } from './db'
import { verifyToken, getBearer } from './auth'
import { handleLogin, handleLogout, handleChangePassword } from './handlers/auth'
import { handleEntries, handleEntry, handleCollectionEntries, handleTranslateEntry } from './handlers/entries'
import { handleCollections } from './handlers/collections'
import { handleSettings } from './handlers/settings'
import { handleLocales, handleSetLocale } from './handlers/locales'
import {
    handleMediaUpload, handleMediaList, handleMediaItem,
    handleFolders, handleFolder,
} from './handlers/media'
import { json } from './handlers/types'

const ALLOWED_ORIGINS = process.env.FIELDS_ALLOWED_ORIGINS
    ? process.env.FIELDS_ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : null // null = same-origin only (no CORS headers emitted)

function unauthorized(res: ServerResponse): void {
    json(res as ServerResponse & { statusCode: number }, { error: 'Unauthorized' }, 401)
}

function addSecurityHeaders(res: ServerResponse): void {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'same-origin')
    res.setHeader('Content-Security-Policy', "default-src 'none'")
}

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

function parseId(s: string): number | null {
    const n = Number(s)
    return Number.isInteger(n) && n > 0 ? n : null
}

async function dispatch(req: IncomingMessage, res: ServerResponse, db: ReturnType<typeof createDb>): Promise<void> {
    addSecurityHeaders(res)
    if (handleCors(req, res)) return

    const path = req.url!.slice('/api/fields'.length).split('?')[0]

    // Public route
    if (path === '/auth/login' && req.method === 'POST') {
        return handleLogin(req, res, db)
    }

    // Auth guard
    const token = getBearer(req)
    const payload = token ? verifyToken(token) : null
    if (!payload) return unauthorized(res)
    const userId = payload.sub

    if (path === '/auth/logout' && req.method === 'POST') return handleLogout(req, res)
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
