import type { Req, Res, Db } from './types'
import { json } from './types'
import type { UserContext, UserPermissions } from '../types'

const BASE_QUERY = `
    SELECT c.*, e.id AS firstEntryId
    FROM collections c
    LEFT JOIN entries e ON e.collection_name = c.name AND c.type = 'page'
`

function buildEditorWhere(perms: UserPermissions): { clause: string; params: unknown[] } {
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

export function handleCollections(_req: Req, res: Res, db: Db, ctx: UserContext): void {
    if (ctx.role === 'editor') {
        const { clause, params } = buildEditorWhere(ctx.permissions!)
        const rows = db.query(
            `${BASE_QUERY} WHERE ${clause} GROUP BY c.id ORDER BY c.type, c.label`,
            params
        )
        json(res, rows)
        return
    }

    const rows = db.query(`${BASE_QUERY} GROUP BY c.id ORDER BY c.type, c.label`)
    json(res, rows)
}
