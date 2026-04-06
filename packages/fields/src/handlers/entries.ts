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
    const row = db.get<{ code: string }>('SELECT code FROM locales WHERE is_current = 1 LIMIT 1')
    return row?.code ?? 'en'
}

function randomKey(): string {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

function toSlug(db: Db, collectionName: string, title: string): string {
    const col = db.get<{ type: string }>('SELECT type FROM collections WHERE name = ?', [collectionName])
    const base = title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    const prefix = col?.type === 'page' ? '' : `/${collectionName}`
    let slug = `${prefix}/${base}`
    let i = 2
    while (db.get('SELECT 1 FROM entries WHERE slug = ?', [slug])) {
        slug = `${prefix}/${base}-${i++}`
    }
    return slug
}

export async function handleEntries(req: Req, res: Res, db: Db): Promise<void> {
    if (req.method === 'POST') {
        const body = await readJson(req)
        const col = db.get<{ name: string }>(
            'SELECT name FROM collections WHERE id = ?', [body.collectionId]
        )
        if (!col) { json(res, { error: 'Bad request' }, 400); return }

        const slug = toSlug(db, col.name, String(body.title))
        const status = body.status === 'published' ? 'published' : 'draft'
        const data = JSON.stringify(body.data ?? {})
        const locale = currentLocale(db)
        const translationKey = randomKey()

        const { lastInsertRowid } = db.run(
            'INSERT INTO entries (collection_name, title, slug, status, data, locale, translation_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [col.name, String(body.title), slug, status, data, locale, translationKey]
        )

        const row = db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [Number(lastInsertRowid)])
        json(res, row, 201)
        return
    }

    const locale = currentLocale(db)
    const rows = db.query(`${ENTRY_SELECT} WHERE e.locale = ? ORDER BY e.updated_at DESC`, [locale])
    json(res, rows)
}

export async function handleEntry(req: Req, res: Res, db: Db, id: number): Promise<void> {
    if (req.method === 'PUT') {
        const body = await readJson(req)
        const status = body.status === 'published' ? 'published' : 'draft'
        const data = JSON.stringify(body.data ?? {})
        db.run(
            `UPDATE entries SET title = ?, status = ?, data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`,
            [String(body.title), status, data, id]
        )
        const row = db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [id])
        json(res, row)
        return
    }

    if (req.method === 'PATCH') {
        const body = await readJson(req)
        const status = body.status === 'published' ? 'published' : 'draft'
        db.run(
            `UPDATE entries SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`,
            [status, id]
        )
        const row = db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [id])
        json(res, row)
        return
    }

    if (req.method === 'DELETE') {
        db.run('DELETE FROM entries WHERE id = ?', [id])
        res.statusCode = 204
        res.end()
        return
    }

    const row = db.get<Record<string, unknown>>(`${ENTRY_SELECT} WHERE e.id = ?`, [id])
    if (!row) { json(res, { error: 'Not found' }, 404); return }

    const dataRow = db.get<{ data: string }>('SELECT data FROM entries WHERE id = ?', [id])
    row.data = dataRow?.data ? JSON.parse(dataRow.data) : {}
    json(res, row)
}

export function handleCollectionEntries(req: Req, res: Res, db: Db, collectionId: number): void {
    const col = db.get<{ name: string }>(
        'SELECT name FROM collections WHERE id = ?', [collectionId]
    )
    if (!col) { json(res, { error: 'Bad request' }, 400); return }

    const locale = currentLocale(db)
    const rows = db.query(
        `${ENTRY_SELECT} WHERE e.collection_name = ? AND e.locale = ? ORDER BY e.updated_at DESC`,
        [col.name, locale]
    )
    json(res, rows)
}

export async function handleTranslateEntry(req: Req, res: Res, db: Db, id: number, targetLocale: string): Promise<void> {
    if (req.method !== 'POST') { json(res, { error: 'Method not allowed' }, 405); return }

    const validLocale = db.get('SELECT 1 FROM locales WHERE code = ?', [targetLocale])
    if (!validLocale) { json(res, { error: 'Unknown locale' }, 400); return }

    const source = db.get<Record<string, unknown>>('SELECT * FROM entries WHERE id = ?', [id])
    if (!source) { json(res, { error: 'Not found' }, 404); return }

    let translationKey = source.translation_key as string | null
    if (!translationKey) {
        translationKey = randomKey()
        db.run('UPDATE entries SET translation_key = ? WHERE id = ?', [translationKey, id])
    }

    const existing = db.get<{ id: number }>(
        'SELECT id FROM entries WHERE translation_key = ? AND locale = ?',
        [translationKey, targetLocale]
    )

    if (existing) {
        const row = db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [existing.id])
        json(res, row)
        return
    }

    const slug = toSlug(db, source.collection_name as string, `${source.title}-${targetLocale}`)
    const { lastInsertRowid } = db.run(
        'INSERT INTO entries (collection_name, title, slug, status, data, locale, translation_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [source.collection_name, source.title, slug, 'draft', source.data, targetLocale, translationKey]
    )

    const row = db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [Number(lastInsertRowid)])
    json(res, row, 201)
}
