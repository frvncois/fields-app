import { apiFetch, setAuthHint } from './client'

export async function login(email: string, password: string): Promise<boolean> {
    const res = await fetch('/api/fields/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
    })
    if (res.ok) setAuthHint()
    return res.ok
}

export async function logout(): Promise<void> {
    await apiFetch('/api/fields/auth/logout', { method: 'POST' })
    window.location.href = '/fields/login'
}

export async function changePassword(currentPassword: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const res = await apiFetch('/api/fields/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, password }),
    })
    if (res.ok) return { ok: true }
    const body = await res.json().catch(() => ({})) as { error?: string }
    return { ok: false, error: body.error }
}
