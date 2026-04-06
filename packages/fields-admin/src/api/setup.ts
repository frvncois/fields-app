export async function checkSetup(): Promise<{ needsSetup: boolean }> {
    const res = await fetch('/api/fields/setup')
    if (!res.ok) return { needsSetup: false }
    return res.json()
}

export async function createAdmin(projectName: string, firstName: string, lastName: string, email: string, password: string): Promise<boolean> {
    const res = await fetch('/api/fields/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, firstName, lastName, email, password }),
        credentials: 'include',
    })
    return res.ok
}
