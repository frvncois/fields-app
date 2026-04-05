<script setup lang="ts">
import type { Component } from 'vue'
import UiTooltip from './UiTooltip.vue'

defineProps<{
  text?: string
  icon?: Component
  variant?: 'default' | 'ghost' | 'outline' | 'danger'
  size?: 'default' | 'sm' | 'icon'
  type?: 'button' | 'submit' | 'reset'
  tooltip?: string
  action?: () => void
  disabled?: boolean
  dim?: boolean
  block?: boolean
}>()
</script>

<template>
  <UiTooltip v-if="tooltip" :text="tooltip">
    <button
      :type="type ?? 'button'"
      :class="['ui-button', `variant-${variant ?? 'default'}`, `size-${size ?? 'default'}`, { dim, block }]"
      :disabled="disabled"
      @click="action"
    >
      <component :is="icon" v-if="icon" class="ui-button-icon" />
      <span v-if="text">{{ text }}</span>
    </button>
  </UiTooltip>
  <button
    v-else
    :type="type ?? 'button'"
    :class="[`variant-${variant ?? 'default'}`, `size-${size ?? 'default'}`, { dim, block }]"
    :disabled="disabled"
    @click="action"
  >
    <component :is="icon" v-if="icon" class="ui-button-icon" />
    <span v-if="text">{{ text }}</span>
  </button>
</template>

<style scoped>
button {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-sm);
  cursor: pointer;
  border-radius: var(--radius-md);
  font-family: inherit;
  border: 1px solid transparent;

  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &.dim { opacity: 0.45; }
  &.dim:hover { opacity: 1; }
  &.block { width: 100%; justify-content: center; }

  &.size-default { padding: var(--space-sm) var(--space-md); font-size: var(--size-sm); }
  &.size-sm      { padding: var(--space-sm) var(--space-md); font-size: var(--size-sm); }
  &.size-icon    { padding: var(--space-xs); font-size: var(--size-sm); aspect-ratio: 1; justify-content: center; }

  .ui-button-icon { height: 1em; aspect-ratio: 1/1; flex-shrink: 0; }

  &.variant-default { background: var(--color-foreground); color: var(--color-background); }
  &.variant-default:hover:not(:disabled) { opacity: 0.85; }

  &.variant-ghost { background: transparent; color: inherit; }
  &.variant-ghost:hover:not(:disabled) { background: var(--color-hover); }

  &.variant-outline { background: transparent; color: inherit; border-color: var(--color-border); }
  &.variant-outline:hover:not(:disabled) { background: var(--color-hover-subtle); }

  &.variant-danger { background: var(--color-danger); color: #fff; }
  &.variant-danger:hover:not(:disabled) { opacity: 0.85; }
}
</style>
