<script setup lang="ts">
import { computed } from 'vue'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/16/solid'
import UiFilters from '@/components/ui/UiFilters.vue'
import ItemTable from '@/components/ui/items/ItemTable.vue'
import { useSort } from '@/composables/useSort'
import { useFilters } from '@/composables/useFilters'

type Item = {
    id: number
    title: string
    slug: string
    type: string
    category: 'page' | 'collection' | 'object'
    status: 'draft' | 'published'
    updatedAt: string
    ogImage?: string
}

type SortKey = 'title' | 'type' | 'status' | 'updatedAt'

const props = defineProps<{ items: Item[]; canAdd?: boolean; initialType?: string }>()
const emit = defineEmits<{ add: []; deleted: [id: number] }>()

const { values } = useFilters([
    { key: 'search', type: 'search', placeholder: 'Search...' },
    { key: 'type', type: 'select', placeholder: 'All types', options: [] },
    { key: 'status', type: 'select', placeholder: 'All statuses', options: [] },
])

if (props.initialType) values.type = props.initialType

const typeOptions = computed(() => {
    const seen = new Set<string>()
    return props.items
        .map(i => i.type)
        .filter(t => { if (seen.has(t)) return false; seen.add(t); return true })
        .map(t => ({ label: t, value: t }))
})

const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
]

const filterDefs = computed(() => [
    { key: 'search', type: 'search' as const, placeholder: 'Search...' },
    { key: 'type', type: 'select' as const, placeholder: 'All types', options: typeOptions.value },
    { key: 'status', type: 'select' as const, placeholder: 'All statuses', options: statusOptions },
])

const { sortKey, sortDir, toggleSort, applySorting } = useSort<SortKey>()

const sortedItems = computed(() => {
    let result = [...props.items]

    if (values.search) {
        const q = values.search.toLowerCase()
        result = result.filter(i => i.title.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q))
    }

    if (values.type) {
        result = result.filter(i => i.type === values.type)
    }

    if (values.status) {
        result = result.filter(i => i.status === values.status)
    }

    return applySorting(result)
})

const columns: { label: string; key: SortKey }[] = [
    { label: 'Title', key: 'title' },
    { label: 'Type', key: 'type' },
    { label: 'Status', key: 'status' },
    { label: 'Last modified', key: 'updatedAt' },
]
</script>

<template>
    <div class="table">
        <UiFilters :defs="filterDefs" :values="values" />

        <div class="header">
            <button
                v-for="col in columns"
                :key="col.key"
                class="col"
                :class="{ active: sortKey === col.key }"
                @click="toggleSort(col.key)"
            >
                {{ col.label }}
                <ChevronUpIcon v-if="sortKey === col.key && sortDir === 'asc'" class="chevron" />
                <ChevronDownIcon v-else-if="sortKey === col.key && sortDir === 'desc'" class="chevron" />
                <ChevronUpIcon v-else class="chevron idle" />
            </button>
        </div>

        <div class="items">
            <ItemTable
                v-for="item in sortedItems"
                :key="item.slug"
                :id="item.id"
                :title="item.title"
                :slug="item.slug"
                :type="item.type"
                :category="item.category"
                :status="item.status"
                :updated-at="item.updatedAt"
                :og-image="item.ogImage"
                @deleted="emit('deleted', $event)"
            />
        </div>

    </div>
</template>

<style scoped>
.table {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);

    .header {
        display: grid;
        grid-template-columns: 8fr 3fr 3fr 3fr 1fr;
        padding: 0 var(--space-sm);

        .col {
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            padding: var(--space-sm) 0;
            font-size: var(--size-xs);
            text-transform: uppercase;
            letter-spacing: var(--letter-spacing);
            font-family: 'Geist Mono', monospace;
            background: none;
            border: none;
            cursor: pointer;
            color: inherit;
            transition: opacity 0.1s;

            &:hover, &.active { opacity: 1; }

            .chevron {
                height: var(--size-sm);
                aspect-ratio: 1/1;
                flex-shrink: 0;

                &.idle { opacity: 0; }
            }

            &:hover .chevron.idle { opacity: 0.5; }
            &:nth-child(n+2) { justify-content: flex-end; }
        }
    }

    .items {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
    }
}
</style>
