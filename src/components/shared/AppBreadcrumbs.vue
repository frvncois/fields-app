<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { ChevronRightIcon } from '@heroicons/vue/20/solid'
import { HomeIcon } from '@heroicons/vue/24/outline'
import { useEntry } from '@/composables/useEntries'
import { useAppSettings } from '@/composables/useAppSettings'
import { useCollections } from '@/composables/useCollections'

const route = useRoute()
const { currentEntry } = useEntry()
const { projectName } = useAppSettings()
const { all } = useCollections()

function findCollection(id: number) {
    return all.value.find(c => c.id === id)
}

type Crumb = { label: string; to?: RouteLocationRaw }

const crumbs = computed((): Crumb[] => {
    const root: Crumb = { label: projectName.value, to: { name: 'dashboard' } }

    if (route.name === 'editor' && currentEntry.value) {
        const entry = currentEntry.value
        const col = all.value.find(c => c.name === entry.collectionName)
        const sectionLabel = entry.category === 'page' ? 'Pages' : entry.type
        const collectionCrumb: Crumb = col
            ? { label: sectionLabel, to: { name: 'list', params: { id: col.id } } }
            : { label: sectionLabel }
        return [root, collectionCrumb, { label: entry.title }]
    }

    if (route.name === 'list') {
        const id = Number(route.params.id)
        const col = id ? findCollection(id) : null
        const sectionLabel = col?.type === 'page' ? 'Pages' : (col?.label ?? 'Content')
        return [root, { label: sectionLabel }]
    }

    return [root]
})
</script>

<template>
    <nav>
        <HomeIcon/>
        <template v-for="(crumb, i) in crumbs" :key="i">
            <ChevronRightIcon v-if="i > 0"/>
            <RouterLink v-if="crumb.to" :to="crumb.to">{{ crumb.label }}</RouterLink>
            <span v-else>{{ crumb.label }}</span>
        </template>
    </nav>
</template>

<style scoped>
nav {
    display: flex;
    align-items: center;
    gap: var(--space-md);

    svg {
        height: var(--size-sm);
        aspect-ratio: 1;
        flex-shrink: 0;
    }

    a, span {
        font-size: var(--size-xs);
        text-transform: uppercase;
        font-family: 'Geist mono';
        letter-spacing: 1px;
    }
}
</style>
