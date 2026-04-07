import { apiFetch } from './client'

export type Entry = {
    id: number
    title: string
    slug: string
    type: string
    category: 'page' | 'collection' | 'object'
    status: 'draft' | 'published'
    createdAt: string
    updatedAt: string
    collectionName: string
    ogImage?: string
    locale: string
    translationKey?: string
    data?: Record<string, unknown>
}

export type PaginatedEntries = { items: Entry[]; total: number; limit: number; offset: number }

export async function getEntries(params?: { limit?: number; offset?: number }): Promise<PaginatedEntries> {
    const qs = params ? `?limit=${params.limit ?? 200}&offset=${params.offset ?? 0}` : ''
    const res = await apiFetch(`/api/fields/entries${qs}`)
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function getEntriesByCollection(collectionId: number): Promise<Entry[]> {
    const res = await apiFetch(`/api/fields/collections/${collectionId}/entries`)
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function getEntry(id: number): Promise<Entry> {
    const res = await apiFetch(`/api/fields/entries/${id}`)
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function createEntry(data: { collectionId: number; title: string; status: string; data: Record<string, unknown> }): Promise<Entry> {
    const res = await apiFetch('/api/fields/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function updateEntry(id: number, data: { title: string; status: string; data: Record<string, unknown> }): Promise<Entry> {
    const res = await apiFetch(`/api/fields/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function createTranslation(id: number, locale: string): Promise<Entry> {
    const res = await apiFetch(`/api/fields/entries/${id}/translate/${locale}`, { method: 'POST' })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function patchEntry(id: number, data: { status: 'draft' | 'published' }): Promise<Entry> {
    const res = await apiFetch(`/api/fields/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function deleteEntry(id: number): Promise<void> {
    await apiFetch(`/api/fields/entries/${id}`, { method: 'DELETE' })
}
