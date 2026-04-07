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

export type PaginatedMedia = { items: MediaItem[]; total: number; limit: number; offset: number }

export async function getMedia(params?: { folder?: string | number; limit?: number; offset?: number }): Promise<PaginatedMedia> {
    const qs = new URLSearchParams()
    if (params?.folder != null) qs.set('folder', String(params.folder))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    if (params?.offset != null) qs.set('offset', String(params.offset))
    const query = qs.toString() ? `?${qs}` : ''
    const res = await apiFetch(`/api/fields/media${query}`)
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function uploadMedia(fd: FormData): Promise<MediaItem> {
    const res = await apiFetch('/api/fields/media/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function patchMedia(id: number, folderId: number | null): Promise<MediaItem> {
    const res = await apiFetch(`/api/fields/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function deleteMedia(id: number): Promise<void> {
    await apiFetch(`/api/fields/media/${id}`, { method: 'DELETE' })
}
