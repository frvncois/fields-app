import type { StorageAdapter } from '../../types'

// @aws-sdk/client-s3 and @aws-sdk/lib-storage are optional peer dependencies.
// This adapter covers AWS S3, Cloudflare R2, DigitalOcean Spaces, and Backblaze B2
// by accepting a custom endpoint URL.

export interface S3AdapterOptions {
    bucket: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    /** Custom endpoint for R2, Spaces, B2. Leave unset for AWS S3. */
    endpoint?: string
    /** Public base URL for generating file URLs. Defaults to the S3/R2 public URL. */
    publicBaseUrl?: string
}

export class S3Adapter implements StorageAdapter {
    private opts: S3AdapterOptions

    constructor(opts: S3AdapterOptions) {
        this.opts = opts
    }

    private async getClient() {
        const { S3Client } = await import('@aws-sdk/client-s3') as {
            S3Client: new (opts: unknown) => unknown
        }
        return new S3Client({
            region: this.opts.region,
            credentials: {
                accessKeyId: this.opts.accessKeyId,
                secretAccessKey: this.opts.secretAccessKey,
            },
            ...(this.opts.endpoint ? { endpoint: this.opts.endpoint, forcePathStyle: true } : {}),
        })
    }

    async upload(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
        const { Upload } = await import('@aws-sdk/lib-storage') as {
            Upload: new (opts: unknown) => { done(): Promise<unknown> }
        }
        const client = await this.getClient()
        const upload = new Upload({
            client,
            params: {
                Bucket: this.opts.bucket,
                Key: filename,
                Body: buffer,
                ContentType: mimeType,
            },
        })
        await upload.done()
        return `/uploads/${filename}`
    }

    async delete(path: string): Promise<void> {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3') as {
            DeleteObjectCommand: new (opts: unknown) => unknown
        }
        const client = await this.getClient() as { send(cmd: unknown): Promise<void> }
        const key = path.replace(/^\/uploads\//, '')
        await client.send(new DeleteObjectCommand({ Bucket: this.opts.bucket, Key: key }))
    }

    getUrl(path: string): string {
        if (this.opts.publicBaseUrl) {
            const key = path.replace(/^\/uploads\//, '')
            return `${this.opts.publicBaseUrl.replace(/\/$/, '')}/${key}`
        }
        return path
    }
}
