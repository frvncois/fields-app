<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="open" class="backdrop" data-overlay @mousedown.self="$emit('close')">
                <div class="modal">
                    <slot />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.backdrop {
    position: fixed;
    inset: 0;
    background: var(--color-backdrop);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;

    .modal {
        background: var(--color-background);
        border-radius: var(--radius-md);
        width: var(--modal-width);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
    }
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.15s;
    .modal { transition: transform 0.15s; }
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
    .modal { transform: scale(0.96); }
}
</style>
