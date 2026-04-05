import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// ─── Virtual config module ────────────────────────────────────────────────────
// Dev:  re-exports the monorepo root's fields.config.ts (HMR works naturally)
// Prod: exports window.__FIELDS_CONFIG__, injected by the fields plugin at runtime

function fieldsVirtualConfigPlugin(): Plugin {
    const isProd = process.env.NODE_ENV === 'production'
    return {
        name: 'fields-virtual-config',
        resolveId(id) {
            if (id === 'virtual:fields-config') return '\0virtual:fields-config'
        },
        load(id) {
            if (id !== '\0virtual:fields-config') return
            if (isProd) {
                return `export default window.__FIELDS_CONFIG__`
            }
            // In monorepo dev: load the root fields.config.ts two levels up
            const configPath = resolve(__dirname, '../../fields.config.ts')
            return `export { default } from ${JSON.stringify(configPath)}`
        },
    }
}

// https://vite.dev/config/
export default defineConfig({
    base: '/fields',
    plugins: [
        vue(),
        ...(process.env.NODE_ENV !== 'production' ? [vueDevTools()] : []),
        fieldsVirtualConfigPlugin(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        outDir: '../fields/dist/admin',
        emptyOutDir: true,
    },
})
