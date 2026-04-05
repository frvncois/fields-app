import type { FieldsConfig } from './src/types/schema'

const config: FieldsConfig = {
    collections: [
        {
            name: 'home',
            fields: [
                { key: 'title',   label: 'Title',        type: 'input',    required: true },
                { key: 'content', label: 'Rich content', type: 'richtext' },
                { key: 'gallery', label: 'Gallery',      type: 'media' },
                { key: 'gallery', label: 'Gallery',      type: 'media' },
                { key: 'active',  label: 'Active',       type: 'boolean' },
                {
                    key: 'items', label: 'Items', type: 'repeater',
                    fields: [
                        { key: 'name', label: 'Name', type: 'input' },
                        { key: 'body', label: 'Body', type: 'textarea' },
                        { key: 'file', label: 'File', type: 'media' },
                    ],
                },
            ],
        },
    ],
}

export default config
