<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { XMarkIcon } from '@heroicons/vue/16/solid'

const { toasts, dismiss } = useToast()
</script>

<template>
    <Teleport to="body">
        <div class="items">
            <TransitionGroup name="toast">
                <div
                    v-for="toast in toasts"
                    :key="toast.id"
                    class="toast"
                    :class="toast.type"
                >
                    <span>{{ toast.message }}</span>
                    <button class="close" @click="dismiss(toast.id)">
                        <XMarkIcon/>
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<style scoped>
.items {
    position: fixed;
    bottom: var(--space-lg);
    right: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    z-index: 300;
    pointer-events: none;

    .toast {
        display: flex;
        align-items: center;
        gap: var(--gap-sm);
        padding: var(--space-sm) var(--space-md);
        border-radius: var(--radius-md);
        background: var(--color-foreground);
        color: var(--color-background);
        font-size: var(--size-sm);
        font-weight: 500;
        box-shadow: var(--shadow-md);
        pointer-events: all;
        max-width: 360px;

        &.success { background: var(--color-success); }
        &.error { background: var(--color-danger); }

        span { flex: 1; }

        .close {
            display: flex;
            align-items: center;
            justify-content: center;
            height: var(--size-base);
            aspect-ratio: 1/1;
            border: none;
            background: transparent;
            cursor: pointer;
            color: inherit;
            opacity: 0.6;
            flex-shrink: 0;
            border-radius: var(--radius-sm);
            padding: var(--space-xs);

            &:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.15);
            }

            svg {
                height: var(--size-sm);
                aspect-ratio: 1/1;
            }
        }
    }
}

.toast-enter-active,
.toast-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from {
    opacity: 0;
    transform: translateY(8px);
}
.toast-leave-to {
    opacity: 0;
    transform: translateX(8px);
}
</style>
