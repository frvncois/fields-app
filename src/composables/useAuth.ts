import { ref } from 'vue'
import { login as apiLogin } from '@/api/auth'
import { getToken, clearToken } from '@/api/client'

const isAuthenticated = ref(!!getToken())

export function useAuth() {
    async function login(email: string, password: string): Promise<boolean> {
        const ok = await apiLogin(email, password)
        if (!ok) return false
        isAuthenticated.value = true
        return true
    }

    function logout() {
        clearToken()
        isAuthenticated.value = false
    }

    return { isAuthenticated, login, logout }
}
