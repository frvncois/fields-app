export async function getSettings(): Promise<Record<string, string>> {
    const res = await fetch('/api/field/settings')
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}

export async function patchSettings(data: Record<string, string>): Promise<void> {
    await fetch('/api/field/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
}
