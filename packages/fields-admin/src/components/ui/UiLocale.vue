<script setup lang="ts">
defineProps<{
    label: string
    current?: boolean
}>()

const emit = defineEmits<{
    select: []
}>()
</script>

<template>
    <div class="locale" :class="{ current }" @click="!current && emit('select')">
        <span class="label">{{ label }}</span>
        <span class="action">{{ current ? 'Current' : 'Edit →' }}</span>
    </div>
</template>

<style scoped>
.locale {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    font-size: var(--size-sm);
    cursor: default;

    &:not(.current) {
        cursor: pointer;
        &:hover { background: var(--color-hover); .action { opacity: 1; } }
    }

    &.current .label { opacity: 0.35; }

    .label { font-weight: 500; }

    .action {
        opacity: 0.35;
        transition: opacity 0.1s;
    }
}
</style>
