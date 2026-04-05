<script setup lang="ts">
import { ref } from 'vue'
import { EyeIcon, TrashIcon, ArrowUturnUpIcon, ArrowsPointingInIcon } from '@heroicons/vue/24/outline'
import UiButton from '@/components/ui/UiButton.vue'
import { useAlerts } from '@/composables/useAlerts'
import { useToast } from '@/composables/useToast'
import { deleteMedia } from '@/api/media'

const props = defineProps<{
    id: number
    title: string
    url: string
    weight: string
    dimensions: string
    type: string
    folderId?: number | null
}>()

const emit = defineEmits<{
    move: [folderId: number | null]
    deleted: [id: number]
    convert: []
}>()

const { confirm } = useAlerts()
const { toast } = useToast()
const isDragging = ref(false)

function onDragStart(e: DragEvent) {
    e.dataTransfer!.setData('text/plain', String(props.id))
    e.dataTransfer!.effectAllowed = 'move'
    isDragging.value = true
}

function onDragEnd() {
    isDragging.value = false
}

function handleView() {
    window.open(props.url, '_blank')
}

async function handleDelete() {
    const ok = await confirm({
        title: `Delete "${props.title}"?`,
        message: 'This action cannot be undone.',
        confirmLabel: 'Delete',
        variant: 'danger',
    })
    if (!ok) return
    await deleteMedia(props.id)
    emit('deleted', props.id)
    toast(`"${props.title}" deleted`, 'success')
}
</script>

<template>
    <div
        class="item"
        :class="{ dragging: isDragging }"
        draggable="true"
        @dragstart="onDragStart"
        @dragend="onDragEnd"
    >
        <div class="preview">
            <img :src="url" :alt="title" draggable="false" />
        </div>
        <div class="body">
            <span class="title">{{ title }}</span>
            <div class="meta">
                <span>{{ weight }}</span>
                <span>{{ dimensions }}</span>
            </div>
        </div>
        <div class="actions">
            <UiButton
                dim
                variant="ghost"
                size="icon"
                :icon="EyeIcon"
                tooltip="Open file in new tab"
                :action="handleView"
            />
            <UiButton
                v-if="type === 'image'"
                dim
                variant="ghost"
                size="icon"
                :icon="ArrowsPointingInIcon"
                tooltip="Convert image"
                :action="() => emit('convert')"
            />
            <UiButton
                v-if="folderId !== null && folderId !== undefined"
                dim
                variant="ghost"
                size="icon"
                :icon="ArrowUturnUpIcon"
                tooltip="Move to parent folder"
                :action="() => emit('move', null)"
            />
            <UiButton
                dim
                variant="ghost"
                size="icon"
                :icon="TrashIcon"
                tooltip="Delete item"
                :action="handleDelete"
            />
        </div>
    </div>
</template>

<style scoped>
.item {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: var(--color-background);
    cursor: grab;

    &.dragging { opacity: 0.4; cursor: grabbing; }

    .preview {
        width: 100%;
        aspect-ratio: 4 / 3;
        background: var(--color-hover);
        overflow: hidden;
        border-radius: var(--radius-sm) var(--radius-sm) 0 0;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            pointer-events: none;
        }
    }

    .body {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        padding: var(--space-sm);

        .title {
            font-size: var(--size-sm);
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .meta {
            display: flex;
            gap: var(--gap-sm);
            font-size: var(--size-xs);
            opacity: 0.4;
            font-family: 'Geist Mono Variable', monospace;
        }
    }

    .actions {
        display: flex;
        gap: var(--space-xs);
        padding: 0 var(--space-sm) var(--space-sm);
    }
}
</style>
