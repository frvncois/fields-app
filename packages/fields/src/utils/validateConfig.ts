import type { FieldsConfig, FieldDef } from '../types'

function validateFields(fields: FieldDef[], path: string): void {
    const seen = new Set<string>()
    for (const field of fields) {
        if (seen.has(field.key)) {
            throw new Error(`[Fields] Duplicate field key "${field.key}" in ${path}`)
        }
        seen.add(field.key)
        if (field.type === 'repeater' && field.fields) {
            validateFields(field.fields, `${path}.${field.key}`)
        }
    }
}

export function validateConfig(config: FieldsConfig): void {
    const collectionNames = new Set<string>()
    for (const col of config.collections) {
        if (collectionNames.has(col.name)) {
            throw new Error(`[Fields] Duplicate collection name "${col.name}"`)
        }
        collectionNames.add(col.name)
        validateFields(col.fields, `collections.${col.name}`)
    }
}
