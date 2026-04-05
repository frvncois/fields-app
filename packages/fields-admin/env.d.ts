/// <reference types="vite/client" />

declare module '@fontsource-variable/geist'
declare module '@fontsource-variable/geist-mono'

declare module 'virtual:fields-config' {
    const config: import('./src/types/schema').FieldsConfig
    export default config
}

interface Window {
    __FIELDS_CONFIG__: import('./src/types/schema').FieldsConfig
}
