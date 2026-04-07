import { statSync } from 'node:fs'
import { join } from 'node:path'
import Busboy from 'busboy'
import { imageSizeFromFile } from 'image-size/fromFile'
import type { Req, Res, Db, Storage } from './types'
import { json, parseId, readJson } from './types'
import type { UserContext } from '../types'

const MAGIC_BYTES: Record<string, number[][]> = {
    'image/jpeg':      [[0xFF, 0xD8, 0xFF]],
    'image/png':       [[0x89, 0x50, 0x4E, 0x47]],
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'video/webm':      [[0x1A, 0x45, 0xDF, 0xA3]],
    // MP3: ID3 tag or raw sync bytes (0xFF 0xFB/0xF3/0xF2)
    'audio/mpeg':      [[0x49, 0x44, 0x33], [0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2]],
    // DOCX is a ZIP archive
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]],
}

function checkMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 12) return false

    // WebP: RIFF header (bytes 0-3) + WEBP marker (bytes 8-11)
    if (mimeType === 'image/webp') {
        return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
            && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    }

    // WAV: RIFF header (bytes 0-3) + WAVE marker (bytes 8-11)
    if (mimeType === 'audio/wav' || mimeType === 'audio/wave' || mimeType === 'audio/x-wav') {
        return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
            && buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
    }

    // MP4/QuickTime: 'ftyp' box type at bytes 4-7 (bytes 0-3 are the variable box size)
    if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
        return buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
    }

    const signatures = MAGIC_BYTES[mimeType]
    if (!signatures) return false
    const head = [...buffer.slice(0, 8)]
    return signatures.some(sig => sig.every((b, i) => head[i] === b))
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.mp4', '.wav', '.mov', '.webm', '.mp3', '.docx'])
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

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

export async function handleMediaUpload(req: Req, res: Res, db: Db, storage: Storage, ctx: UserContext): Promise<void> {
    if (ctx.role === 'editor' && !ctx.permissions?.can_media) {
        json(res, { error: 'Forbidden' }, 403); return
    }
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

        // NOTE(streaming): The file is fully buffered in heap before upload.
        // For large files (up to 1 GB) this is an OOM risk.
        // Future: stream directly to the storage adapter without buffering.
        bufferPromise = new Promise<void>((resolve, reject) => {
            const chunks: Buffer[] = []
            let size = 0
            stream.on('data', (chunk: Buffer) => {
                size += chunk.length
                if (size > MAX_FILE_SIZE) {
                    uploadError = 'File exceeds 50 MB limit'
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

    // Validate magic bytes before uploading
    if (!checkMagicBytes(fileBuffer, savedMime)) {
        json(res, { error: 'File content does not match declared type' }, 400)
        return
    }

    // Upload via storage adapter
    const url = await storage.upload(fileBuffer, savedFilename, savedMime)

    // Derive metadata server-side
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

    const folderId = fields.folderId != null
        ? parseId(String(fields.folderId))
        : null
    if (fields.folderId != null && folderId === null) {
        json(res, { error: 'Invalid folderId' }, 400); return
    }
    const { lastInsertRowid } = db.run(
        'INSERT INTO media (folder_id, title, url, weight, dimensions, type) VALUES (?, ?, ?, ?, ?, ?)',
        [folderId, savedFilename, url, weight, dimensions, mediaType]
    )

    const row = db.get('SELECT * FROM media WHERE id = ?', [Number(lastInsertRowid)])
    json(res, row, 201)
}

export function handleMediaList(req: Req, res: Res, db: Db, ctx: UserContext): void {
    if (ctx.role === 'editor' && !ctx.permissions?.can_media) {
        json(res, { error: 'Forbidden' }, 403); return
    }
    const qs = new URLSearchParams(req.url!.split('?')[1] ?? '')
    const folderParam = qs.get('folder')
    const limit = Math.min(Math.max(parseInt(qs.get('limit') ?? '200', 10) || 200, 1), 1000)
    const offset = Math.max(parseInt(qs.get('offset') ?? '0', 10) || 0, 0)

    let where = ''
    let params: unknown[] = []
    if (folderParam === 'root') {
        where = 'WHERE folder_id IS NULL'
    } else if (folderParam !== null) {
        const folderId = Number(folderParam)
        if (isNaN(folderId)) { json(res, { error: 'Bad request' }, 400); return }
        where = 'WHERE folder_id = ?'
        params = [folderId]
    }

    const total = (db.get<{ n: number }>(`SELECT COUNT(*) as n FROM media ${where}`, params))?.n ?? 0
    const rows = db.query(`SELECT * FROM media ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, offset])
    json(res, { items: rows, total, limit, offset })
}

export async function handleMediaItem(req: Req, res: Res, db: Db, storage: Storage, id: number, ctx: UserContext): Promise<void> {
    if ((req.method === 'PATCH' || req.method === 'DELETE') && ctx.role === 'editor' && !ctx.permissions?.can_media) {
        json(res, { error: 'Forbidden' }, 403); return
    }

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

export async function handleFolders(req: Req, res: Res, db: Db, ctx: UserContext): Promise<void> {
    if (req.method === 'POST' && ctx.role === 'editor' && !ctx.permissions?.can_media) {
        json(res, { error: 'Forbidden' }, 403); return
    }
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

export function handleFolder(req: Req, res: Res, db: Db, id: number, ctx: UserContext): void {
    if (ctx.role === 'editor' && !ctx.permissions?.can_media) {
        json(res, { error: 'Forbidden' }, 403); return
    }
    if (req.method !== 'DELETE') {
        json(res, { error: 'Method not allowed' }, 405)
        return
    }
    db.run('UPDATE media SET folder_id = NULL WHERE folder_id = ?', [id])
    db.run('DELETE FROM folders WHERE id = ?', [id])
    res.statusCode = 204
    res.end()
}
