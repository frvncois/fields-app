import type { Req, Res, Db } from './types'
import { json } from './types'

export function handleCollections(_req: Req, res: Res, db: Db): void {
    const rows = db.query(`
        SELECT c.*, e.id AS firstEntryId
        FROM collections c
        LEFT JOIN entries e ON e.collection_name = c.name AND c.type = 'page'
        GROUP BY c.id
        ORDER BY c.type, c.label
    `)
    json(res, rows)
}
