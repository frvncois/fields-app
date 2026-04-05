<script setup lang="ts">
defineProps<{
  label?: string
  placeholder?: string
  variant?: 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'large'
}>()

const model = defineModel<string>()
</script>

<template>
  <div class="textarea">
    <label v-if="label">{{ label }}</label>
    <textarea
      v-model="model"
      :placeholder="placeholder"
      :class="[`variant-${variant ?? 'outline'}`, `size-${size ?? 'default'}`]"
    />
  </div>
</template>

<style scoped>
.textarea {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);

  label {
    font-size: var(--size-sm);
    font-weight: 500;
  }

  textarea {
    outline: none;
    border-radius: var(--radius-sm);
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    color: var(--color-foreground);

    &.size-sm      { padding: var(--space-xs) var(--space-sm);  font-size: var(--size-sm); }
    &.size-default { padding: var(--space-sm) var(--space-md); font-size: var(--size-sm); }
    &.size-large   { padding: var(--space-md) var(--space-md); font-size: var(--size-base); }

    &.variant-outline { border: 1px solid var(--color-border); background: var(--color-background); }
    &.variant-ghost   { border: 1px solid transparent; background: transparent; }
  }
}
</style>
