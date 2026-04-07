import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fieldsPlugin } from '../fields/src/plugin'

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
            const configPath = resolve(__dirname, '../../fields.config.ts')
            return `export { default } from ${JSON.stringify(configPath)}`
        },
    }
}

export default defineConfig({
    base: '/fields',
    plugins: [
        vue(),
        ...(process.env.NODE_ENV !== 'production' ? [vueDevTools()] : []),
        fieldsVirtualConfigPlugin(),
        ...fieldsPlugin(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        outDir: '../fields/dist/admin',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-tiptap'
                    if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router')) return 'vendor-vue'
                },
            },
        },
    },
})