<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiInput from '@/components/ui/UiInput.vue'
import EditorSidebar from '@/components/editor/EditorSidebar.vue'
import EditorField from '@/components/editor/EditorField.vue'
import { useEntry } from '@/composables/useEntries'
import { useEditorState } from '@/composables/useEditorState'
import { useSchema } from '@/composables/useSchema'
import { useCollections } from '@/composables/useCollections'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const { currentEntry, loading, fetchById, clear } = useEntry()
const editorState = useEditorState()
const { all } = useCollections()
const { toast } = useToast()

const collectionName = computed<string | null>(() => {
    if (currentEntry.value) return currentEntry.value.collectionName
    const colId = route.query.collection ? Number(route.query.collection) : null
    if (!colId) return null
    return all.value.find(c => c.id === colId)?.name ?? null
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
            clear()
        }
    },
    { immediate: true }
)

watch(currentEntry, (entry) => {
    if (entry) {
        editorState.title.value = entry.title
        editorState.fieldValues.value = entry.data ?? {}
        editorState.published.value = entry.status === 'published'
    }
})
</script>

<template>
    <div class="editor" v-if="!loading">
        <div class="content">
            <UiInput v-model="editorState.title.value" placeholder="Untitled" variant="ghost" size="lg" />
            <EditorField
                v-for="field in fields"
                :key="field.key"
                :field="field"
                :values="editorState.fieldValues.value"
                @update:values="editorState.fieldValues.value = $event"
            />
        </div>
        <EditorSidebar
            v-model:published="editorState.published.value"
            v-model:meta-title="editorState.metaTitle.value"
            v-model:meta-description="editorState.metaDescription.value"
            v-model:slug="editorState.slug.value"
            :created-at="currentEntry?.createdAt"
            :updated-at="currentEntry?.updatedAt"
        />
    </div>
    <div class="loading" v-else>Loading…</div>
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
.loading {
    padding: var(--space-xl);
    font-size: var(--size-sm);
    opacity: 0.5;
}
</style>
