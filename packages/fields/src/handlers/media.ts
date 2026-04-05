import { statSync } from 'node:fs'
import { join } from 'node:path'
import Busboy from 'busboy'
import { imageSizeFromFile } from 'image-size/fromFile'
import type { Req, Res, Db, Storage } from './types'
import { json, readJson } from './types'

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.mp4', '.wav', '.mov', '.webm', '.mp3', '.docx'])
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024 // 1 GB

function formatWeight(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getServerMediaType(mime: string): string {
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime === 'application/pdf') return 'pdf'
    if (mime.includes('word')) return 'docx'
    return 'file'
}

async function getImageDimensions(filePath: string, mime: string): Promise<string> {
    if (!mime.startsWith('image/')) return '—'
    try {
        const result = await imageSizeFromFile(filePath)
        return result.width && result.height ? `${result.width}×${result.height}` : '—'
    } catch {
        return '—'
    }
}

export async function handleMediaUpload(req: Req, res: Res, db: Db, storage: Storage): Promise<void> {
    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } })
    const fields: Record<string, string> = {}
    let savedFilename = ''
    let savedMime = ''
    let uploadError: string | null = null
    let fileBuffer: Buffer = Buffer.alloc(0)
    let bufferPromise: Promise<void> = Promise.resolve()

    bb.on('field', (name, value) => { fields[name] = value })
    bb.on('file', (_name, stream, info) => {
        const ext = (info.filename.slice(info.filename.lastIndexOf('.')) || '').toLowerCase()
        const mime = info.mimeType?.toLowerCase() ?? ''

        if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
            uploadError = 'File type not allowed'
            stream.resume()
            return
        }

        let base = info.filename.slice(0, info.filename.length - ext.length)
            .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        if (!base) base = 'file'
        savedFilename = `${base}${ext}`
        savedMime = mime

        bufferPromise = new Promise<void>((resolve, reject) => {
            const chunks: Buffer[] = []
            let size = 0
            stream.on('data', (chunk: Buffer) => {
                size += chunk.length
                if (size > MAX_FILE_SIZE) {
                    uploadError = 'File exceeds 1 GB limit'
                    stream.resume()
                    resolve()
                    return
                }
                chunks.push(chunk)
            })
            stream.on('end', () => {
                if (!uploadError) fileBuffer = Buffer.concat(chunks)
                resolve()
            })
            stream.on('error', reject)
        })
    })

    await new Promise<void>((resolve, reject) => {
        bb.on('close', resolve)
        bb.on('error', reject)
        req.pipe(bb)
    })

    if (uploadError) {
        json(res, { error: uploadError }, 400)
        return
    }

    await bufferPromise

    if (uploadError) {
        json(res, { error: uploadError }, 400)
        return
    }

    // Upload via storage adapter
    const url = await storage.upload(fileBuffer, savedFilename, savedMime)

    // [M3] Derive metadata server-side
    let weight = formatWeight(fileBuffer.length)
    let dimensions = '—'
    if (savedMime.startsWith('image/')) {
        // For local storage, we can stat the file; for remote, use buffer size
        try {
            const localPath = join(process.cwd(), 'public', url)
            weight = formatWeight(statSync(localPath).size)
            dimensions = await getImageDimensions(localPath, savedMime)
        } catch {
            weight = formatWeight(fileBuffer.length)
        }
    }
    const mediaType = getServerMediaType(savedMime)

    const folderId = fields.folderId ? Number(fields.folderId) : null
    const { lastInsertRowid } = db.run(
        'INSERT INTO media (folder_id, title, url, weight, dimensions, type) VALUES (?, ?, ?, ?, ?, ?)',
        [folderId, savedFilename, url, weight, dimensions, mediaType]
    )

    const row = db.get('SELECT * FROM media WHERE id = ?', [Number(lastInsertRowid)])
    json(res, row, 201)
}

export function handleMediaList(req: Req, res: Res, db: Db): void {
    const qs = new URLSearchParams(req.url!.split('?')[1] ?? '')
    const folderParam = qs.get('folder')
    let rows
    if (folderParam === 'root') {
        rows = db.query('SELECT * FROM media WHERE folder_id IS NULL')
    } else if (folderParam !== null) {
        const folderId = Number(folderParam)
        if (isNaN(folderId)) { json(res, { error: 'Bad request' }, 400); return }
        rows = db.query('SELECT * FROM media WHERE folder_id = ?', [folderId])
    } else {
        rows = db.query('SELECT * FROM media')
    }
    json(res, rows)
}

export async function handleMediaItem(req: Req, res: Res, db: Db, storage: Storage, id: number): Promise<void> {
    if (req.method === 'PATCH') {
        const body = await readJson(req)
        const folderId = body.folderId === null ? null : Number(body.folderId)
        db.run('UPDATE media SET folder_id = ? WHERE id = ?', [folderId, id])
        const row = db.get('SELECT * FROM media WHERE id = ?', [id])
        json(res, row)
        return
    }

    if (req.method === 'DELETE') {
        const row = db.get<{ url: string }>('SELECT url FROM media WHERE id = ?', [id])
        if (row?.url) {
            try { await storage.delete(row.url) } catch { /* already gone */ }
        }
        db.run('DELETE FROM media WHERE id = ?', [id])
        res.statusCode = 204
        res.end()
        return
    }

    json(res, { error: 'Method not allowed' }, 405)
}

export async function handleFolders(req: Req, res: Res, db: Db): Promise<void> {
    if (req.method === 'POST') {
        const body = await readJson(req)
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        if (!name || name.length > 100) { json(res, { error: 'Folder name must be between 1 and 100 characters' }, 400); return }
        const { lastInsertRowid } = db.run('INSERT INTO folders (name) VALUES (?)', [name])
        const row = db.get('SELECT f.id, f.name, 0 as count FROM folders f WHERE f.id = ?', [Number(lastInsertRowid)])
        json(res, row, 201)
        return
    }

    const rows = db.query(`
        SELECT f.id, f.name, COUNT(m.id) as count
        FROM folders f LEFT JOIN media m ON m.folder_id = f.id
        GROUP BY f.id ORDER BY f.name
    `)
    json(res, rows)
}

export function handleFolder(req: Req, res: Res, db: Db, id: number): void {
    if (req.method !== 'DELETE') {
        json(res, { error: 'Method not allowed' }, 405)
        return
    }
    db.run('UPDATE media SET folder_id = NULL WHERE folder_id = ?', [id])
    db.run('DELETE FROM folders WHERE id = ?', [id])
    res.statusCode = 204
    res.end()
}
