<script setup lang="ts">
import { useStorage } from '@/composables/useStorage'

const model = defineModel<string>({ default: '' })

defineProps<{
    label?: string
}>()

const { open } = useStorage()
</script>

<template>
    <div class="media">
        <label v-if="label">{{ label }}</label>
        <div class="preview" v-if="model">
            <img :src="model" alt="" />
            <button class="clear" @click="model = ''">Remove</button>
        </div>
        <button class="pick" @click="open()">
            Choose from media library
        </button>
    </div>
</template>

<style scoped>
.media {
    display: flex;
    flex-direction: column;
    gap: var(--gap-sm);

    label {
        font-size: var(--size-sm);
        font-weight: 500;
    }

    .preview {
        position: relative;
        img {
            width: 100%;
            max-height: 200px;
            object-fit: cover;
            border-radius: var(--radius-md);
            border: 1px solid var(--color-border);
        }
        .clear {
            position: absolute;
            top: var(--space-sm);
            right: var(--space-sm);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            font-size: var(--size-xs);
            padding: var(--space-xs) var(--space-sm);
            cursor: pointer;
            font-family: inherit;
            &:hover { background: var(--color-danger-bg); color: var(--color-danger); }
        }
    }

    .pick {
        background: none;
        border: 1px dashed var(--color-border);
        border-radius: var(--radius-sm);
        font-size: var(--size-sm);
        font-family: inherit;
        cursor: pointer;
        color: inherit;
        padding: var(--space-sm) var(--space-md);
        opacity: 0.6;
        width: 100%;
        text-align: center;
        &:hover { opacity: 1; background: var(--color-hover); }
    }
}
</style>
