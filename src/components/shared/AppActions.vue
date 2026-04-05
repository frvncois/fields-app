<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import { CloudArrowUpIcon, BookmarkIcon } from '@heroicons/vue/24/outline'
import { useCollections } from '@/composables/useCollections'
import { useEditorState } from '@/composables/useEditorState'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const { all } = useCollections()
const editorState = useEditorState()
const { toast } = useToast()

const currentCollection = computed(() => {
    const id = Number(route.params.id)
    if (!id) return null
    return all.value.find(c => c.id === id) ?? null
})

const canAdd = computed(() =>
    route.name === 'list' && currentCollection.value?.type === 'collection'
)

async function handleSave(target: 'draft' | 'published') {
    editorState.published.value = target === 'published'
    const newId = await editorState.save()
    if (newId) router.push({ name: 'editor', params: { id: newId } })
    toast(target === 'published' ? 'Published' : 'Saved', 'success')
}
</script>

<template>
    <div class="actions">
        <template v-if="canAdd">
            <UiButton
                text="Add item"
                size="sm"
                @click="router.push({ name: 'editor', query: { collection: currentCollection?.id } })"
            />
        </template>

        <template v-else-if="route.name === 'editor'">
            <UiButton text="Cancel" variant="ghost" size="sm" @click="router.back()" />
            <UiButton text="Save" variant="outline" size="sm" @click="handleSave('draft')" />
            <UiButton text="Publish" size="sm" :icon="CloudArrowUpIcon" @click="handleSave('published')" />
        </template>
    </div>
</template>

<style scoped>
.actions {
    display: flex;
    align-items: center;
    gap: var(--gap-sm);
}
</style>
