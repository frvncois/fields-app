import type { Req, Res, Db } from './types'
import { json, readJson, parseId } from './types'
import { hashSync } from 'bcryptjs'

// ─── Shared select ────────────────────────────────────────────────────────────

const USER_SELECT = `
    SELECT u.id, u.email, u.role, u.first_name, u.last_name,
           p.can_create, p.can_edit, p.can_delete, p.can_publish,
           p.can_media, p.can_settings, p.pages_all, p.collections_all, p.objects_all
    FROM users u
    LEFT JOIN user_permissions p ON p.user_id = u.id
`

function countAdmins(db: Db): number {
    return db.get<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")?.count ?? 0
}

function getUserWithGrants(db: Db, id: number): Record<string, unknown> | null {
    const row = db.get<Record<string, unknown>>(`${USER_SELECT} WHERE u.id = ?`, [id])
    if (!row) return null

    const collectionGrants = db.query<{ collection_id: number }>(
        'SELECT collection_id FROM user_collection_grants WHERE user_id = ?', [id]
    ).map(r => r.collection_id)

    const objectGrants = db.query<{ collection_id: number }>(
        'SELECT collection_id FROM user_object_grants WHERE user_id = ?', [id]
    ).map(r => r.collection_id)

    return { ...row, collectionGrants, objectGrants }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

function handleListUsers(_req: Req, res: Res, db: Db): void {
    const rows = db.query<Record<string, unknown>>(`${USER_SELECT} ORDER BY u.id`)
    json(res, rows)
}

async function handleCreateUser(req: Req, res: Res, db: Db): Promise<void> {
    const body = await readJson(req)

    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!email || !email.includes('@')) {
        json(res, { error: 'Valid email required' }, 400); return
    }

    const password = typeof body.password === 'string' ? body.password : ''
    if (password.length < 8 || password.length > 128) {
        json(res, { error: 'Password must be between 8 and 128 characters' }, 400); return
    }

    const role = body.role === 'admin' ? 'admin' : 'editor'
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() || null : null
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() || null : null

    try {
        const { lastInsertRowid } = db.run(
            'INSERT INTO users (email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [email, hashSync(password, 12), role, firstName, lastName]
        )
        const newId = Number(lastInsertRowid)

        // Always create an empty permissions row so editors start with zero access
        db.run('INSERT OR IGNORE INTO user_permissions (user_id) VALUES (?)', [newId])

        json(res, getUserWithGrants(db, newId), 201)
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('UNIQUE')) {
            json(res, { error: 'Email already in use' }, 409); return
        }
        throw err
    }
}

function handleGetUser(_req: Req, res: Res, db: Db, id: number): void {
    const row = getUserWithGrants(db, id)
    if (!row) { json(res, { error: 'Not found' }, 404); return }
    json(res, row)
}

async function handleUpdatePermissions(req: Req, res: Res, db: Db, id: number): Promise<void> {
    const user = db.get<{ role: string }>('SELECT role FROM users WHERE id = ?', [id])
    if (!user) { json(res, { error: 'Not found' }, 404); return }
    if (user.role !== 'editor') {
        json(res, { error: 'Permissions only apply to editor users' }, 400); return
    }

    const body = await readJson(req)
    const flag = (k: string): number => body[k] ? 1 : 0

    db.run(`
        INSERT INTO user_permissions
            (user_id, can_create, can_edit, can_delete, can_publish, can_media, can_settings, pages_all, collections_all, objects_all)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            can_create      = excluded.can_create,
            can_edit        = excluded.can_edit,
            can_delete      = excluded.can_delete,
            can_publish     = excluded.can_publish,
            can_media       = excluded.can_media,
            can_settings    = excluded.can_settings,
            pages_all       = excluded.pages_all,
            collections_all = excluded.collections_all,
            objects_all     = excluded.objects_all
    `, [
        id,
        flag('can_create'), flag('can_edit'), flag('can_delete'), flag('can_publish'),
        flag('can_media'), flag('can_settings'),
        flag('pages_all'), flag('collections_all'), flag('objects_all'),
    ])

    // Replace collection grants
    db.run('DELETE FROM user_collection_grants WHERE user_id = ?', [id])
    if (Array.isArray(body.collectionGrants)) {
        for (const cid of body.collectionGrants as unknown[]) {
            const n = Number(cid)
            if (Number.isInteger(n) && n > 0) {
                db.run('INSERT OR IGNORE INTO user_collection_grants (user_id, collection_id) VALUES (?, ?)', [id, n])
            }
        }
    }

    // Replace object grants
    db.run('DELETE FROM user_object_grants WHERE user_id = ?', [id])
    if (Array.isArray(body.objectGrants)) {
        for (const cid of body.objectGrants as unknown[]) {
            const n = Number(cid)
            if (Number.isInteger(n) && n > 0) {
                db.run('INSERT OR IGNORE INTO user_object_grants (user_id, collection_id) VALUES (?, ?)', [id, n])
            }
        }
    }

    json(res, getUserWithGrants(db, id))
}

