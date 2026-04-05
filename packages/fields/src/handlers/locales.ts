import type { Req, Res, Db } from './types'
import { json } from './types'

export function handleLocales(_req: Req, res: Res, db: Db): void {
    const rows = db.query('SELECT code, name, is_current FROM locales ORDER BY is_current DESC')
    json(res, rows)
}

export function handleSetLocale(req: Req, res: Res, db: Db, code: string): void {
    if (req.method !== 'PATCH') { json(res, { error: 'Method not allowed' }, 405); return }
    const exists = db.get('SELECT 1 FROM locales WHERE code = ?', [code])
    if (!exists) { json(res, { error: 'Not found' }, 404); return }
    db.run('UPDATE locales SET is_current = 0 WHERE is_current = 1')
    db.run('UPDATE locales SET is_current = 1 WHERE code = ?', [code])
    const rows = db.query('SELECT code, name, is_current FROM locales ORDER BY is_current DESC')
    json(res, rows)
}
