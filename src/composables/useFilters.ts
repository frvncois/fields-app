import { reactive } from 'vue'

export type FilterDef =
    | { key: string; type: 'search'; placeholder?: string }
    | { key: string; type: 'select'; placeholder?: string; options: { label: string; value: string }[] }

export function useFilters(defs: FilterDef[]) {
    const values = reactive<Record<string, string>>(
        Object.fromEntries(defs.map(d => [d.key, '']))
    )

    function reset() {
        defs.forEach(d => { values[d.key] = '' })
    }

    return { defs, values, reset }
}
