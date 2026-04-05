import type { Req, Res, Db } from './types'
import { json, readJson } from './types'

const ALLOWED_KEYS = ['user_first', 'user_last', 'user_email', 'project_name', 'dark_mode'] as const

export async function handleSettings(req: Req, res: Res, db: Db): Promise<void> {
    if (req.method === 'PATCH') {
        const body = await readJson(req)
        for (const key of ALLOWED_KEYS) {
            if (key in body) {
                db.run(
                    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
                    [key, String(body[key])]
                )
            }
        }
        json(res, { ok: true })
        return
    }

    const rows = db.query<{ key: string; value: string }>('SELECT key, value FROM settings')
    json(res, Object.fromEntries(rows.map(r => [r.key, r.value])))
}
