<script setup lang="ts">
import { onMounted } from 'vue'
import UiTable from '@/components/ui/UiTable.vue'
import { useEntries } from '@/composables/useEntries'

const { entries, fetchAll, remove } = useEntries()
onMounted(fetchAll)
</script>

<template>
    <div class="content">
        <UiTable :items="entries" @deleted="remove($event)" />
    </div>
</template>

<style scoped>
.content {
    display: flex;
    flex-direction: column;
    gap: var(--gap-md);
    padding: var(--space-xl);
    width: var(--content-width);
    margin: 0 auto;
}
</style>
