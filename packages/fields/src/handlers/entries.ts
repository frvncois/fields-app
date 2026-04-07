import { randomBytes } from 'node:crypto'
import type { Req, Res, Db } from './types'
import { json, readJson } from './types'
import type { UserContext, UserPermissions } from '../types'

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
    return randomBytes(8).toString('hex')
}

// ─── Permission helpers ───────────────────────────────────────────────────────

function canAccessCollection(col: { id: number; type: string }, perms: UserPermissions): boolean {
    if (col.type === 'page') return perms.pages_all
    if (col.type === 'collection') return perms.collections_all || perms.collectionGrants.has(col.id)
    if (col.type === 'object') return perms.objects_all || perms.objectGrants.has(col.id)
    return false
}

/** Build a WHERE clause fragment that limits results to collections the editor can access. */
function buildScopeWhere(perms: UserPermissions): { clause: string; params: unknown[] } {
    const conds: string[] = []
    const params: unknown[] = []

    if (perms.pages_all) conds.push("c.type = 'page'")

    if (perms.collections_all) {
        conds.push("c.type = 'collection'")
    } else if (perms.collectionGrants.size > 0) {
        conds.push(`(c.type = 'collection' AND c.id IN (${[...perms.collectionGrants].map(() => '?').join(', ')}))`)
        params.push(...perms.collectionGrants)
    }

    if (perms.objects_all) {
        conds.push("c.type = 'object'")
    } else if (perms.objectGrants.size > 0) {
        conds.push(`(c.type = 'object' AND c.id IN (${[...perms.objectGrants].map(() => '?').join(', ')}))`)
        params.push(...perms.objectGrants)
    }

    if (conds.length === 0) return { clause: '1 = 0', params: [] }
    return { clause: `(${conds.join(' OR ')})`, params }
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
    // [A5] Cap iterations to prevent an authenticated DoS via thousands of same-titled entries
    let i = 2
    while (i <= 100 && db.get('SELECT 1 FROM entries WHERE slug = ?', [slug])) {
        slug = `${prefix}/${base}-${i++}`
    }
    return slug
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function handleEntries(req: Req, res: Res, db: Db, ctx: UserContext): Promise<void> {
    if (req.method === 'POST') {
        const body = await readJson(req)

        if (ctx.role === 'editor') {
            const perms = ctx.permissions!
            if (!perms.can_create) { json(res, { error: 'Forbidden' }, 403); return }

            // Scope check — look up the target collection
            const col = db.get<{ id: number; type: string }>(
                'SELECT id, type FROM collections WHERE id = ?', [body.collectionId]
            )
            if (col && !canAccessCollection(col, perms)) {
                json(res, { error: 'Forbidden' }, 403); return
            }
        }

        const col = db.get<{ name: string }>(
            'SELECT name FROM collections WHERE id = ?', [body.collectionId]
        )
        if (!col) { json(res, { error: 'Bad request' }, 400); return }

        const title = typeof body.title === 'string' ? body.title.trim() : ''
        if (!title || title.length > 500) {
            json(res, { error: 'Title must be 1–500 characters' }, 400)
            return
        }

        const status = body.status === 'published' ? 'published' : 'draft'
        const data = JSON.stringify(body.data ?? {})
        const locale = currentLocale(db)
        const translationKey = randomKey()

        // [M4] Retry on UNIQUE constraint violation — slug uniqueness check and INSERT are not atomic
        let insertedRow
        let attempts = 0
        while (!insertedRow && attempts++ < 10) {
            const slug = toSlug(db, col.name, title)
            try {
                const { lastInsertRowid } = db.run(
                    'INSERT INTO entries (collection_name, title, slug, status, data, locale, translation_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [col.name, title, slug, status, data, locale, translationKey]
                )
                insertedRow = db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [Number(lastInsertRowid)])
            } catch (err: unknown) {
                if (!(err instanceof Error) || !err.message.includes('UNIQUE')) throw err
            }
        }
        if (!insertedRow) {
            json(res, { error: 'Could not generate unique slug' }, 409)
            return
        }

        json(res, insertedRow, 201)
        return
    }

    const locale = currentLocale(db)
    const qs = new URLSearchParams(req.url!.split('?')[1] ?? '')
    const limit = Math.min(Math.max(parseInt(qs.get('limit') ?? '200', 10) || 200, 1), 1000)
    const offset = Math.max(parseInt(qs.get('offset') ?? '0', 10) || 0, 0)

    if (ctx.role === 'editor') {
        const { clause, params } = buildScopeWhere(ctx.permissions!)
        const total = (db.get<{ n: number }>(
            `SELECT COUNT(*) as n FROM entries e JOIN collections c ON c.name = e.collection_name WHERE e.locale = ? AND ${clause}`,
            [locale, ...params]
        ))?.n ?? 0
        const rows = db.query(
            `${ENTRY_SELECT} WHERE e.locale = ? AND ${clause} ORDER BY e.updated_at DESC LIMIT ? OFFSET ?`,
            [locale, ...params, limit, offset]
        )
        json(res, { items: rows, total, limit, offset })
        return
    }

    const total = (db.get<{ n: number }>(
        `SELECT COUNT(*) as n FROM entries e JOIN collections c ON c.name = e.collection_name WHERE e.locale = ?`,
        [locale]
    ))?.n ?? 0
    const rows = db.query(`${ENTRY_SELECT} WHERE e.locale = ? ORDER BY e.updated_at DESC LIMIT ? OFFSET ?`, [locale, limit, offset])
    json(res, { items: rows, total, limit, offset })
}

