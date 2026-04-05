<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { relativeTime } from '@/utils/time'

const props = defineProps<{
    icon?: Component
    title: string
    value: string
}>()

const display = computed(() => {
    if (/^\d{4}-\d{2}-\d{2}T/.test(props.value)) {
        return relativeTime(props.value)
    }
    return props.value
})
</script>

<template>
    <div class="data">
        <div class="label">
            <component :is="icon" v-if="icon" />
            <span class="title">{{ title }}</span>
        </div>
        <span class="value">{{ display }}</span>
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
