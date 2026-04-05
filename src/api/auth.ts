import { apiFetch, setToken } from './client'

export async function login(email: string, password: string): Promise<boolean> {
    const res = await fetch('/api/field/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return false
    const { token } = await res.json()
    setToken(token)
    return true
}

export async function changePassword(password: string): Promise<boolean> {
    const res = await apiFetch('/api/field/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    })
    return res.ok
}
