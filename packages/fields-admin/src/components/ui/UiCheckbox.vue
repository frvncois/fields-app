<script setup lang="ts">
const model = defineModel<boolean>()
</script>

<template>
  <div class="box" :class="{ checked: model }" @click="model = !model">
    <svg v-if="model" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
</template>

<style scoped>
.box {
  height: var(--size-base);
  aspect-ratio: 1/1;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s, border-color 0.1s;
}

.box.checked {
  background: var(--color-foreground);
  border-color: var(--color-foreground);
  color: var(--color-background);
}

.box svg { height: var(--size-xs); aspect-ratio: 1/1; }
</style>
