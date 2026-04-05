import type { StorageAdapter } from '../../types'

export interface FirebaseStorageOptions {
    /** Path to the service account JSON file, or the parsed object. */
    serviceAccount: string | Record<string, unknown>
    bucket: string
}

export class FirebaseStorageAdapter implements StorageAdapter {
    private opts: FirebaseStorageOptions
    private _bucket: unknown = null

    constructor(opts: FirebaseStorageOptions) {
        this.opts = opts
    }

    private async getBucket() {
        if (this._bucket) return this._bucket as {
            file(name: string): {
                save(buffer: Buffer, opts: { metadata: { contentType: string } }): Promise<void>
                delete(): Promise<void>
            }
        }
        const admin = await import('firebase-admin') as {
            apps: unknown[]
            initializeApp(opts: unknown): unknown
            credential: { cert(sa: unknown): unknown }
            storage(): { bucket(name: string): unknown }
        }
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(
                    typeof this.opts.serviceAccount === 'string'
                        ? JSON.parse(this.opts.serviceAccount)
                        : this.opts.serviceAccount
                ),
                storageBucket: this.opts.bucket,
            })
        }
        this._bucket = admin.storage().bucket(this.opts.bucket)
        return this._bucket as {
            file(name: string): {
                save(buffer: Buffer, opts: { metadata: { contentType: string } }): Promise<void>
                delete(): Promise<void>
            }
        }
    }

    async upload(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
        const bucket = await this.getBucket()
        await bucket.file(filename).save(buffer, { metadata: { contentType: mimeType } })
        return `/uploads/${filename}`
    }

    async delete(path: string): Promise<void> {
        const bucket = await this.getBucket()
        const key = path.replace(/^\/uploads\//, '')
        await bucket.file(key).delete()
    }

    getUrl(path: string): string {
        return path
    }
}
