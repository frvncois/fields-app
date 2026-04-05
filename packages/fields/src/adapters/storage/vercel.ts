import type { StorageAdapter } from '../../types'

export class VercelBlobAdapter implements StorageAdapter {
    async upload(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
        const { put } = await import('@vercel/blob') as {
            put(pathname: string, body: Buffer, opts: { access: string; contentType: string }): Promise<{ url: string }>
        }
        const result = await put(filename, buffer, { access: 'public', contentType: mimeType })
        return result.url
    }

    async delete(path: string): Promise<void> {
        const { del } = await import('@vercel/blob') as {
            del(url: string): Promise<void>
        }
        await del(path)
    }

    getUrl(path: string): string {
        return path
    }
}
