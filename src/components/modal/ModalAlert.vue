<script setup lang="ts">
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { TrashIcon } from '@heroicons/vue/20/solid'
import { useAlerts } from '@/composables/useAlerts'

const { isOpen, options, inputValue, isPrompt, respond } = useAlerts()
</script>

<template>
    <UiModal :open="isOpen" @close="respond(false)">
        <div class="content">
            <div v-if="options.icon || options.variant === 'danger'" class="icon">
                <component :is="options.icon ?? TrashIcon" />
            </div>
            <p class="title">{{ options.title }}</p>
            <p v-if="options.message" class="message">{{ options.message }}</p>
            <input
                v-if="isPrompt"
                v-model="inputValue"
                class="input"
                :placeholder="options.input?.placeholder ?? 'Enter a name...'"
                autofocus
                @keydown.enter="inputValue.trim() && respond(true)"
                @keydown.esc="respond(false)"
            />
        </div>
        <div class="footer">
            <UiButton variant="ghost" :text="options.cancelLabel ?? 'Cancel'" @click="respond(false)" />
            <UiButton
                :variant="options.variant === 'danger' ? 'danger' : 'default'"
                :text="options.confirmLabel ?? 'Confirm'"
                :disabled="isPrompt && !inputValue.trim()"
                @click="respond(true)"
            />
        </div>
    </UiModal>
</template>

<style scoped>
.content {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: var(--space-xs);

    .icon {
        height: var(--size-md);
        aspect-ratio: 1/1;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: var(--space-md);
        padding: var(--space-sm);

        > svg {
            height: var(--size-base);
            aspect-ratio: 1/1;
            opacity: 0.6;
        }
    }

    .title {
        font-size: var(--size-sm);
        font-weight: 600;
        margin: 0;
    }

    .message {
        font-size: var(--size-sm);
        opacity: 0.5;
        margin: 0;
        line-height: 1.5;
    }

    .input {
        margin-top: var(--space-sm);
        padding: var(--space-sm);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-size: var(--size-sm);
        font-family: inherit;
        outline: none;
        width: 100%;
        box-sizing: border-box;
        background: var(--color-background);
        color: var(--color-foreground);

        &:focus { border-color: var(--color-secondary); }
    }
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--gap-sm);
    padding: var(--space-lg);
}
</style>
