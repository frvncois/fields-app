import { ref } from 'vue'
import { getEntries, getEntriesByCollection, getEntry } from '@/api/entries'
import type { Entry } from '@/api/entries'

export type { Entry }

// ─── List composable ─────────────────────────────────────────────────────────

const entries = ref<Entry[]>([])
const listLoading = ref(false)

export function useEntries() {
    async function fetchAll() {
        listLoading.value = true
        try {
            entries.value = await getEntries()
        } catch (e) {
            console.error('Failed to fetch entries:', e)
        } finally {
            listLoading.value = false
        }
    }

    async function fetchByCollection(collectionId: number) {
        listLoading.value = true
        try {
            entries.value = await getEntriesByCollection(collectionId)
        } catch (e) {
            console.error('Failed to fetch collection entries:', e)
        } finally {
            listLoading.value = false
        }
    }

    function remove(id: number) {
        entries.value = entries.value.filter(e => e.id !== id)
    }

    function updateStatus(id: number, status: 'draft' | 'published') {
        const i = entries.value.findIndex(e => e.id === id)
        if (i !== -1) entries.value[i] = { ...entries.value[i]!, status }
    }

    return { entries, loading: listLoading, fetchAll, fetchByCollection, remove, updateStatus }
}

// ─── Single-entry composable (for editor) ────────────────────────────────────

const currentEntry = ref<Entry | null>(null)
const entryLoading = ref(false)

export function useEntry() {
    async function fetchById(id: number) {
        entryLoading.value = true
        try {
            currentEntry.value = await getEntry(id)
        } catch (e) {
            console.error('Failed to fetch entry:', e)
        } finally {
            entryLoading.value = false
        }
    }

    function clear() {
        currentEntry.value = null
    }

    return { currentEntry, loading: entryLoading, fetchById, clear }
}
