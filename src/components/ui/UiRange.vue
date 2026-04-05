<script setup lang="ts">
defineProps<{
    label?: string
    min?: number
    max?: number
    step?: number
    unit?: string
}>()

const model = defineModel<number>()
</script>

<template>
    <div class="range">
        <div v-if="label" class="header">
            <span class="label">{{ label }}</span>
            <span class="value">{{ model }}{{ unit }}</span>
        </div>
        <input
            v-model.number="model"
            type="range"
            :min="min ?? 0"
            :max="max ?? 100"
            :step="step ?? 1"
        />
    </div>
</template>

<style scoped>
.range {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .label {
            font-size: var(--size-sm);
            font-weight: 500;
        }

        .value {
            font-size: var(--size-xs);
            opacity: 0.4;
            font-family: 'Geist Mono Variable', monospace;
        }
    }

    input {
        width: 100%;
        accent-color: var(--color-foreground);
    }
}
</style>
