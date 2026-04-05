import { ref } from 'vue'

export function useSort<T extends string>() {
    const sortKey = ref<T | null>(null)
    const sortDir = ref<'asc' | 'desc'>('asc')

    function toggleSort(key: T) {
        if (sortKey.value === key) {
            sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
        } else {
            sortKey.value = key
            sortDir.value = 'asc'
        }
    }

    function applySorting<Item extends Record<string, unknown>>(items: Item[]): Item[] {
        if (!sortKey.value) return items
        const key = sortKey.value as string
        return [...items].sort((a, b) => {
            const cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''))
            return sortDir.value === 'asc' ? cmp : -cmp
        })
    }

    return { sortKey, sortDir, toggleSort, applySorting }
}
