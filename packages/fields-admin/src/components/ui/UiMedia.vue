<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { useStorage } from '@/composables/useStorage'

const model = defineModel<string>({ default: '' })

defineProps<{
    label?: string
}>()

const { pick } = useStorage()

async function pickFromLibrary() {
    const url = await pick()
    if (url) model.value = url
}
</script>

<template>
    <div class="media">
        <label v-if="label">{{ label }}</label>
        <div class="preview" v-if="model">
            <img :src="model" alt="" />
            <UiButton class="clear" :icon="TrashIcon" size="icon" variant="ghost" @click="model = ''" />
        </div>
        <UiButton v-if="!model" text="Choose from media library" variant="outline" block @click="pickFromLibrary" />
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
            &:hover { color: var(--color-danger); }
        }
    }

}
</style>
