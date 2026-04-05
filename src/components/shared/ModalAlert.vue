<script setup lang="ts">
import UiModal from './UiModal.vue'
import { useAlerts } from '@/composables/useAlerts'

const { isOpen, options, inputValue, isPrompt, respond } = useAlerts()
</script>

<template>
    <UiModal :open="isOpen" @close="respond(false)">
        <div class="body">
            <div v-if="options.icon" class="icon">
                <component :is="options.icon" />
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
            <button class="btn-cancel" @click="respond(false)">
                {{ options.cancelLabel ?? 'Cancel' }}
            </button>
            <button
                class="btn-confirm"
                :class="options.variant"
                :disabled="isPrompt && !inputValue.trim()"
                @click="respond(true)"
            >
                {{ options.confirmLabel ?? 'Confirm' }}
            </button>
        </div>
    </UiModal>
</template>

<style scoped>
.body {
    padding: var(--space-lg) var(--space-lg) var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    .icon {
        height: var(--size-md);
        aspect-ratio: 1/1;
        border-radius: var(--radius-sm);
        background: var(--color-hover);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: var(--space-xs);

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
    padding: var(--space-sm) var(--space-lg);
    border-top: 1px solid var(--color-border);

    button {
        padding: var(--space-xs) var(--space-md);
        border-radius: var(--radius-sm);
        font-size: var(--size-sm);
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        border: none;

        &:disabled { opacity: 0.35; cursor: not-allowed; }
    }

    .btn-cancel {
        background: transparent;
        color: inherit;
        opacity: 0.5;

        &:hover { opacity: 1; background: var(--color-hover); }
    }

    .btn-confirm {
        background: var(--color-foreground);
        color: var(--color-background);

        &:hover:not(:disabled) { opacity: 0.8; }
        &.danger { background: var(--color-danger); }
    }
}
</style>
