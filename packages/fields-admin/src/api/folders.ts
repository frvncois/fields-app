import { apiFetch } from './client'

export type Folder = {
    id: number
    name: string
    count: number
}

export async function getFolders(): Promise<Folder[]> {
    const res = await apiFetch('/api/fields/folders')
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function createFolder(name: string): Promise<Folder> {
    const res = await apiFetch('/api/fields/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function deleteFolder(id: number): Promise<void> {
    await apiFetch(`/api/fields/folders/${id}`, { method: 'DELETE' })
}
