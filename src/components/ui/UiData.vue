<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
    icon?: Component
    title: string
    value: string
}>()
</script>

<template>
    <div class="data">
        <div class="label">
            <component :is="icon" v-if="icon" />
            <span class="title">{{ title }}</span>
        </div>
        <span class="value">{{ value }}</span>
    </div>
</template>

<style scoped>
.data {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap-sm);
    font-size: var(--size-sm);

    .label {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        color: inherit;

        svg {
            height: 1em;
            aspect-ratio: 1/1;
            flex-shrink: 0;
            opacity: 0.4;
        }

        .title { font-weight: 500; }
    }

    .value { opacity: 0.4; }
}
</style>
