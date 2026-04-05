export type Folder = {
    id: number
    name: string
    count: number
}

export async function getFolders(): Promise<Folder[]> {
    const res = await fetch('/api/field/folders')
    return res.json()
}

export async function createFolder(name: string): Promise<Folder> {
    const res = await fetch('/api/field/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    })
    return res.json()
}

export async function deleteFolder(id: number): Promise<void> {
    await fetch(`/api/field/folders/${id}`, { method: 'DELETE' })
}
