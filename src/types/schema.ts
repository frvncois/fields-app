export type FieldType = 'input' | 'richtext' | 'textarea' | 'media' | 'boolean' | 'repeater'

export type FieldDef = {
    key: string
    label: string
    type: FieldType
    required?: boolean
    fields?: FieldDef[]
}

export type FieldValues = Record<string, unknown>

export type CollectionSchema = {
    name: string
    fields: FieldDef[]
}

export type FieldsConfig = {
    collections: CollectionSchema[]
}
