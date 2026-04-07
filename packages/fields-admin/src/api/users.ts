import { apiFetch } from './client'

export type UserRole = 'admin' | 'editor'

export type UserPermissions = {
    can_create: boolean
    can_edit: boolean
    can_delete: boolean
    can_publish: boolean
    can_media: boolean
    can_settings: boolean
    pages_all: boolean
    collections_all: boolean
    objects_all: boolean
    collectionGrants: number[]
    objectGrants: number[]
}

export type User = {
    id: number
    email: string
    first_name: string | null
    last_name: string | null
    role: UserRole
    // Permission columns — present even for admins (will be null from LEFT JOIN)
    can_create: number | null
    can_edit: number | null
    can_delete: number | null
    can_publish: number | null
    can_media: number | null
    can_settings: number | null
    pages_all: number | null
    collections_all: number | null
    objects_all: number | null
    collectionGrants?: number[]
    objectGrants?: number[]
}

export type CurrentUser = {
    id: number
    email: string
    first_name: string | null
    last_name: string | null
    role: UserRole
    permissions?: UserPermissions
}

export async function getMe(): Promise<CurrentUser> {
    const res = await apiFetch('/api/fields/me')
    return res.json()
}

export async function getUsers(): Promise<User[]> {
    const res = await apiFetch('/api/fields/users')
    return res.json()
}

export async function getUser(id: number): Promise<User> {
    const res = await apiFetch(`/api/fields/users/${id}`)
    return res.json()
}

export async function createUser(data: {
    email: string
    password: string
    role: UserRole
    firstName?: string
    lastName?: string
}): Promise<User> {
    const res = await apiFetch('/api/fields/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error?: string }).error ?? 'Failed to create user')
    }
    return res.json()
}

export async function updatePermissions(userId: number, permissions: UserPermissions): Promise<User> {
    const res = await apiFetch(`/api/fields/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissions),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error?: string }).error ?? 'Failed to update permissions')
    }
    return res.json()
}

export async function changeRole(userId: number, role: UserRole): Promise<User> {
    const res = await apiFetch(`/api/fields/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error?: string }).error ?? 'Failed to change role')
    }
    return res.json()
}

export async function deleteUser(userId: number): Promise<void> {
    const res = await apiFetch(`/api/fields/users/${userId}`, { method: 'DELETE' })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error?: string }).error ?? 'Failed to delete user')
    }
}
