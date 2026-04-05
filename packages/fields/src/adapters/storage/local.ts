import { createWriteStream, existsSync, unlinkSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { StorageAdapter } from '../../types'

export class LocalAdapter implements StorageAdapter {
    private uploadsDir: string

    constructor(projectRoot: string) {
        this.uploadsDir = join(projectRoot, 'public', 'uploads')
    }

    async upload(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
        await mkdir(this.uploadsDir, { recursive: true })

        // Deduplicate filename
        const ext = filename.slice(filename.lastIndexOf('.'))
        const base = filename.slice(0, filename.length - ext.length)
        let safeName = filename
        let i = 2
        while (existsSync(join(this.uploadsDir, safeName))) {
            safeName = `${base}-${i++}${ext}`
        }

        await new Promise<void>((resolve, reject) => {
            const writer = createWriteStream(join(this.uploadsDir, safeName))
            writer.write(buffer, (err) => {
                if (err) reject(err)
                else writer.end(resolve)
            })
            writer.on('error', reject)
        })

        return `/uploads/${safeName}`
    }

    async delete(path: string): Promise<void> {
        const filePath = join(process.cwd(), 'public', path)
        try { unlinkSync(filePath) } catch { /* already gone */ }
    }

    getUrl(path: string): string {
        return path
    }
}
