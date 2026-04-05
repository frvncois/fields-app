import type { Req, Res, Db } from './types'
import { json, readJson } from './types'

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
        e.collection_name AS collectionName,
        json_extract(e.data, '$._ogImage') AS ogImage,
        e.locale,
        e.translation_key AS translationKey
    FROM entries e
    JOIN collections c ON c.name = e.collection_name
`

function currentLocale(db: Db): string {
    const row = db.prepare(`SELECT code FROM locales WHERE is_current = 1 LIMIT 1`).get() as { code: string } | undefined
    return row?.code ?? 'en'
}

function randomKey(): string {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

function toSlug(db: Db, collectionName: string, title: string): string {
    const base = title.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    let slug = `/${collectionName}/${base}`
    let i = 2
    while (db.prepare('SELECT 1 FROM entries WHERE slug = ?').get(slug)) {
        slug = `/${collectionName}/${base}-${i++}`
    }
    return slug
}

export async function handleEntries(req: Req, res: Res, db: Db): Promise<void> {
    if (req.method === 'POST') {
        const body = await readJson(req)
        const col = db.prepare('SELECT name FROM collections WHERE id = ?')
            .get(body.collectionId) as { name: string } | undefined
        if (!col) { json(res, { error: 'Unknown collection' }, 400); return }

        const slug = toSlug(db, col.name, String(body.title))
        const status = body.status === 'published' ? 'published' : 'draft'
        const data = JSON.stringify(body.data ?? {})

        const locale = currentLocale(db)
        const translationKey = randomKey()
        const { lastInsertRowid } = db.prepare(
            'INSERT INTO entries (collection_name, title, slug, status, data, locale, translation_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(col.name, String(body.title), slug, status, data, locale, translationKey)

        const row = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(lastInsertRowid)
        json(res, row, 201)
        return
    }

    const locale = currentLocale(db)
    const rows = db.prepare(`${ENTRY_SELECT} WHERE e.locale = ? ORDER BY e.updated_at DESC`).all(locale)
    json(res, rows)
}

export async function handleEntry(req: Req, res: Res, db: Db, id: number): Promise<void> {
    if (req.method === 'PUT') {
        const body = await readJson(req)
        const status = body.status === 'published' ? 'published' : 'draft'
        const data = JSON.stringify(body.data ?? {})
        db.prepare(
            `UPDATE entries SET title = ?, status = ?, data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
        ).run(String(body.title), status, data, id)
        const row = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(id)
        json(res, row)
        return
    }

    if (req.method === 'PATCH') {
        const body = await readJson(req)
        const status = body.status === 'published' ? 'published' : 'draft'
        db.prepare(
            `UPDATE entries SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
        ).run(status, id)
        const row = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(id)
        json(res, row)
        return
    }

    if (req.method === 'DELETE') {
        db.prepare('DELETE FROM entries WHERE id = ?').run(id)
        res.statusCode = 204
        res.end()
        return
    }

    const row = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(id) as Record<string, unknown> | undefined
    if (!row) { json(res, { error: 'Not found' }, 404); return }

    const dataRow = db.prepare('SELECT data FROM entries WHERE id = ?').get(id) as { data: string }
    row.data = dataRow?.data ? JSON.parse(dataRow.data) : {}
    json(res, row)
}

export function handleCollectionEntries(req: Req, res: Res, db: Db, collectionId: number): void {
    const col = db.prepare('SELECT name FROM collections WHERE id = ?')
        .get(collectionId) as { name: string } | undefined
    if (!col) { json(res, { error: 'Not found' }, 404); return }

    const locale = currentLocale(db)
    const rows = db.prepare(
        `${ENTRY_SELECT} WHERE e.collection_name = ? AND e.locale = ? ORDER BY e.updated_at DESC`
    ).all(col.name, locale)
    json(res, rows)
}

export async function handleTranslateEntry(req: Req, res: Res, db: Db, id: number, targetLocale: string): Promise<void> {
    if (req.method !== 'POST') { json(res, { error: 'Method not allowed' }, 405); return }

    const source = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!source) { json(res, { error: 'Not found' }, 404); return }

    // Ensure source has a translation_key
    let translationKey = source.translation_key as string | null
    if (!translationKey) {
        translationKey = randomKey()
        db.prepare('UPDATE entries SET translation_key = ? WHERE id = ?').run(translationKey, id)
    }

    // Check if translation already exists
    const existing = db.prepare(
        'SELECT id FROM entries WHERE translation_key = ? AND locale = ?'
    ).get(translationKey, targetLocale) as { id: number } | undefined

    if (existing) {
        const row = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(existing.id)
        json(res, row)
        return
    }

    // Create translation (copy title + data from source, mark as draft)
    const slug = toSlug(db, source.collection_name as string, `${source.title}-${targetLocale}`)
    const { lastInsertRowid } = db.prepare(
        'INSERT INTO entries (collection_name, title, slug, status, data, locale, translation_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(source.collection_name, source.title, slug, 'draft', source.data, targetLocale, translationKey)

    const row = db.prepare(`${ENTRY_SELECT} WHERE e.id = ?`).get(lastInsertRowid)
    json(res, row, 201)
}
