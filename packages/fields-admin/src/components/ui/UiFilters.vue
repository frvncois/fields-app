<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/16/solid'
import type { FilterDef } from '@/composables/useFilters'
import UiInput from '@/components/ui/UiInput.vue'
import UiCombobox from '@/components/ui/UiCombobox.vue'
import type { ComboboxItem } from '@/components/ui/UiCombobox.vue'

const props = defineProps<{
    defs: FilterDef[]
    values: Record<string, string>
}>()

function getLabel(def: FilterDef): string {
    if (def.type !== 'select') return ''
    const match = def.options?.find(o => o.value === props.values[def.key])
    return match?.label ?? def.placeholder ?? 'All'
}

function getItems(def: FilterDef): ComboboxItem[] {
    if (def.type !== 'select' || !def.options) return []
    const items: ComboboxItem[] = []
    if (props.values[def.key]) {
        items.push({ label: def.placeholder ?? 'All', action: () => { props.values[def.key] = '' } })
    }
    for (const opt of def.options) {
        items.push({ label: opt.label, action: () => { props.values[def.key] = opt.value } })
    }
    return items
}
</script>

<template>
    <div class="filters">
        <template v-for="def in defs" :key="def.key">
            <div v-if="def.type === 'search'" class="search">
                <UiInput
                    v-model="values[def.key]"
                    :placeholder="def.placeholder ?? 'Search...'"
                    :icon="MagnifyingGlassIcon"
                />
            </div>
            <div v-else-if="def.type === 'select' && (def.options?.length ?? 0) > 1" class="select">
                <UiCombobox
                    :label="getLabel(def)"
                    :items="getItems(def)"
                />
            </div>
        </template>
    </div>
</template>

<style scoped>
.filters {
    display: flex;
    align-items: center;
    gap: var(--gap-sm);
    .search { flex: 1; min-width: 0; }
    .select  { flex: 0 0 auto; min-width: 0; }
}
</style>