export async function handleEntry(req: Req, res: Res, db: Db, id: number, ctx: UserContext): Promise<void> {
    if (req.method === 'PUT') {
        const body = await readJson(req)
        const title = typeof body.title === 'string' ? body.title.trim() : ''
        if (!title || title.length > 500) {
            json(res, { error: 'Title must be 1–500 characters' }, 400)
            return
        }
        const newStatus = body.status === 'published' ? 'published' : 'draft'
        const data = JSON.stringify(body.data ?? {})

        if (ctx.role === 'editor') {
            const perms = ctx.permissions!
            if (!perms.can_edit) { json(res, { error: 'Forbidden' }, 403); return }

            const current = db.get<{ col_id: number; col_type: string; status: string }>(
                `SELECT c.id AS col_id, c.type AS col_type, e.status
                 FROM entries e JOIN collections c ON c.name = e.collection_name
                 WHERE e.id = ?`, [id]
            )
            if (!current) { json(res, { error: 'Not found' }, 404); return }
            if (!canAccessCollection({ id: current.col_id, type: current.col_type }, perms)) {
                json(res, { error: 'Not found' }, 404); return
            }
            if (newStatus !== current.status && !perms.can_publish) {
                json(res, { error: 'Forbidden: cannot change status' }, 403); return
            }
        }

        // Persist slug if the user changed it in the editor sidebar
        const bodyData = body.data as Record<string, unknown> | undefined
        const desiredSlug = typeof bodyData?._slug === 'string' ? (bodyData._slug as string).trim() : null
        const currentSlug = db.get<{ slug: string }>('SELECT slug FROM entries WHERE id = ?', [id])?.slug
        let newSlug = currentSlug

        if (desiredSlug && desiredSlug !== currentSlug) {
            // Sanitize: keep only safe path characters, ensure it starts with /
            const sanitized = '/' + desiredSlug
                .replace(/^\/+/, '')
                .toLowerCase()
                .replace(/[^a-z0-9/\-]/g, '')
                .replace(/-+/g, '-')
                .replace(/\/+/g, '/')
                .replace(/^-|-$/g, '')
            if (sanitized.length > 1) {
                const taken = db.get('SELECT 1 FROM entries WHERE slug = ? AND id != ?', [sanitized, id])
                if (taken) {
                    json(res, { error: 'Slug already in use' }, 409); return
                }
                newSlug = sanitized
            }
        }

        db.run(
            `UPDATE entries SET title = ?, status = ?, data = ?, slug = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`,
            [title, newStatus, data, newSlug, id]
        )
        const row = db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [id])
        if (!row) { json(res, { error: 'Not found' }, 404); return }
        json(res, row)
        return
    }

    if (req.method === 'PATCH') {
        const body = await readJson(req)
        const status = body.status === 'published' ? 'published' : 'draft'

        if (ctx.role === 'editor') {
            const perms = ctx.permissions!
            // PATCH is exclusively for status changes
            if (!perms.can_publish) { json(res, { error: 'Forbidden' }, 403); return }

            const col = db.get<{ id: number; type: string }>(
                `SELECT c.id, c.type FROM collections c
                 JOIN entries e ON e.collection_name = c.name WHERE e.id = ?`, [id]
            )
            if (!col || !canAccessCollection(col, perms)) { json(res, { error: 'Not found' }, 404); return }
        }

        db.run(
            `UPDATE entries SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`,
            [status, id]
        )
        const row = db.get(`${ENTRY_SELECT} WHERE e.id = ?`, [id])
        if (!row) { json(res, { error: 'Not found' }, 404); return }
        json(res, row)
        return
    }

    if (req.method === 'DELETE') {
        if (ctx.role === 'editor') {
            const perms = ctx.permissions!
            if (!perms.can_delete) { json(res, { error: 'Forbidden' }, 403); return }

            const col = db.get<{ id: number; type: string }>(
                `SELECT c.id, c.type FROM collections c
                 JOIN entries e ON e.collection_name = c.name WHERE e.id = ?`, [id]
            )
            if (!col || !canAccessCollection(col, perms)) { json(res, { error: 'Not found' }, 404); return }
        }

        db.run('DELETE FROM entries WHERE id = ?', [id])
        res.statusCode = 204
        res.end()
        return
    }

    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, PUT, PATCH, DELETE')
        json(res, { error: 'Method not allowed' }, 405)
        return
    }

    const row = db.get<Record<string, unknown>>(`${ENTRY_SELECT} WHERE e.id = ?`, [id])
    if (!row) { json(res, { error: 'Not found' }, 404); return }

    if (ctx.role === 'editor') {
        const col = db.get<{ id: number; type: string }>(
            `SELECT c.id, c.type FROM collections c
             JOIN entries e ON e.collection_name = c.name WHERE e.id = ?`, [id]
        )
        if (!col || !canAccessCollection(col, ctx.permissions!)) {
            json(res, { error: 'Not found' }, 404); return
        }
    }

    const dataRow = db.get<{ data: string }>('SELECT data FROM entries WHERE id = ?', [id])
    row.data = dataRow?.data ? JSON.parse(dataRow.data) : {}
    json(res, row)
}

