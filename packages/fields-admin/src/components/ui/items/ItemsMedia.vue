<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/20/solid'
</script>

<template>
  <div class="item">
    <div class="preview" />
    <div class="info">
      <span class="title">image-hero.png</span>
      <span class="meta">PNG · 1920×1080 · 284 KB</span>
    </div>
    <button class="remove">
      <TrashIcon />
    </button>
  </div>
</template>

<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  border: 1px solid var(--color-border);

  .preview {
    height: var(--size-lg);
    aspect-ratio: 1/1;
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    flex-shrink: 0;
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    flex: 1;
    min-width: 0;

    .title {
      font-size: var(--size-sm);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta {
      font-size: var(--size-sm);
      color: var(--color-secondary);
    }
  }

  .remove {
    display: flex;
    align-items: center;
    justify-content: center;
    height: var(--size-md);
    aspect-ratio: 1/1;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-secondary);
    flex-shrink: 0;

    &:hover {
      background: var(--color-danger-bg);
      color: var(--color-danger);
    }

    svg {
      height: var(--size-sm);
      aspect-ratio: 1/1;
    }
  }
}
</style>
