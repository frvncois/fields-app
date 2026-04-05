import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createDb } from './db'
import { verifyToken, getBearer } from './auth'
import { handleLogin, handleChangePassword } from './handlers/auth'
import { handleEntries, handleEntry, handleCollectionEntries } from './handlers/entries'
import { handleCollections } from './handlers/collections'
import { handleSettings } from './handlers/settings'
import { handleLocales } from './handlers/locales'
import {
    handleMediaUpload, handleMediaList, handleMediaItem,
    handleFolders, handleFolder,
} from './handlers/media'

function unauthorized(res: ServerResponse): void {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unauthorized' }))
}

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

                // Public route
                if (path === '/auth/login' && req.method === 'POST') {
                    return handleLogin(req, res, db)
                }

                // Auth guard
                const token = getBearer(req)
                if (!token || !verifyToken(token)) return unauthorized(res)

                // Route dispatch
                if (path === '/entries' || path === '/entries/') return handleEntries(req, res, db)

                const entryMatch = path.match(/^\/entries\/(\d+)$/)
                if (entryMatch) return handleEntry(req, res, db, Number(entryMatch[1]))

                if (path === '/collections' || path === '/collections/') return handleCollections(req, res, db)

                const colEntriesMatch = path.match(/^\/collections\/(\d+)\/entries$/)
                if (colEntriesMatch) return handleCollectionEntries(req, res, db, Number(colEntriesMatch[1]))

                if (path === '/settings' || path === '/settings/') return handleSettings(req, res, db)

                if (path === '/auth/password' && req.method === 'PATCH') return handleChangePassword(req, res, db)

                if (path === '/locales' || path === '/locales/') return handleLocales(req, res, db)

                if (path === '/media/upload' && req.method === 'POST') return handleMediaUpload(req, res, db)
                if (path === '/media' || path === '/media/') return handleMediaList(req, res, db)

                const mediaMatch = path.match(/^\/media\/(\d+)$/)
                if (mediaMatch) return handleMediaItem(req, res, db, Number(mediaMatch[1]))

                if (path === '/folders' || path === '/folders/') return handleFolders(req, res, db)

                const folderMatch = path.match(/^\/folders\/(\d+)$/)
                if (folderMatch) return handleFolder(req, res, db, Number(folderMatch[1]))

                res.statusCode = 404
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Unknown route' }))
            })
        },
    }
}
