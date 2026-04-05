<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/16/solid'
import type { FilterDef } from '@/composables/useFilters'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

defineProps<{
    defs: FilterDef[]
    values: Record<string, string>
}>()
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
            <div v-else-if="def.type === 'select'" class="select">
                <UiSelect
                    v-model="values[def.key]"
                    :options="def.options"
                    :placeholder="def.placeholder"
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
    margin-bottom: var(--space-xl);

    .search { flex: 1; min-width: 0; }
    .select  { flex: 0 0 15%; min-width: 0; }
}
</style>
