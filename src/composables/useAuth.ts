import { ref } from 'vue'
import { login as apiLogin, logout as apiLogout } from '@/api/auth'
import { hasAuthHint, clearAuthHint } from '@/api/client'

const isAuthenticated = ref(hasAuthHint())

export function useAuth() {
    async function login(email: string, password: string): Promise<boolean> {
        const ok = await apiLogin(email, password)
        if (ok) isAuthenticated.value = true
        return ok
    }

    async function logout() {
        clearAuthHint()
        isAuthenticated.value = false
        await apiLogout()
    }

    return { isAuthenticated, login, logout }
}