export function handleCollectionEntries(req: Req, res: Res, db: Db, collectionId: number, ctx: UserContext): void {
    const col = db.get<{ name: string; id: number; type: string }>(
        'SELECT name, id, type FROM collections WHERE id = ?', [collectionId]
    )
    if (!col) { json(res, { error: 'Bad request' }, 400); return }

    if (ctx.role === 'editor' && !canAccessCollection(col, ctx.permissions!)) {
        json(res, { error: 'Not found' }, 404); return
    }

    const locale = currentLocale(db)
    const rows = db.query(
        `${ENTRY_SELECT} WHERE e.collection_name = ? AND e.locale = ? ORDER BY e.updated_at DESC`,
        [col.name, locale]
    )
    json(res, rows)
}

export async function handleTranslateEntry(req: Req, res: Res, db: Db, id: number, targetLocale: string, ctx: UserContext): Promise<void> {
    if (req.method !== 'POST') { json(res, { error: 'Method not allowed' }, 405); return }

    if (ctx.role === 'editor') {
        const perms = ctx.permissions!
        if (!perms.can_create) { json(res, { error: 'Forbidden' }, 403); return }

        const col = db.get<{ id: number; type: string }>(
            `SELECT c.id, c.type FROM collections c
             JOIN entries e ON e.collection_name = c.name WHERE e.id = ?`, [id]
        )
        if (!col || !canAccessCollection(col, perms)) { json(res, { error: 'Not found' }, 404); return }
    }

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
