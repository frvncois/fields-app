<script setup lang="ts">
defineProps<{
  options: { label: string; value: string }[]
}>()

const model = defineModel<string>()
</script>

<template>
  <div class="options">
    <div
      v-for="option in options"
      :key="option.value"
      class="option"
      @click="model = option.value"
    >
      <div class="radio" :class="{ selected: model === option.value }">
        <div v-if="model === option.value" class="dot" />
      </div>
      <span>{{ option.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.options {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);

  .option {
    display: inline-flex;
    align-items: center;
    gap: var(--gap-sm);
    cursor: pointer;
    user-select: none;

    span { font-size: var(--size-sm); }

    .radio {
      height: var(--size-base);
      aspect-ratio: 1/1;
      border-radius: var(--radius-full);
      border: 1px solid var(--color-border);
      background: var(--color-background);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: border-color 0.1s;

      &.selected { border-color: var(--color-foreground); }

      .dot {
        height: var(--space-sm);
        aspect-ratio: 1/1;
        border-radius: var(--radius-full);
        background: var(--color-foreground);
      }
    }
  }
}
</style>
