import { ref, computed } from 'vue'
import { getCollections } from '@/api/collections'
import type { Collection } from '@/api/collections'

export type { Collection }

export type GroupedCollections = {
    pages: Collection[]
    collections: Collection[]
    objects: Collection[]
}

const grouped = ref<GroupedCollections>({ pages: [], collections: [], objects: [] })
const all = computed(() => [
    ...grouped.value.pages,
    ...grouped.value.collections,
    ...grouped.value.objects,
])
let fetched = false

export function useCollections() {
    if (!fetched) {
        fetched = true
        getCollections()
            .then((data) => {
                grouped.value = {
                    pages:       data.filter(c => c.type === 'page'),
                    collections: data.filter(c => c.type === 'collection'),
                    objects:     data.filter(c => c.type === 'object'),
                }
            })
            .catch(e => {
                console.error('Failed to fetch collections:', e)
                fetched = false
            })
    }

    return { grouped, all }
}
