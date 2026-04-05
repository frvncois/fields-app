import type { StorageAdapter } from '../../types'

export class NetlifyBlobsAdapter implements StorageAdapter {
    private storeName: string

    constructor(storeName = 'fields-uploads') {
        this.storeName = storeName
    }

    private async getStore() {
        const { getStore } = await import('@netlify/blobs') as unknown as {
            getStore(name: string): {
                set(key: string, value: Buffer, opts?: { metadata?: Record<string, string> }): Promise<void>
                delete(key: string): Promise<void>
                getMetadata(key: string): Promise<{ metadata: Record<string, string> } | null>
            }
        }
        return getStore(this.storeName)
    }

    async upload(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
        const store = await this.getStore()
        await store.set(filename, buffer, { metadata: { contentType: mimeType } })
        return `/uploads/${filename}`
    }

    async delete(path: string): Promise<void> {
        const store = await this.getStore()
        const key = path.replace(/^\/uploads\//, '')
        await store.delete(key)
    }

    getUrl(path: string): string {
        return path
    }
}
