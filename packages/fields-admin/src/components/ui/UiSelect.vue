<script setup lang="ts">
defineProps<{
  options: { label: string; value: string }[]
  placeholder?: string
  variant?: 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'large'
}>()

const model = defineModel<string>()
</script>

<template>
  <select
    v-model="model"
    :class="[`variant-${variant ?? 'outline'}`, `size-${size ?? 'default'}`]"
  >
    <option v-if="placeholder" value="">{{ placeholder }}</option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>

<style scoped>
select {
  outline: none;
  border-radius: var(--radius-sm);
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
  padding-right: var(--space-lg);
  color: var(--color-foreground);

  &.size-sm      { padding: var(--space-xs) var(--space-lg) var(--space-xs) var(--space-sm);   font-size: var(--size-sm); }
  &.size-default { padding: var(--space-sm) var(--space-lg) var(--space-sm) var(--space-md);  font-size: var(--size-sm); }
  &.size-large   { padding: var(--space-md) var(--space-lg) var(--space-md) var(--space-md); font-size: var(--size-base); }

  &.variant-outline { border: 1px solid var(--color-border); background-color: var(--color-background); }
  &.variant-ghost   { border: 1px solid transparent; background-color: transparent; }
}
</style>
