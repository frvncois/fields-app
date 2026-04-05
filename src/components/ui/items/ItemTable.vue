<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { DocumentTextIcon, NewspaperIcon, PaperClipIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import UiCombobox from '@/components/ui/UiCombobox.vue'
import type { ComboboxItem } from '@/components/ui/UiCombobox.vue'
import { useAlerts } from '@/composables/useAlerts'
import { useToast } from '@/composables/useToast'
import { deleteEntry } from '@/api/entries'

const props = defineProps<{
    id: number
    title: string
    slug: string
    type: string
    category: 'page' | 'collection' | 'object'
    status: 'draft' | 'published'
    updatedAt: string
}>()

const emit = defineEmits<{ deleted: [id: number] }>()

const router = useRouter()
const { confirm } = useAlerts()
const { toast } = useToast()

const icon = computed(() => {
    if (props.category === 'page') return DocumentTextIcon
    if (props.category === 'collection') return NewspaperIcon
    return PaperClipIcon
})

async function handleDelete() {
    const ok = await confirm({
        title: `Delete "${props.title}"?`,
        message: 'This action cannot be undone.',
        confirmLabel: 'Delete',
        variant: 'danger',
    })
    if (!ok) return
    await deleteEntry(props.id)
    emit('deleted', props.id)
    toast(`"${props.title}" deleted`, 'success')
}

const actions = computed<ComboboxItem[]>(() => {
    const items: ComboboxItem[] = [
        {
            icon: PencilIcon,
            label: 'Edit',
            action: () => router.push({ name: 'editor', params: { id: props.id } }),
        },
    ]
    if (props.category === 'collection') {
        items.push({
            icon: TrashIcon,
            label: 'Delete',
            variant: 'danger',
            action: handleDelete,
        })
    }
    return items
})
</script>

<template>
    <div class="item" @click="router.push({ name: 'editor', params: { id: props.id } })">
        <div class="header">
            <div class="icon">
                <component :is="icon"/>
            </div>
            <div class="meta">
                <span class="title">{{ title }}</span>
                <span class="slug">{{ slug }}</span>
            </div>
        </div>
        <span class="type">{{ type }}</span>
        <span class="badge" :class="status">{{ status }}</span>
        <span class="date">{{ updatedAt }}</span>
        <UiCombobox :items="actions" />
    </div>
</template>

<style scoped>
.item {
    display: grid;
    grid-template-columns: 8fr 3fr 3fr 4fr 1fr;
    align-items: center;
    padding: var(--space-sm) var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;

    &:hover {
        background: var(--color-hover-subtle);
    }

    .header {
        display: flex;
        align-items: center;
        gap: var(--gap-md);

        .icon {
            height: var(--size-lg);
            aspect-ratio: 1/1;
            border-radius: var(--radius-md);
            background: var(--color-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;

            > svg {
                height: var(--size-base);
                aspect-ratio: 1/1;
            }
        }

        .meta {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);

            .title {
                font-weight: 500;
            }

            .slug {
                font-size: var(--size-xs);
                opacity: 0.35;
                font-family: 'Geist Mono Variable', monospace;
            }
        }
    }

    .type {
        font-size: var(--size-xs);
        opacity: 0.4;
        text-transform: capitalize;
        font-family: 'Geist Mono Variable', monospace;
    }

    .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        padding: var(--space-xs) var(--space-sm);
        border-radius: var(--radius-full);
        font-size: var(--size-xs);
        font-weight: 500;
        text-transform: capitalize;

        &.draft {
            background: var(--color-border);
            color: var(--color-secondary);
        }

        &.published {
            background: var(--color-success-bg);
            color: var(--color-success);
        }
    }

    .date {
        font-size: var(--size-sm);
        opacity: 0.35;
    }
}
</style>
