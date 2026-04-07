<script setup lang="ts">
import { computed } from 'vue'
import UiCombobox from '@/components/ui/UiCombobox.vue'
import type { ComboboxItem } from '@/components/ui/UiCombobox.vue'
import { PencilSquareIcon, TrashIcon, ArrowsRightLeftIcon } from '@heroicons/vue/24/outline'
import type { User } from '@/api/users'

const props = defineProps<{
    user: User
    isCurrentUser?: boolean
    isLastAdmin?: boolean
}>()

const emit = defineEmits<{
    permissions: [user: User]
    changeRole: [user: User]
    remove: [user: User]
}>()

const initials = computed(() => {
    const f = props.user.first_name?.[0] ?? ''
    const l = props.user.last_name?.[0] ?? ''
    if (f || l) return `${f}${l}`.toUpperCase()
    return props.user.email.slice(0, 2).toUpperCase()
})

const displayName = computed(() => {
    const name = `${props.user.first_name ?? ''} ${props.user.last_name ?? ''}`.trim()
    return name || props.user.email
})

const actions = computed<ComboboxItem[]>(() => {
    const items: ComboboxItem[] = []
    if (props.user.role === 'editor') {
        items.push({
            icon: PencilSquareIcon,
            label: 'Edit permissions',
            action: () => emit('permissions', props.user),
        })
    }
    if (!(props.user.role === 'admin' && props.isLastAdmin)) {
        const label = props.user.role === 'admin' ? 'Make editor' : 'Make admin'
        items.push({
            icon: ArrowsRightLeftIcon,
            label,
            action: () => emit('changeRole', props.user),
        })
    }
    if (!props.isCurrentUser) {
        items.push({
            icon: TrashIcon,
            label: 'Remove',
            variant: 'danger',
            action: () => emit('remove', props.user),
        })
    }
    return items
})
</script>

<template>
    <div class="item">
        <div class="identity">
            <div class="avatar">{{ initials }}</div>
            <div class="meta">
                <span class="name">{{ displayName }}</span>
                <span v-if="user.first_name || user.last_name" class="sub">{{ user.email }}</span>
            </div>
        </div>
        <span class="badge" :class="user.role">{{ user.role }}</span>
        <UiCombobox :items="actions" />
    </div>
</template>

<style scoped>
.item {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: var(--gap-md);
    padding: var(--space-sm);
    border: 1px solid var(--color-border-var);
    border-radius: var(--radius-md);

    .identity {
        display: flex;
        align-items: center;
        gap: var(--gap-md);
        min-width: 0;

        .avatar {
            width: var(--size-lg);
            height: var(--size-lg);
            border-radius: var(--radius-full);
            background: var(--color-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--size-xs);
            font-weight: 600;
            flex-shrink: 0;
        }

        .meta {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;

            .name {
                font-size: var(--size-sm);
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .sub {
                font-size: var(--size-xs);
                opacity: 0.4;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
    }

    .badge {
        font-size: var(--size-xs);
        padding: 2px var(--space-sm);
        border-radius: var(--radius-full);
        border: 1px solid var(--color-border);
        font-family: 'Geist Mono Variable', monospace;
        white-space: nowrap;

        &.admin { opacity: 1; }
        &.editor { opacity: 0.5; }
    }
}
</style>
