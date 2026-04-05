<script setup lang="ts">
import { ref } from 'vue'
import { FolderIcon, TrashIcon } from '@heroicons/vue/24/outline'
import UiButton from '@/components/ui/UiButton.vue'

defineProps<{
    id: number
    name: string
    count: number
}>()

const emit = defineEmits<{
    open: []
    deleted: []
    mediaDrop: [mediaId: number]
}>()

const isDragOver = ref(false)

function onDragOver(e: DragEvent) {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'move'
}

function onDragEnter() {
    isDragOver.value = true
}

function onDragLeave(e: DragEvent) {
    if (!(e.currentTarget as Element).contains(e.relatedTarget as Node)) {
        isDragOver.value = false
    }
}

function onDrop(e: DragEvent) {
    e.preventDefault()
    isDragOver.value = false
    const mediaId = Number(e.dataTransfer?.getData('text/plain'))
    if (mediaId) emit('mediaDrop', mediaId)
}
</script>

<template>
    <div
        class="item"
        :class="{ 'drag-over': isDragOver }"
        @click="emit('open')"
        @dragover="onDragOver"
        @dragenter="onDragEnter"
        @dragleave="onDragLeave"
        @drop="onDrop"
    >
        <div class="preview">
            <FolderIcon />
        </div>
        <div class="content">
            <span class="name">{{ name }}</span>
            <span class="count">{{ count }} {{ count === 1 ? 'item' : 'items' }}</span>
        </div>
        <div class="actions">
            <UiButton variant="ghost" size="icon" :icon="TrashIcon" @click.stop="emit('deleted')" />
        </div>
    </div>
</template>

<style scoped>
.item {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    overflow: hidden;
    background: var(--color-background);
    cursor: pointer;
    position: relative;
    transition: border-color 0.15s, background 0.15s;

    &:hover { background: var(--color-hover-subtle); .actions { opacity: 1; } }
    &.drag-over { border-color: var(--color-foreground); background: var(--color-hover-subtle); .icon { opacity: 0.5; } }

    .preview {
        width: 100%;
        aspect-ratio: 4 / 3;
        background: var(--color-hover-subtle);
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
            height: var(--size-md);
            aspect-ratio: 1/1;
            opacity: 0.2;
        }
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        padding: var(--space-sm);

        .name {
            font-size: var(--size-sm);
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .count {
            font-size: var(--size-xs);
            opacity: 0.4;
            font-family: 'Geist Mono Variable', monospace;
        }
    }

    .actions {
        position: absolute;
        top: var(--space-sm);
        right: var(--space-sm);
        opacity: 0;
        transition: opacity 0.15s;

    }
}
</style>
