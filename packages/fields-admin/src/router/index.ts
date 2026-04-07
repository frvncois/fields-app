import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { checkSetup } from '@/api/setup'

const LayoutApp   = () => import('@/layouts/LayoutApp.vue')
const LayoutAuth  = () => import('@/layouts/LayoutAuth.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const EditorView  = () => import('@/views/EditorView.vue')
const ListView    = () => import('@/views/ListView.vue')
const LoginView   = () => import('@/views/LoginView.vue')
const SetupView   = () => import('@/views/SetupView.vue')

// Cache setup status — once the first user exists it can never go back to true
let setupChecked = false
let setupNeeded = false

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            component: LayoutAuth,
            children: [
                { path: '', name: 'login', component: LoginView },
            ],
        },
        {
            path: '/setup',
            component: LayoutAuth,
            children: [
                { path: '', name: 'setup', component: SetupView },
            ],
        },
        {
            path: '/',
            component: LayoutApp,
            meta: { requiresAuth: true },
            children: [
                { path: '', redirect: { name: 'dashboard' } },
                { path: 'dashboard', name: 'dashboard', component: DashboardView },
                { path: 'editor/:id?', name: 'editor', component: EditorView },
                { path: 'list/:id?', name: 'list', component: ListView },
            ],
        },
    ],
})

router.beforeEach(async (to) => {
    // Check setup status once on first navigation
    if (!setupChecked) {
        try {
            const status = await checkSetup()
            setupNeeded = status.needsSetup
        } catch { /* server not ready, proceed normally */ }
        setupChecked = true
    }

    if (setupNeeded) {
        if (to.name !== 'setup') return { name: 'setup' }
        return
    }

    if (to.name === 'setup') return { name: 'login' }

    const { isAuthenticated, fetchCurrentUser } = useAuth()
    if (to.meta.requiresAuth && !isAuthenticated.value) {
        return { name: 'login' }
    }
    if (to.name === 'login' && isAuthenticated.value) {
        return { name: 'dashboard' }
    }

    // Load role/permissions once per session (fetchCurrentUser is idempotent)
    if (isAuthenticated.value) {
        await fetchCurrentUser()
    }

})

export function markSetupComplete(): void {
    setupNeeded = false
    setupChecked = true
}

export default router
