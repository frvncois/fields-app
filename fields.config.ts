import type { FieldsConfig } from '@fields-cms/fields'

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
        {
            name: 'about',
            label: 'About',
            type: 'page',
            fields: [
                { key: 'title',   label: 'Title',   type: 'input',    required: true },
                { key: 'content', label: 'Content', type: 'richtext' },
            ],
        },
    ],
}

export default config
