import { createRouter, createWebHistory } from 'vue-router'
import LayoutApp from '@/layouts/LayoutApp.vue'
import LayoutAuth from '@/layouts/LayoutAuth.vue'
import DashboardView from '@/views/DashboardView.vue'
import EditorView from '@/views/EditorView.vue'
import ListView from '@/views/ListView.vue'
import LoginView from '@/views/LoginView.vue'
import { useAuth } from '@/composables/useAuth'

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

router.beforeEach((to) => {
    const { isAuthenticated } = useAuth()
    if (to.meta.requiresAuth && !isAuthenticated.value) {
        return { name: 'login' }
    }
    if (to.name === 'login' && isAuthenticated.value) {
        return { name: 'dashboard' }
    }
})

export default router
