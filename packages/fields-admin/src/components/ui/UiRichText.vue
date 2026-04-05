<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { BoldIcon, ItalicIcon, ListBulletIcon, NumberedListIcon } from '@heroicons/vue/20/solid'

defineProps<{
  label?: string
  placeholder?: string
  variant?: 'outline' | 'ghost'
}>()

const model = defineModel<string>()

const editor = useEditor({
  content: model.value,
  extensions: [StarterKit],
  onUpdate: ({ editor }) => {
    model.value = editor.getHTML()
  },
})
</script>

<template>
  <div class="richtext">
    <label v-if="label">{{ label }}</label>
    <div :class="['content', `variant-${variant ?? 'outline'}`]">
      <div class="toolbar" v-if="editor">
        <button @click="editor.chain().focus().toggleBold().run()" :class="{ active: editor.isActive('bold') }">
          <BoldIcon />
        </button>
        <button @click="editor.chain().focus().toggleItalic().run()" :class="{ active: editor.isActive('italic') }">
          <ItalicIcon />
        </button>
        <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ active: editor.isActive('bulletList') }">
          <ListBulletIcon />
        </button>
        <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ active: editor.isActive('orderedList') }">
          <NumberedListIcon />
        </button>
      </div>
      <EditorContent :editor="editor" class="editor-content" />
    </div>
  </div>
</template>

<style scoped>
.richtext {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);

  label {
    font-size: var(--size-sm);
    font-weight: 500;
  }

  .content {
    border-radius: var(--radius-lg);
    overflow: hidden;

    &.variant-outline { background: var(--color-background); }
    &.variant-ghost   { background: transparent; }

    .toolbar {
      display: flex;
      gap: var(--space-xs);
      padding: var(--space-sm);
      border-bottom: 1px solid var(--color-border);

      button {
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

        &:hover, &.active { background: var(--color-surface); color: var(--color-foreground); }

        :deep(svg) {
          height: var(--size-sm);
          aspect-ratio: 1/1;
        }
      }
    }

    .editor-content {
      padding: var(--space-sm) var(--space-md);
      font-size: var(--size-sm);
      min-height: 520px;

      :deep(.tiptap) { outline: none; }
      :deep(p) { margin: 0 0 0.5em; }
      :deep(ul), :deep(ol) { padding-left: 1.25em; margin: 0.25em 0; }
    }
  }
}
</style>
