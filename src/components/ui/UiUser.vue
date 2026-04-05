<script setup lang="ts">
import { computed } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
    firstName: string
    lastName: string
    email: string
}>()

const emit = defineEmits<{
    logout: []
    settings: []
}>()

const initials = computed(() => `${props.firstName[0]}${props.lastName[0]}`.toUpperCase())
</script>

<template>
    <div class="user">
        <div class="info">
            <div class="avatar">{{ initials }}</div>
            <div class="text">
                <span class="name">{{ firstName }} {{ lastName }}</span>
                <span class="email">{{ email }}</span>
            </div>
        </div>
        <div class="actions">
            <UiButton text="Logout" variant="outline" size="sm" style="flex: 1; justify-content: center" @click="emit('logout')" />
            <UiButton variant="outline" size="icon" :icon="Cog6ToothIcon" @click="emit('settings')" />
        </div>
    </div>
</template>

<style scoped>
.user {
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);
    padding: var(--space-base);
    background: var(--color-background);
    border-radius: var(--radius-lg);

    .info {
        display: flex;
        align-items: center;
        gap: var(--gap-sm);

        .avatar {
            height: var(--size-md);
            aspect-ratio: 1;
            border-radius: var(--radius-full);
            background: var(--color-border);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--size-xs);
            font-weight: 500;
            flex-shrink: 0;
            letter-spacing: var(--letter-spacing);
        }

        .text {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
            min-width: 0;

            .name {
                font-size: var(--size-sm);
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .email {
                font-size: var(--size-xs);
                opacity: 0.4;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }
    }

    .actions {
        display: flex;
        gap: var(--space-sm);
    }
}
</style>
