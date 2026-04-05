<script setup lang="ts">
import type { Component } from 'vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { EllipsisHorizontalIcon } from '@heroicons/vue/20/solid'

export type ComboboxItem = {
    icon?: Component
    label: string
    action: () => void
    variant?: 'default' | 'danger'
}

defineProps<{ items: ComboboxItem[] }>()

const open = ref(false)
const wrapperEl = ref<HTMLElement | null>(null)

function onOutsideClick(e: MouseEvent) {
    if (wrapperEl.value && !wrapperEl.value.contains(e.target as Node)) {
        open.value = false
    }
}

onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick))

function toggle(e: MouseEvent) {
    e.stopPropagation()
    open.value = !open.value
}

function run(item: ComboboxItem, e: MouseEvent) {
    e.stopPropagation()
    open.value = false
    item.action()
}
</script>

<template>
    <div ref="wrapperEl" class="combobox">
        <button class="trigger" @click="toggle">
            <EllipsisHorizontalIcon />
        </button>

        <Transition name="dropdown">
            <div v-if="open" class="dropdown">
                <button
                    v-for="item in items"
                    :key="item.label"
                    class="item"
                    :class="item.variant"
                    @click="run(item, $event)"
                >
                    <component :is="item.icon" v-if="item.icon" class="item-icon" />
                    {{ item.label }}
                </button>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.combobox {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    .trigger {
        height: var(--size-md);
        aspect-ratio: 1/1;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        border-radius: var(--radius-sm);
        cursor: pointer;
        opacity: 0.4;
        transition: opacity 0.1s, background 0.1s;

        &:hover {
            opacity: 1;
            background: var(--color-border);
        }

        svg {
            height: var(--size-base);
            aspect-ratio: 1/1;
        }
    }

    .dropdown {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        min-width: 160px;
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-md);
        padding: var(--space-xs);
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);

        .item {
            display: flex;
            align-items: center;
            gap: var(--gap-sm);
            padding: var(--space-sm) var(--space-sm);
            border: none;
            background: transparent;
            border-radius: var(--radius-sm);
            font-size: var(--size-sm);
            font-family: inherit;
            cursor: pointer;
            text-align: left;
            color: inherit;
            width: 100%;
            transition: background 0.1s;

            &:hover { background: var(--color-hover); }

            &.danger {
                color: var(--color-danger);
                &:hover { background: var(--color-danger-bg); }
            }

            svg {
                height: var(--size-sm);
                aspect-ratio: 1/1;
                flex-shrink: 0;
                opacity: 0.6;
            }
        }
    }
}

.dropdown-enter-active,
.dropdown-leave-active {
    transition: opacity 0.1s, transform 0.1s;
}
.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
