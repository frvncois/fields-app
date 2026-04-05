export async function login(email: string, password: string): Promise<boolean> {
    const res = await fetch('/api/field/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
    return res.ok
}

export async function changePassword(password: string): Promise<boolean> {
    const res = await fetch('/api/field/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    })
    return res.ok
}
