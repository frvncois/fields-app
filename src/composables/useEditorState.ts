import { ref, computed } from 'vue'
import type { FieldValues } from '@/types/schema'
import { createEntry, updateEntry } from '@/api/entries'

const title = ref('')
const collectionId = ref<number | null>(null)
const entryId = ref<number | null>(null)
const fieldValues = ref<FieldValues>({})
const published = ref(false)

export function useEditorState() {
    function setEntry(id: number) {
        entryId.value = id
        collectionId.value = null
        title.value = ''
        fieldValues.value = {}
        published.value = false
    }

    function reset(forCollectionId: number | null = null) {
        entryId.value = null
        collectionId.value = forCollectionId
        title.value = ''
        fieldValues.value = {}
        published.value = false
    }

    async function save(): Promise<number | null> {
        if (!title.value.trim()) return null

        const status = published.value ? 'published' : 'draft'
        const body = { title: title.value, status, data: fieldValues.value }

        if (entryId.value) {
            await updateEntry(entryId.value, body)
            return entryId.value
        }

        if (!collectionId.value) return null
        const data = await createEntry({ collectionId: collectionId.value, ...body })
        return data.id ?? null
    }

    const ogImage = computed<string>({
        get: () => String(fieldValues.value['_ogImage'] ?? ''),
        set: (v) => { fieldValues.value['_ogImage'] = v },
    })

    const metaTitle = computed<string>({
        get: () => String(fieldValues.value['_metaTitle'] ?? ''),
        set: (v) => { fieldValues.value['_metaTitle'] = v },
    })

    const metaDescription = computed<string>({
        get: () => String(fieldValues.value['_metaDescription'] ?? ''),
        set: (v) => { fieldValues.value['_metaDescription'] = v },
    })

    const slug = computed<string>({
        get: () => String(fieldValues.value['_slug'] ?? ''),
        set: (v) => { fieldValues.value['_slug'] = v },
    })

    return { title, collectionId, entryId, fieldValues, published, ogImage, metaTitle, metaDescription, slug, save, setEntry, reset }
}
