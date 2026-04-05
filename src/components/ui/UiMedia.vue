<script setup lang="ts">
import ItemsMedia from '@/components/ui/items/ItemsMedia.vue'

defineProps<{
  label?: string
}>()
</script>

<template>
  <div class="media">
    <label v-if="label">{{ label }}</label>
    <ItemsMedia />
    <ItemsMedia />
    <ItemsMedia />
  </div>
</template>

<style scoped>
.media {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);

  label {
    font-size: var(--size-sm);
    font-weight: 500;
  }
}
</style>
