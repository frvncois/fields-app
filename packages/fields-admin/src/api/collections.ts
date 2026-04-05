import { apiFetch } from './client'

export type Collection = {
    id: number
    name: string
    label: string
    type: 'page' | 'collection' | 'object'
    firstEntryId?: number
}

export async function getCollections(): Promise<Collection[]> {
    const res = await apiFetch('/api/fields/collections')
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}
