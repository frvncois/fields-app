#!/usr/bin/env node
/**
 * create-fields-cms
 *
 * One-time scaffolder: called via `npm create fields-cms@latest`
 * Installs Fields into an existing Vite project.
 */
import {
    intro,
    outro,
    text,
    password,
    select,
    confirm,
    spinner,
    isCancel,
    cancel,
} from '@clack/prompts'
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execSync, spawnSync } from 'node:child_process'

const cwd = process.cwd()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fail(msg) {
    cancel(msg)
    process.exit(1)
}

function readJsonFile(path) {
    try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

function detectFramework() {
    const vitePath = join(cwd, 'vite.config.ts') || join(cwd, 'vite.config.js')
    if (!existsSync(vitePath)) return 'unknown'
    const content = readFileSync(vitePath, 'utf8')
    if (content.includes('@vitejs/plugin-vue')) return 'vue'
    if (content.includes('@vitejs/plugin-react')) return 'react'
    if (content.includes('@vitejs/plugin-solid')) return 'solid'
    return 'vite'
}

function appendToGitignore(lines) {
    const gitignorePath = join(cwd, '.gitignore')
    const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : ''
    const toAdd = lines.filter(l => !existing.includes(l))
    if (toAdd.length > 0) {
        appendFileSync(gitignorePath, '\n# Fields CMS\n' + toAdd.join('\n') + '\n')
    }
}

function patchViteConfig() {
    const vitePath = join(cwd, 'vite.config.ts')
    if (!existsSync(vitePath)) {
        writeFileSync(vitePath, `import { defineConfig } from 'vite'
import { fieldsPlugin } from '@fields-cms/fields'

export default defineConfig({
  plugins: [fieldsPlugin()],
})
`)
        return
    }
    let content = readFileSync(vitePath, 'utf8')
    if (!content.includes("from '@fields-cms/fields'")) {
        content = content.replace(
            /^(import .+\n)/m,
            `import { fieldsPlugin } from '@fields-cms/fields'\n$1`
        )
    }
    if (!content.includes('fieldsPlugin')) {
        content = content.replace(
            /plugins\s*:\s*\[/,
            `plugins: [\n    fieldsPlugin(),`
        )
    }
    writeFileSync(vitePath, content)
}

function writeFieldsConfig(projectName) {
    const configPath = join(cwd, 'fields.config.ts')
    if (existsSync(configPath)) return // don't overwrite existing config
    writeFileSync(configPath, `import type { FieldsConfig } from '@fields-cms/fields'

const config: FieldsConfig = {
    collections: [
        {
            name: 'home',
            label: 'Home',
            type: 'page',
            fields: [
                { key: 'title',   label: 'Title',   type: 'input',    required: true },
                { key: 'content', label: 'Content', type: 'richtext' },
            ],
        },
    ],
}

export default config
`)
}

function writeEnvFile(entries) {
    const envPath = join(cwd, '.env')
    const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
    const lines = Object.entries(entries)
        .filter(([k]) => !existing.includes(k))
        .map(([k, v]) => `${k}=${v}`)
    if (lines.length > 0) {
        appendFileSync(envPath, '\n# Fields CMS\n' + lines.join('\n') + '\n')
    }
}

function addNpmScripts() {
    const pkgPath = join(cwd, 'package.json')
    const pkg = readJsonFile(pkgPath)
    if (!pkg) return
    pkg.scripts = pkg.scripts ?? {}
    pkg.scripts['dev']                 = pkg.scripts['dev'] ?? 'vite'
    pkg.scripts['fields:migrate']     = 'fields migrate'
    pkg.scripts['fields:validate']    = 'fields validate'
    pkg.scripts['fields:add-user']    = 'fields add-user'
    pkg.scripts['fields:remove-user'] = 'fields remove-user'
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

intro('  Fields CMS — setup wizard')

// Detect existing project
const pkg = readJsonFile(join(cwd, 'package.json'))
if (!pkg) fail('No package.json found. Run this inside an existing Vite project.')

// Step 1 — Project name
const defaultName = pkg.name ?? 'My Project'
const projectName = await text({
    message: 'Project name',
    initialValue: defaultName,
    validate: v => v.trim().length > 0 ? undefined : 'Name cannot be empty',
})
if (isCancel(projectName)) fail('Setup cancelled.')

// Step 2 — Detect framework
const framework = detectFramework()
console.log(`  Detected: ${framework}`)

// Step 3 — Database
const dbChoice = await select({
    message: 'Database',
    options: [
        { value: 'sqlite',   label: 'SQLite         — local file, zero config (recommended)' },
        { value: 'postgres', label: 'PostgreSQL     — connection string' },
        { value: 'turso',    label: 'Turso / D1     — URL + auth token' },
    ],
})
if (isCancel(dbChoice)) fail('Setup cancelled.')

const envVars = { FIELDS_PROJECT_NAME: projectName.trim() }

if (dbChoice === 'postgres') {
    const connStr = await text({ message: 'PostgreSQL connection string', placeholder: 'postgresql://user:pass@host:5432/db' })
    if (isCancel(connStr)) fail('Setup cancelled.')
    envVars['DATABASE_URL'] = connStr
} else if (dbChoice === 'turso') {
    const url = await text({ message: 'Turso database URL', placeholder: 'libsql://...' })
    if (isCancel(url)) fail('Setup cancelled.')
    const token = await password({ message: 'Turso auth token' })
    if (isCancel(token)) fail('Setup cancelled.')
    envVars['TURSO_URL'] = url
    envVars['TURSO_AUTH_TOKEN'] = token
}

// Step 4 — Storage
const storageChoice = await select({
    message: 'File storage',
    options: [
        { value: 'local',     label: 'Local disk      — public/uploads/ (recommended)' },
        { value: 's3',        label: 'Amazon S3       — bucket + keys' },
        { value: 'r2',        label: 'Cloudflare R2   — S3-compatible' },
        { value: 'supabase',  label: 'Supabase        — project URL + service role key' },
        { value: 'vercel',    label: 'Vercel Blob     — BLOB_READ_WRITE_TOKEN' },
        { value: 'netlify',   label: 'Netlify Blobs   — auto-configured at runtime' },
        { value: 'firebase',  label: 'Firebase        — service account JSON + bucket' },
    ],
})
if (isCancel(storageChoice)) fail('Setup cancelled.')

if (storageChoice === 's3' || storageChoice === 'r2') {
    const bucket = await text({ message: `${storageChoice === 'r2' ? 'R2' : 'S3'} bucket name` })
    if (isCancel(bucket)) fail('Setup cancelled.')
    const region = await text({ message: 'Region', initialValue: storageChoice === 'r2' ? 'auto' : 'us-east-1' })
    if (isCancel(region)) fail('Setup cancelled.')
    const keyId = await text({ message: 'Access key ID' })
    if (isCancel(keyId)) fail('Setup cancelled.')
    const secret = await password({ message: 'Secret access key' })
    if (isCancel(secret)) fail('Setup cancelled.')
    envVars['STORAGE_BUCKET'] = bucket
    envVars['STORAGE_REGION'] = region
    envVars['STORAGE_KEY_ID'] = keyId
    envVars['STORAGE_SECRET'] = secret
    if (storageChoice === 'r2') {
        const endpoint = await text({ message: 'R2 endpoint URL', placeholder: 'https://<account-id>.r2.cloudflarestorage.com' })
        if (isCancel(endpoint)) fail('Setup cancelled.')
        envVars['STORAGE_ENDPOINT'] = endpoint
    }
} else if (storageChoice === 'supabase') {
    const projectUrl = await text({ message: 'Supabase project URL', placeholder: 'https://xxx.supabase.co' })
    if (isCancel(projectUrl)) fail('Setup cancelled.')
    const serviceKey = await password({ message: 'Service role key' })
    if (isCancel(serviceKey)) fail('Setup cancelled.')
    const bucket = await text({ message: 'Storage bucket name', initialValue: 'fields-uploads' })
    if (isCancel(bucket)) fail('Setup cancelled.')
    envVars['SUPABASE_URL'] = projectUrl
    envVars['SUPABASE_SERVICE_ROLE_KEY'] = serviceKey
    envVars['SUPABASE_BUCKET'] = bucket
} else if (storageChoice === 'vercel') {
    const token = await password({ message: 'BLOB_READ_WRITE_TOKEN' })
    if (isCancel(token)) fail('Setup cancelled.')
    envVars['BLOB_READ_WRITE_TOKEN'] = token
} else if (storageChoice === 'firebase') {
    console.log('  ⚠  Firestore is not supported as a database. Firebase Storage only.')
    const bucket = await text({ message: 'Firebase storage bucket', placeholder: 'your-project.appspot.com' })
    if (isCancel(bucket)) fail('Setup cancelled.')
    const saPath = await text({ message: 'Path to service account JSON file' })
    if (isCancel(saPath)) fail('Setup cancelled.')
    envVars['FIREBASE_BUCKET'] = bucket
    envVars['FIREBASE_SERVICE_ACCOUNT'] = saPath
} else if (storageChoice === 'netlify') {
    console.log('  ℹ  Netlify Blobs are auto-configured at runtime — no credentials needed.')
    console.log('  ⚠  Netlify does not offer a managed database. Consider Neon (PostgreSQL) for your database.')
}

// Step 5 — Admin credentials
const adminEmail = await text({
    message: 'Admin email',
    placeholder: 'you@example.com',
    validate: v => v.includes('@') ? undefined : 'Enter a valid email',
})
if (isCancel(adminEmail)) fail('Setup cancelled.')

const adminPw = await password({
    message: 'Admin password (min 8 chars)',
    validate: v => v.length >= 8 ? undefined : 'Password must be at least 8 characters',
})
if (isCancel(adminPw)) fail('Setup cancelled.')

const adminPwConfirm = await password({
    message: 'Confirm password',
    validate: v => v === adminPw ? undefined : 'Passwords do not match',
})
if (isCancel(adminPwConfirm)) fail('Setup cancelled.')

// ─── Apply everything ─────────────────────────────────────────────────────────

const s = spinner()

s.start('Writing configuration')
writeEnvFile(envVars)
writeFieldsConfig(projectName.trim())
s.stop('Configuration written')

s.start('Updating vite.config.ts')
patchViteConfig()
s.stop('vite.config.ts updated')

s.start('Updating .gitignore')
appendToGitignore(['fields.db', 'fields.db-shm', 'fields.db-wal', 'public/uploads/'])
s.stop('.gitignore updated')

s.start('Adding npm scripts')
addNpmScripts()
s.stop('npm scripts added')

s.start('Installing fields')
try {
    execSync('npm install --save-dev vite @fields-cms/fields', { cwd, stdio: 'pipe' })
    s.stop('fields installed')
} catch {
    s.stop('fields install failed — run: npm install --save-dev vite @fields-cms/fields')
}

s.start('Running initial migration')
try {
    execSync('npm run fields:migrate', { cwd, stdio: 'pipe' })
    s.stop('Migration complete')
} catch {
    s.stop('Migration skipped — run: npm run fields:migrate')
}

// Create the first admin user
s.start('Creating admin account')
const adminResult = spawnSync(
    'node',
    ['node_modules/@fields-cms/fields/bin/fields.js', 'add-user', '--email', adminEmail, '--password', adminPw],
    { cwd, stdio: 'pipe' }
)
if (adminResult.status === 0) {
    s.stop('Admin account created')
} else {
    s.stop('Could not create admin user automatically')
    console.log('  ⚠  Could not create admin user automatically.')
    console.log('     Run: npm run fields:add-user')
}

outro(`
  Project   ${projectName.trim()}
  Admin     http://localhost:5173/fields
  Email     ${adminEmail}

  Run       npm run dev
`)
