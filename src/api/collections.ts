export type Collection = {
    id: number
    name: string
    label: string
    type: 'page' | 'collection' | 'object'
    firstEntryId?: number
}

export async function getCollections(): Promise<Collection[]> {
    const res = await fetch('/api/field/collections')
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}
