<script setup lang="ts">
defineProps<{ text: string }>()
</script>

<template>
    <div class="tooltip">
        <slot />
        <span>{{ text }}</span>
    </div>
</template>

<style scoped>
.tooltip {
    position: relative;
    display: inline-flex;

    span {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-foreground);
        color: var(--color-background);
        padding: var(--space-xs) var(--space-sm);
        border-radius: var(--radius-sm);
        font-size: var(--size-xs);
        font-family: inherit;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.1s;
        z-index: 300;
    }

    &:hover span { opacity: 1; }
}
</style>
