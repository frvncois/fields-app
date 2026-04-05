import { createWriteStream, existsSync, unlinkSync, statSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join, extname, basename, resolve, sep } from 'node:path'
import Busboy from 'busboy'
import { imageSizeFromFile } from 'image-size/fromFile'
import type { Req, Res, Db } from './types'
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

export async function handleMediaUpload(req: Req, res: Res, db: Db): Promise<void> {
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } })
    const fields: Record<string, string> = {}
    let savedFilename = ''
    let savedMime = ''
    let uploadError: string | null = null
    let writePromise: Promise<void> = Promise.resolve()

    bb.on('field', (name, value) => { fields[name] = value })
    bb.on('file', (_name, stream, info) => {
        const safeName = basename(info.filename)
        const ext = extname(safeName).toLowerCase()
        const mime = info.mimeType?.toLowerCase() ?? ''

        if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
            uploadError = `File type not allowed`
            stream.resume()
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
        savedMime = mime
        let limitHit = false
        writePromise = new Promise<void>((resolve, reject) => {
            const writer = createWriteStream(join(uploadsDir, filename))
            stream.on('limit', () => {
                limitHit = true
                writer.destroy()
                try { unlinkSync(join(uploadsDir, filename)) } catch { /* ignore */ }
                uploadError = 'File exceeds 1 GB limit'
            })
            stream.pipe(writer)
                .on('close', () => limitHit ? reject(new Error(uploadError!)) : resolve())
                .on('error', reject)
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

    await writePromise

    // [M3] Derive all metadata server-side — never trust client fields
    const filePath = join(uploadsDir, savedFilename)
    const weight = formatWeight(statSync(filePath).size)
    const dimensions = await getImageDimensions(filePath, savedMime)
    const mediaType = getServerMediaType(savedMime)

    const folderId = fields.folderId ? Number(fields.folderId) : null
    const { lastInsertRowid } = db.prepare(
        'INSERT INTO media (folder_id, title, url, weight, dimensions, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(folderId, savedFilename, `/uploads/${savedFilename}`, weight, dimensions, mediaType)

    const row = db.prepare('SELECT * FROM media WHERE id = ?').get(lastInsertRowid)
    json(res, row, 201)
}

export function handleMediaList(req: Req, res: Res, db: Db): void {
    const qs = new URLSearchParams(req.url!.split('?')[1] ?? '')
    const folderParam = qs.get('folder')
    let rows
    if (folderParam === 'root') {
        rows = db.prepare('SELECT * FROM media WHERE folder_id IS NULL').all()
    } else if (folderParam !== null) {
        const folderId = Number(folderParam)
        if (isNaN(folderId)) { json(res, { error: 'Bad request' }, 400); return }
        rows = db.prepare('SELECT * FROM media WHERE folder_id = ?').all(folderId)
    } else {
        rows = db.prepare('SELECT * FROM media').all()
    }
    json(res, rows)
}

export async function handleMediaItem(req: Req, res: Res, db: Db, id: number): Promise<void> {
    if (req.method === 'PATCH') {
        const body = await readJson(req)
        const folderId = body.folderId === null ? null : Number(body.folderId)
        db.prepare('UPDATE media SET folder_id = ? WHERE id = ?').run(folderId, id)
        const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id)
        json(res, row)
        return
    }

    if (req.method === 'DELETE') {
        const row = db.prepare('SELECT url FROM media WHERE id = ?').get(id) as { url: string } | undefined
        if (row?.url.startsWith('/uploads/')) {
            // [M4] Canonicalize path to prevent directory traversal
            const uploadsRoot = resolve(process.cwd(), 'public', 'uploads')
            const filePath = resolve(process.cwd(), 'public', row.url)
            if (filePath.startsWith(uploadsRoot + sep)) {
                try { unlinkSync(filePath) } catch { /* already gone */ }
            }
        }
        db.prepare('DELETE FROM media WHERE id = ?').run(id)
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
        const { lastInsertRowid } = db.prepare('INSERT INTO folders (name) VALUES (?)').run(name)
        const row = db.prepare('SELECT f.id, f.name, 0 as count FROM folders f WHERE f.id = ?').get(lastInsertRowid)
        json(res, row, 201)
        return
    }

    const rows = db.prepare(`
        SELECT f.id, f.name, COUNT(m.id) as count
        FROM folders f LEFT JOIN media m ON m.folder_id = f.id
        GROUP BY f.id ORDER BY f.name
    `).all()
    json(res, rows)
}

export function handleFolder(req: Req, res: Res, db: Db, id: number): void {
    // [H4] Only allow DELETE
    if (req.method !== 'DELETE') {
        json(res, { error: 'Method not allowed' }, 405)
        return
    }
    db.prepare('UPDATE media SET folder_id = NULL WHERE folder_id = ?').run(id)
    db.prepare('DELETE FROM folders WHERE id = ?').run(id)
    res.statusCode = 204
    res.end()
}
