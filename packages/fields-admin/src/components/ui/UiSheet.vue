<script setup lang="ts">
import type { Component } from 'vue'
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{
    title: string
    description?: string
    icon?: Component
    width?: string
}>()

const open = defineModel<boolean>({ default: false })
const sheetEl = ref<HTMLElement | null>(null)
const route = useRoute()

watch(() => route.fullPath, () => { open.value = false })

function onOutsideInteraction(e: Event) {
    const target = e.target as Element
    if (target.closest('[data-overlay]')) return
    if (open.value && sheetEl.value && !sheetEl.value.contains(target)) {
        open.value = false
    }
}

onMounted(() => {
    document.addEventListener('focusin', onOutsideInteraction)
    document.addEventListener('mousedown', onOutsideInteraction)
})

onUnmounted(() => {
    document.removeEventListener('focusin', onOutsideInteraction)
    document.removeEventListener('mousedown', onOutsideInteraction)
})
</script>

<template>
    <Teleport to="body">
        <Transition name="sheet">
            <div v-if="open" ref="sheetEl" class="sheet" :style="width ? { width } : {}">
                <div class="header">
                    <div class="heading">
                        <component :is="icon" v-if="icon" />
                        <div>
                            <h2>{{ title }}</h2>
                            <p v-if="description">{{ description }}</p>
                        </div>
                    </div>
                    <button class="close" @click="open = false">✕</button>
                </div>
                <div class="body" data-lenis-prevent>
                    <slot />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.sheet {
    position: fixed;
    top: 0;
    left: var(--nav-width);
    height: 100vh;
    width: 400px;
    background: var(--color-background);
    border-right: 1px solid var(--color-border);
    z-index: 50;
    display: flex;
    flex-direction: column;

    .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: var(--space-lg);
        border-bottom: 1px solid var(--color-border);

        .heading {
            display: flex;
            align-items: flex-start;
            gap: var(--gap-md);

            svg {
                height: var(--size-base);
                aspect-ratio: 1/1;
                margin-top: var(--space-xs);
                flex-shrink: 0;
                opacity: 0.5;
            }

            h2 {
                font-size: var(--size-base);
                font-weight: 600;
                margin: 0;
            }

            p {
                font-size: var(--size-sm);
                opacity: 0.4;
                margin: var(--space-xs) 0 0;
            }
        }

        .close {
            background: none;
            border: none;
            cursor: pointer;
            font-size: var(--size-sm);
            opacity: 0.35;
            padding: var(--space-xs);
            line-height: 1;

            &:hover { opacity: 1; }
        }
    }

    .body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: var(--space-lg);
        display: flex;
        flex-direction: column;
        gap: var(--gap-lg);
    }
}

.sheet-enter-active,
.sheet-leave-active { transition: transform 0.25s ease; }
.sheet-enter-from,
.sheet-leave-to { transform: translateX(-100%); }
</style>
