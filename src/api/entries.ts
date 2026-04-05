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
    data?: Record<string, unknown>
}

export async function getEntries(): Promise<Entry[]> {
    const res = await fetch('/api/field/entries')
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function getEntriesByCollection(collectionId: number): Promise<Entry[]> {
    const res = await fetch(`/api/field/collections/${collectionId}/entries`)
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function getEntry(id: number): Promise<Entry> {
    const res = await fetch(`/api/field/entries/${id}`)
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function createEntry(data: { collectionId: number; title: string; status: string; data: Record<string, unknown> }): Promise<Entry> {
    const res = await fetch('/api/field/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function updateEntry(id: number, data: { title: string; status: string; data: Record<string, unknown> }): Promise<Entry> {
    const res = await fetch(`/api/field/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function deleteEntry(id: number): Promise<void> {
    await fetch(`/api/field/entries/${id}`, { method: 'DELETE' })
}
