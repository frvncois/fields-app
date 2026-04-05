import { ref } from 'vue'
import type { FieldValues } from '@/types/schema'
import { createEntry, updateEntry } from '@/api/entries'

const title = ref('')
const collectionId = ref<number | null>(null)
const entryId = ref<number | null>(null)
const fieldValues = ref<FieldValues>({})

export function useEditorState() {
    function setEntry(id: number) {
        entryId.value = id
        collectionId.value = null
        title.value = ''
        fieldValues.value = {}
    }

    function reset(forCollectionId: number | null = null) {
        entryId.value = null
        collectionId.value = forCollectionId
        title.value = ''
        fieldValues.value = {}
    }

    async function save(status: 'draft' | 'published'): Promise<number | null> {
        if (!title.value.trim()) return null

        const body = { title: title.value, status, data: fieldValues.value }

        if (entryId.value) {
            await updateEntry(entryId.value, body)
            return entryId.value
        }

        if (!collectionId.value) return null
        const data = await createEntry({ collectionId: collectionId.value, ...body })
        return data.id ?? null
    }

    return { title, collectionId, entryId, fieldValues, save, setEntry, reset }
}
