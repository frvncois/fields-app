import type { Req, Res, Db } from './types'
import { json } from './types'

export function handleLocales(_req: Req, res: Res, db: Db): void {
    const rows = db.prepare('SELECT code, name, is_current FROM locales ORDER BY is_current DESC').all()
    json(res, rows)
}

export function handleSetLocale(req: Req, res: Res, db: Db, code: string): void {
    if (req.method !== 'PATCH') { json(res, { error: 'Method not allowed' }, 405); return }
    const exists = db.prepare('SELECT 1 FROM locales WHERE code = ?').get(code)
    if (!exists) { json(res, { error: 'Not found' }, 404); return }
    db.prepare('UPDATE locales SET is_current = 0').run()
    db.prepare('UPDATE locales SET is_current = 1 WHERE code = ?').run(code)
    const rows = db.prepare('SELECT code, name, is_current FROM locales ORDER BY is_current DESC').all()
    json(res, rows)
}
