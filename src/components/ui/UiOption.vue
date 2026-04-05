<script setup lang="ts">
import type { Component } from 'vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  label: string
  description?: string
  type: Component
  variant?: 'editor' | 'sidebar'
}>()
</script>

<template>
  <div :class="['option', `variant-${variant ?? 'editor'}`]">
    <div class="text">
      <span class="label">{{ label }}</span>
      <span v-if="description" class="description">{{ description }}</span>
    </div>
    <component :is="type" v-bind="$attrs" />
  </div>
</template>

<style scoped>
.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-md);
  background: var(--color-surface);
  border-radius: var(--radius-lg);

  &.variant-editor  { padding: var(--space-md) var(--space-lg); }
  &.variant-sidebar { padding: var(--space-sm) var(--space-md); align-items: flex-start; }

  .text {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    .label {
      font-size: var(--size-sm);
      font-weight: 500;
    }

    .description {
      font-size: var(--size-sm);
      color: var(--color-secondary);
    }
  }
}
</style>
