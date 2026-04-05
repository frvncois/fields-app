import { apiFetch } from './client'

export type MediaItem = {
    id: number
    title: string
    url: string
    weight: string
    dimensions: string
    type: string
    folder_id: number | null
}

export async function getMedia(): Promise<MediaItem[]> {
    const res = await apiFetch('/api/field/media')
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function uploadMedia(fd: FormData): Promise<MediaItem> {
    const res = await apiFetch('/api/field/media/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function patchMedia(id: number, folderId: number | null): Promise<MediaItem> {
    const res = await apiFetch(`/api/field/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function deleteMedia(id: number): Promise<void> {
    await apiFetch(`/api/field/media/${id}`, { method: 'DELETE' })
}
