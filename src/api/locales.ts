import { apiFetch } from './client'

export type Locale = {
    code: string
    name: string
    is_current: number
}

export async function getLocales(): Promise<Locale[]> {
    const res = await apiFetch('/api/field/locales')
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function setLocale(code: string): Promise<Locale[]> {
    const res = await apiFetch(`/api/field/locales/${code}`, { method: 'PATCH' })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}
