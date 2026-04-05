import { createApp } from 'vue'
import Lenis from 'lenis'

import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@/assets/global.css'

import App from './App.vue'
import router from './router'

new Lenis({ autoRaf: true })

const app = createApp(App)
app.use(router)
app.mount('#app')
