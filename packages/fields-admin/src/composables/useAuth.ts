import { ref } from 'vue'
import { login as apiLogin, logout as apiLogout } from '@/api/auth'
import { hasAuthHint, clearAuthHint } from '@/api/client'
import { getMe } from '@/api/users'
import type { UserRole, UserPermissions } from '@/api/users'

export type { UserRole, UserPermissions }

const isAuthenticated = ref(hasAuthHint())
const role = ref<UserRole | null>(null)
const permissions = ref<UserPermissions | null>(null)
const userId = ref<number | null>(null)
const firstName = ref<string | null>(null)
const lastName = ref<string | null>(null)
const email = ref<string | null>(null)
let meFetched = false

export function useAuth() {
    /** Fetches role + permissions from /me once per session. No-op on repeat calls. */
    async function fetchCurrentUser(): Promise<void> {
        if (meFetched) return
        meFetched = true
        try {
            const me = await getMe()
            role.value = me.role
            permissions.value = me.permissions ?? null
            userId.value = me.id
            firstName.value = me.first_name
            lastName.value = me.last_name
            email.value = me.email
        } catch {
            // apiFetch handles 401 redirect; other errors are non-fatal
        }
    }

    async function login(email: string, password: string): Promise<boolean> {
        const ok = await apiLogin(email, password)
        if (ok) {
            isAuthenticated.value = true
            await fetchCurrentUser()
        }
        return ok
    }

    async function logout() {
        clearAuthHint()
        isAuthenticated.value = false
        role.value = null
        permissions.value = null
        userId.value = null
        firstName.value = null
        lastName.value = null
        email.value = null
        meFetched = false
        await apiLogout()
    }

    const isAdmin = () => role.value === 'admin'

    return { isAuthenticated, role, permissions, userId, firstName, lastName, email, isAdmin, login, logout, fetchCurrentUser }
}
