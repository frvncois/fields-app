import type { StorageAdapter } from '../../types'

export interface SupabaseStorageOptions {
    projectUrl: string
    serviceRoleKey: string
    bucket: string
}

export class SupabaseStorageAdapter implements StorageAdapter {
    private opts: SupabaseStorageOptions

    constructor(opts: SupabaseStorageOptions) {
        this.opts = opts
    }

    private async getClient() {
        const { createClient } = await import('@supabase/supabase-js') as {
            createClient(url: string, key: string): { storage: { from(bucket: string): unknown } }
        }
        return createClient(this.opts.projectUrl, this.opts.serviceRoleKey)
            .storage.from(this.opts.bucket) as {
                upload(path: string, buffer: Buffer, opts: { contentType: string; upsert: boolean }): Promise<{ error: Error | null }>
                remove(paths: string[]): Promise<{ error: Error | null }>
                getPublicUrl(path: string): { data: { publicUrl: string } }
            }
    }

    async upload(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
        const bucket = await this.getClient()
        const { error } = await bucket.upload(filename, buffer, { contentType: mimeType, upsert: false })
        if (error) throw error
        return `/uploads/${filename}`
    }

    async delete(path: string): Promise<void> {
        const bucket = await this.getClient()
        const key = path.replace(/^\/uploads\//, '')
        const { error } = await bucket.remove([key])
        if (error) throw error
    }

    getUrl(path: string): string {
        return path
    }
}
