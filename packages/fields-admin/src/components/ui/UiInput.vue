<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label?: string
  placeholder?: string
  type?: string
  variant?: 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  icon?: Component
}>()

const model = defineModel<string>()
</script>

<template>
  <div class="input">
    <label v-if="label">{{ label }}</label>
    <div class="field" :class="{ 'icon': icon }">
      <component :is="icon" v-if="icon"/>
      <input
        v-model="model"
        :type="type ?? 'text'"
        :placeholder="placeholder"
        :class="['input', `variant-${variant ?? 'outline'}`, `size-${size ?? 'default'}`]"
      />
    </div>
  </div>
</template>

<style scoped>
.input {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  label {
    font-size: var(--size-sm);
    font-weight: 500;
  }

  .field {
    position: relative;
    display: flex;
    align-items: center;

    svg {
      position: absolute;
      left: var(--space-md);
      height: var(--size-sm);
      aspect-ratio: 1/1;
      pointer-events: none;
      flex-shrink: 0;
    }

    input {
      outline: none;
      border-radius: var(--radius-md);
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
      color: var(--color-foreground);

      &.size-sm      { padding: var(--space-xs) var(--space-sm);  font-size: var(--size-sm); }
      &.size-default { padding: var(--space-sm) var(--space-md); font-size: var(--size-sm); }
      &.size-lg      { padding: var(--space-md) var(--space-md); font-size: var(--size-base); }

      &.variant-outline { border: 1px solid var(--color-border); background: var(--color-background); }
      &.variant-ghost   { border: 1px solid transparent; background: transparent; }
    }

    &.icon input { padding-left: var(--space-xl); }
  }
}
</style>
