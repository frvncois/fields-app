import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/plugin.ts', 'src/db.ts', 'src/utils/validateConfig.ts'],
    format: ['esm'],
    dts: true,
    outDir: 'dist',
    // Keep optional provider SDKs as external — they're not always installed
    external: [
        '@aws-sdk/client-s3',
        '@aws-sdk/lib-storage',
        '@libsql/client',
        '@netlify/blobs',
        '@supabase/supabase-js',
        '@vercel/blob',
        'firebase-admin',
        'pg',
    ],
})
