const AUTH_HINT = 'fields_auth'

export function setAuthHint(): void {
    localStorage.setItem(AUTH_HINT, '1')
}

export function clearAuthHint(): void {
    localStorage.removeItem(AUTH_HINT)
}

export function hasAuthHint(): boolean {
    return localStorage.getItem(AUTH_HINT) === '1'
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(input, { ...init, credentials: 'include' })

    if (res.status === 401 && !window.location.pathname.startsWith('/fields/login')) {
        clearAuthHint()
        window.location.href = '/fields/login'
    }

    return res
}
