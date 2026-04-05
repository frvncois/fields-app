<script setup lang="ts">
const model = defineModel<boolean>()
</script>

<template>
  <div class="track" :class="{ on: model }" @click="model = !model">
    <div class="thumb" />
  </div>
</template>

<style scoped>
.track {
  --thumb: 16px;
  --gap: 2px;
  width: calc(var(--thumb) * 2 + var(--gap) * 2);
  height: calc(var(--thumb) + var(--gap) * 2);
  border-radius: var(--radius-full);
  background: var(--color-border);
  position: relative;
  transition: background 0.15s;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;

  &.on { background: var(--color-foreground); }

  .thumb {
    position: absolute;
    top: var(--gap);
    left: var(--gap);
    width: var(--thumb);
    height: var(--thumb);
    border-radius: var(--radius-full);
    background: var(--color-background);
    transition: transform 0.15s;
  }

  &.on .thumb { transform: translateX(var(--thumb)); }
}
</style>