async function handleChangeRole(req: Req, res: Res, db: Db, id: number): Promise<void> {
    const body = await readJson(req)
    const newRole = body.role === 'admin' ? 'admin' : 'editor'

    const user = db.get<{ role: string }>('SELECT role FROM users WHERE id = ?', [id])
    if (!user) { json(res, { error: 'Not found' }, 404); return }

    if (user.role === 'admin' && newRole === 'editor' && countAdmins(db) <= 1) {
        json(res, { error: 'Cannot demote the last admin' }, 409); return
    }

    db.run('UPDATE users SET role = ? WHERE id = ?', [newRole, id])

    // Ensure permissions row exists if demoted to editor
    if (newRole === 'editor') {
        db.run('INSERT OR IGNORE INTO user_permissions (user_id) VALUES (?)', [id])
    }

    json(res, getUserWithGrants(db, id))
}

function handleDeleteUser(_req: Req, res: Res, db: Db, id: number, currentUserId: number): void {
    if (id === currentUserId) {
        json(res, { error: 'Cannot delete your own account' }, 409); return
    }

    const user = db.get<{ role: string }>('SELECT role FROM users WHERE id = ?', [id])
    if (!user) { json(res, { error: 'Not found' }, 404); return }

    if (user.role === 'admin' && countAdmins(db) <= 1) {
        json(res, { error: 'Cannot delete the last admin' }, 409); return
    }

    db.run('DELETE FROM users WHERE id = ?', [id])
    res.statusCode = 204
    res.end()
}

// ─── Router ───────────────────────────────────────────────────────────────────

export async function handleUsers(req: Req, res: Res, db: Db, path: string, currentUserId: number): Promise<void> {
    if (path === '/users' || path === '/users/') {
        if (req.method === 'GET') { handleListUsers(req, res, db); return }
        if (req.method === 'POST') { await handleCreateUser(req, res, db); return }
        res.setHeader('Allow', 'GET, POST')
        json(res, { error: 'Method not allowed' }, 405)
        return
    }

    const singleMatch = path.match(/^\/users\/(\d+)$/)
    if (singleMatch) {
        const id = parseId(singleMatch[1])
        if (!id) { json(res, { error: 'Invalid ID' }, 400); return }
        if (req.method === 'GET') { handleGetUser(req, res, db, id); return }
        if (req.method === 'DELETE') { handleDeleteUser(req, res, db, id, currentUserId); return }
        res.setHeader('Allow', 'GET, DELETE')
        json(res, { error: 'Method not allowed' }, 405)
        return
    }

    const permMatch = path.match(/^\/users\/(\d+)\/permissions$/)
    if (permMatch) {
        const id = parseId(permMatch[1])
        if (!id) { json(res, { error: 'Invalid ID' }, 400); return }
        if (req.method === 'PUT') { await handleUpdatePermissions(req, res, db, id); return }
        res.setHeader('Allow', 'PUT')
        json(res, { error: 'Method not allowed' }, 405)
        return
    }

    const roleMatch = path.match(/^\/users\/(\d+)\/role$/)
    if (roleMatch) {
        const id = parseId(roleMatch[1])
        if (!id) { json(res, { error: 'Invalid ID' }, 400); return }
        if (req.method === 'PATCH') { await handleChangeRole(req, res, db, id); return }
        res.setHeader('Allow', 'PATCH')
        json(res, { error: 'Method not allowed' }, 405)
        return
    }

    json(res, { error: 'Not found' }, 404)
}
