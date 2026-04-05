import { ref } from 'vue'
import { login as apiLogin } from '@/api/auth'

const isAuthenticated = ref(!!localStorage.getItem('fields_auth'))

export function useAuth() {
    async function login(email: string, password: string): Promise<boolean> {
        const ok = await apiLogin(email, password)
        if (!ok) return false
        localStorage.setItem('fields_auth', '1')
        isAuthenticated.value = true
        return true
    }

    function logout() {
        localStorage.removeItem('fields_auth')
        isAuthenticated.value = false
    }

    return { isAuthenticated, login, logout }
}
