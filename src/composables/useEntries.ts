import { ref } from 'vue'
import { relativeTime } from '@/utils/time'
import { getEntries, getEntriesByCollection, getEntry } from '@/api/entries'
import type { Entry } from '@/api/entries'

export type { Entry }

function mapEntry(raw: Entry): Entry {
    return { ...raw, createdAt: relativeTime(raw.createdAt), updatedAt: relativeTime(raw.updatedAt) }
}

const entries = ref<Entry[]>([])
const currentEntry = ref<Entry | null>(null)
const loading = ref(false)

export function useEntries() {
    async function fetchAll() {
        loading.value = true
        try {
            entries.value = (await getEntries()).map(mapEntry)
        } catch (e) {
            console.error('Failed to fetch entries:', e)
        } finally {
            loading.value = false
        }
    }

    async function fetchByCollection(collectionId: number) {
        loading.value = true
        try {
            entries.value = (await getEntriesByCollection(collectionId)).map(mapEntry)
        } catch (e) {
            console.error('Failed to fetch collection entries:', e)
        } finally {
            loading.value = false
        }
    }

    async function fetchById(id: number) {
        loading.value = true
        try {
            currentEntry.value = mapEntry(await getEntry(id))
        } catch (e) {
            console.error('Failed to fetch entry:', e)
        } finally {
            loading.value = false
        }
    }

    function remove(id: number) {
        entries.value = entries.value.filter(e => e.id !== id)
    }

    function clearCurrent() {
        currentEntry.value = null
    }

    return { entries, currentEntry, loading, fetchAll, fetchByCollection, fetchById, remove, clearCurrent }
}
