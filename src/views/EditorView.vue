<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiInput from '@/components/ui/UiInput.vue'
import EditorSidebar from '@/components/editor/EditorSidebar.vue'
import EditorField from '@/components/editor/EditorField.vue'
import { useEntries } from '@/composables/useEntries'
import { useEditorState } from '@/composables/useEditorState'
import { useSchema } from '@/composables/useSchema'
import { useCollections } from '@/composables/useCollections'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const { currentEntry, fetchById, clearCurrent } = useEntries()
const editorState = useEditorState()
const { grouped } = useCollections()
const { toast } = useToast()

const collectionName = computed<string | null>(() => {
    if (currentEntry.value) return currentEntry.value.collectionName
    const colId = route.query.collection ? Number(route.query.collection) : null
    if (!colId) return null
    const all = [...grouped.value.pages, ...grouped.value.collections, ...grouped.value.objects]
    return all.find(c => c.id === colId)?.name ?? null
})

const { fields } = useSchema(collectionName)

watch(
    () => route.params.id,
    (id) => {
        if (id) {
            const numId = Number(id)
            if (!Number.isInteger(numId) || numId <= 0) {
                router.replace({ name: 'dashboard' })
                toast('Invalid entry ID', 'error')
                return
            }
            editorState.setEntry(numId)
            fetchById(numId)
        } else {
            const colId = route.query.collection ? Number(route.query.collection) : null
            editorState.reset(colId)
            clearCurrent()
        }
    },
    { immediate: true }
)

watch(currentEntry, (entry) => {
    if (entry) {
        editorState.title.value = entry.title
        editorState.fieldValues.value = entry.data ?? {}
    }
})
</script>

<template>
    <div class="editor">
        <div class="content">
            <UiInput v-model="editorState.title.value" placeholder="Untitled" variant="ghost" size="lg" />
            <EditorField
                v-for="field in fields"
                :key="field.key"
                :field="field"
                :values="editorState.fieldValues.value"
            />
        </div>
        <EditorSidebar
            :status="currentEntry?.status"
            :created-at="currentEntry?.createdAt"
            :updated-at="currentEntry?.updatedAt"
        />
    </div>
</template>

<style scoped>
.editor {
    display: grid;
    grid-template-columns: 3fr 0.75fr;
    .content {
        display: flex;
        flex-direction: column;
        gap: var(--gap-md);
        padding: var(--space-xl);
        width: var(--content-width);
        margin: auto;
    }
}
</style>
