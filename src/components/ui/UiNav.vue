<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterLink } from 'vue-router'

type ItemChild = {
    title: string
    to?: RouteLocationRaw
    action?: () => void
}

const props = defineProps<{
    title: string
    icon?: Component
    to?: RouteLocationRaw
    action?: () => void
    children?: ItemChild[]
    active?: boolean
}>()

const route = useRoute()
const open = ref(false)

const hasChildren = () => props.children && props.children.length > 0

const isActive = computed(() => {
    if (props.active !== undefined) return props.active
    if (props.children) {
        return props.children.some(c => {
            if (!c.to || typeof c.to !== 'object') return false
            const target = c.to as { name?: string; params?: Record<string, unknown> }
            if (!target.name || target.name !== route.name) return false
            if (!target.params) return true
            return Object.keys(target.params).every(
                k => String(route.params[k] ?? '') === String((target.params as Record<string, unknown>)[k] ?? '')
            )
        })
    }
    return false
})

function onItemClick() {
    if (props.action) props.action()
    else if (hasChildren()) open.value = !open.value
}

function onChildClick(child: ItemChild) {
    if (child.action) child.action()
}
</script>

<template>
    <RouterLink v-if="to" :to="to" class="item" exact-active-class="active">
        <div class="row">
            <component :is="icon" v-if="icon" class="icon" />
            <span class="title">{{ title }}</span>
        </div>
    </RouterLink>

    <div v-else class="item" :class="{ active: isActive }" @click="onItemClick">
        <div class="row">
            <component :is="icon" v-if="icon" class="icon" />
            <span class="title">{{ title }}</span>
            <button v-if="hasChildren()" class="toggle" @click.stop="open = !open">
                +
            </button>
        </div>

        <ul v-if="hasChildren() && open" class="children">
            <li v-for="child in children" :key="child.title">
                <RouterLink v-if="child.to" :to="child.to" class="child" exact-active-class="active">
                    <span>{{ child.title }}</span>
                </RouterLink>
                <span v-else class="child" @click="onChildClick(child)">
                    <span>{{ child.title }}</span>
                </span>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-base);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-var);
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    text-decoration: none;
    color: inherit;

    &:hover {
        background: var(--color-hover);
        border-color: var(--color-border);
    }

    .row {
        display: flex;
        align-items: center;
        gap: var(--gap-md);
        user-select: none;

        .icon {
            height: var(--size-sm);
            aspect-ratio: 1;
            flex-shrink: 0;
            opacity: 0.5;
            transition: opacity 0.1s;
        }

        .title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: var(--size-sm);
            opacity: 0.33;
            transition: opacity 0.1s;
        }

        .toggle {
            flex-shrink: 0;
            height: var(--size-base);
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-sm);
            border: none;
            background: transparent;
            font-size: var(--size-sm);
            line-height: 1;
            cursor: pointer;
            color: inherit;
            opacity: 0.3;

            &:hover {
                background: var(--color-border);
                opacity: 1;
            }
        }
    }

    &:hover .icon,
    &.active .icon { opacity: 1; }

    &:hover .title,
    &.active .title { opacity: 1; }

    .children {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        padding-left: var(--space-lg);

        li {
            border-radius: var(--radius-sm);

            .child {
                display: flex;
                align-items: center;
                gap: var(--gap-sm);
                padding: var(--space-xs) var(--space-sm);
                font-size: var(--size-sm);
                cursor: pointer;
                text-decoration: none;
                color: inherit;
                border-radius: var(--radius-sm);

                &:hover { background: var(--color-hover); }

                &.active {
                    background: var(--color-hover);

                    .dot { opacity: 1; }
                    span { opacity: 1; }
                }

                .dot {
                    width: var(--space-sm);
                    height: var(--space-sm);
                    border-radius: var(--radius-full);
                    background: currentColor;
                    flex-shrink: 0;
                    opacity: 0.3;
                }

                span { opacity: 0.5; }
            }
        }
    }
}
</style>
