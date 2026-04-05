import type { Req, Res, Db } from './types'
import { json } from './types'

export function handleLocales(_req: Req, res: Res, db: Db): void {
    const rows = db.prepare('SELECT code, name, is_current FROM locales ORDER BY is_current DESC').all()
    json(res, rows)
}
